import { NextResponse } from "next/server";

/**
 * MCP Streamable HTTP Server for Routines
 *
 * Each agent gets its own MCP endpoint at /api/mcp/[agentId].
 * The endpoint dynamically serves tools based on which routines
 * are connected to that agent in the local DB.
 *
 * Implements JSON-RPC 2.0 over HTTP (MCP Streamable HTTP transport).
 * Handles: initialize, tools/list, tools/call
 */

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface AgentRoutine {
  id: number;
  agent_id: string;
  routine_id: number;
  routine_name: string;
  routine_api_id: string;
  routine_token: string;
  routine_description: string | null;
  tool_name: string;
}

async function getAgentRoutines(agentId: string): Promise<AgentRoutine[]> {
  try {
    const { getDb } = await import("@/lib/db");
    const db = getDb();

    // Ensure table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_routines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        routine_id INTEGER NOT NULL,
        tool_name TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(agent_id, routine_id)
      )
    `);

    // Join with routines table to get full info
    return db
      .prepare(
        `SELECT ar.id, ar.agent_id, ar.routine_id, ar.tool_name,
                r.name as routine_name, r.routine_id as routine_api_id,
                r.token as routine_token, r.description as routine_description
         FROM agent_routines ar
         JOIN routines r ON ar.routine_id = r.id
         WHERE ar.agent_id = ?`
      )
      .all(agentId) as AgentRoutine[];
  } catch {
    return [];
  }
}

function buildToolName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 64);
}

function buildTools(routines: AgentRoutine[]) {
  return routines.map((r) => ({
    name: r.tool_name || `fire_${buildToolName(r.routine_name)}`,
    description: r.routine_description
      ? `Fire routine: ${r.routine_name}. ${r.routine_description}`
      : `Fire the "${r.routine_name}" routine. Triggers it via the Anthropic API and returns a session URL.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        context: {
          type: "string",
          description:
            "Optional context or instructions to pass to the routine when firing it.",
        },
      },
      required: [] as string[],
    },
  }));
}

async function fireRoutine(
  routine: AgentRoutine,
  context?: string
): Promise<{ sessionUrl?: string; sessionId?: string; error?: string }> {
  try {
    const res = await fetch(
      `https://api.anthropic.com/v1/claude_code/routines/${routine.routine_api_id}/fire`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${routine.routine_token}`,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "experimental-cc-routine-2026-04-01",
        },
        body: JSON.stringify({
          ...(context && { context }),
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return { error: `Routine fire failed (${res.status}): ${errText}` };
    }

    const data = await res.json();
    return {
      sessionUrl: data.session_url || data.url,
      sessionId: data.session_id || data.id,
    };
  } catch (err) {
    return {
      error: `Network error: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  let body: JsonRpcRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" } },
      { status: 400 }
    );
  }

  const { method, id, params: rpcParams } = body;

  // Handle initialize
  if (method === "initialize") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: {
          name: "stride-routines",
          version: "1.0.0",
        },
      },
    });
  }

  // Handle notifications (no response needed)
  if (method === "notifications/initialized") {
    return new Response(null, { status: 204 });
  }

  // Handle tools/list
  if (method === "tools/list") {
    const routines = await getAgentRoutines(agentId);
    const tools = buildTools(routines);
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: { tools },
    });
  }

  // Handle tools/call
  if (method === "tools/call") {
    const toolName = (rpcParams as any)?.name as string;
    const args = (rpcParams as any)?.arguments as Record<string, unknown>;

    if (!toolName) {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: "Tool name is required" },
      });
    }

    const routines = await getAgentRoutines(agentId);
    const routine = routines.find(
      (r) =>
        r.tool_name === toolName ||
        `fire_${buildToolName(r.routine_name)}` === toolName
    );

    if (!routine) {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: `Unknown tool: ${toolName}` },
      });
    }

    const result = await fireRoutine(routine, args?.context as string);

    // Log the run
    try {
      const { logRoutineRun, updateRoutineLastFired } = await import(
        "@/lib/db"
      );
      logRoutineRun({
        routine_id: routine.routine_id,
        routine_name: routine.routine_name,
        status: result.error ? "error" : "success",
        session_id: result.sessionId,
        session_url: result.sessionUrl,
        error: result.error,
      });
      if (!result.error) {
        updateRoutineLastFired(
          routine.routine_id,
          new Date().toISOString(),
          result.sessionUrl || ""
        );
      }
    } catch {
      // best effort
    }

    if (result.error) {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: `Error: ${result.error}` }],
          isError: true,
        },
      });
    }

    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {
        content: [
          {
            type: "text",
            text: `Routine "${routine.routine_name}" fired successfully.\nSession URL: ${result.sessionUrl || "N/A"}\nSession ID: ${result.sessionId || "N/A"}`,
          },
        ],
      },
    });
  }

  // Unknown method
  return NextResponse.json({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  });
}

// GET for health check / info
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const routines = await getAgentRoutines(agentId);

  return NextResponse.json({
    name: "stride-routines",
    version: "1.0.0",
    transport: "streamable-http",
    agent_id: agentId,
    tools_count: routines.length,
    tools: buildTools(routines).map((t) => t.name),
  });
}
