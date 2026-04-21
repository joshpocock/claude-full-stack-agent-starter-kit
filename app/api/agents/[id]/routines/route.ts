import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";

/**
 * GET /api/agents/:id/routines
 * List routines connected to this agent.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { getDb } = await import("@/lib/db");
    const db = getDb();

    ensureTable(db);

    const rows = db
      .prepare(
        `SELECT ar.id, ar.routine_id, ar.tool_name, ar.created_at,
                r.name as routine_name, r.routine_id as routine_api_id,
                r.description as routine_description, r.trigger_type
         FROM agent_routines ar
         JOIN routines r ON ar.routine_id = r.id
         WHERE ar.agent_id = ?
         ORDER BY ar.created_at DESC`
      )
      .all(id);

    return NextResponse.json(rows);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get agent routines";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/agents/:id/routines
 * Connect a routine to this agent. Auto-configures the MCP server on the agent.
 * Body: { routine_id: number }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const { routine_id } = await request.json();

    if (!routine_id) {
      return NextResponse.json(
        { error: "routine_id is required" },
        { status: 400 }
      );
    }

    const { getDb } = await import("@/lib/db");
    const db = getDb();
    ensureTable(db);

    // Get routine info
    const routine = db
      .prepare("SELECT * FROM routines WHERE id = ?")
      .get(routine_id) as
      | { id: number; name: string; routine_id: string; description: string | null }
      | undefined;

    if (!routine) {
      return NextResponse.json(
        { error: "Routine not found" },
        { status: 404 }
      );
    }

    // Build tool name
    const toolName = `fire_${routine.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .substring(0, 58)}`;

    // Insert connection (ignore if already exists)
    db.prepare(
      `INSERT OR IGNORE INTO agent_routines (agent_id, routine_id, tool_name)
       VALUES (?, ?, ?)`
    ).run(agentId, routine_id, toolName);

    // Auto-configure MCP server on the agent
    await syncMcpServer(agentId, db);

    return NextResponse.json({ ok: true, tool_name: toolName });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to connect routine";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/agents/:id/routines
 * Disconnect a routine from this agent.
 * Body: { routine_id: number }
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const { routine_id } = await request.json();

    if (!routine_id) {
      return NextResponse.json(
        { error: "routine_id is required" },
        { status: 400 }
      );
    }

    const { getDb } = await import("@/lib/db");
    const db = getDb();
    ensureTable(db);

    db.prepare(
      "DELETE FROM agent_routines WHERE agent_id = ? AND routine_id = ?"
    ).run(agentId, routine_id);

    // Check if agent still has routines - if not, remove MCP server
    await syncMcpServer(agentId, db);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to disconnect routine";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function ensureTable(db: any) {
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
}

const ROUTINE_BLOCK_START = "<!-- STRIDE_ROUTINES_START -->";
const ROUTINE_BLOCK_END = "<!-- STRIDE_ROUTINES_END -->";

/**
 * Sync the agent when routines change:
 * 1. Configure the MCP server (if tunnel URL is available)
 * 2. Update the system prompt so the agent knows about its routine tools
 */
async function syncMcpServer(agentId: string, db: any) {
  const { getSetting } = await import("@/lib/db");

  // Get connected routines with full info including tokens
  const routines = db
    .prepare(
      `SELECT ar.tool_name, r.name, r.description, r.routine_id as api_id, r.token
       FROM agent_routines ar
       JOIN routines r ON ar.routine_id = r.id
       WHERE ar.agent_id = ?`
    )
    .all(agentId) as Array<{
    tool_name: string;
    name: string;
    description: string | null;
    api_id: string;
    token: string;
  }>;

  const mcpBaseUrl = getSetting("mcp_base_url") || "";
  const mcpName = "stride-routines";

  try {
    const client = getClient();
    const agent = await client.beta.agents.retrieve(agentId);
    const currentServers: any[] = (agent as any).mcp_servers || [];
    const currentTools: any[] = (agent as any).tools || [];
    const currentSystem: string = (agent as any).system || "";

    // Clean existing routine block from system prompt
    const cleanSystem = currentSystem
      .replace(new RegExp(`\\n*${ROUTINE_BLOCK_START}[\\s\\S]*?${ROUTINE_BLOCK_END}`, "g"), "")
      .trimEnd();

    const updates: any = {};

    if (routines.length > 0) {
      // --- MCP server config (only if tunnel URL exists) ---
      if (mcpBaseUrl) {
        const mcpUrl = `${mcpBaseUrl}/api/mcp/${agentId}`;
        const hasServer = currentServers.some((s: any) => s.name === mcpName);
        updates.mcp_servers = hasServer
          ? currentServers.map((s: any) =>
              s.name === mcpName ? { type: "url", name: mcpName, url: mcpUrl } : s
            )
          : [...currentServers, { type: "url", name: mcpName, url: mcpUrl }];

        const hasToolset = currentTools.some(
          (t: any) => t.type === "mcp_toolset" && t.mcp_server_name === mcpName
        );
        // Always update the toolset to ensure always_allow permission
        updates.tools = hasToolset
          ? currentTools.map((t: any) =>
              t.type === "mcp_toolset" && t.mcp_server_name === mcpName
                ? { ...t, default_config: { enabled: true, permission_policy: { type: "always_allow" } } }
                : t
            )
          : [...currentTools, {
              type: "mcp_toolset",
              mcp_server_name: mcpName,
              default_config: {
                enabled: true,
                permission_policy: { type: "always_allow" },
              },
            }];
      }

      // --- System prompt: tell the agent about its MCP routine tools ---
      const routineList = routines
        .map((r) => `- Tool: "${r.tool_name}" → Fires routine "${r.name}"${r.description ? ` (${r.description})` : ""}`)
        .join("\n");

      updates.system =
        cleanSystem +
        `\n\n${ROUTINE_BLOCK_START}\nCRITICAL: You have routine tools from the "stride-routines" MCP server. When the user mentions ANY of the routines below, you MUST call the tool immediately using mcp__stride-routines__<tool_name>. Do NOT just say you will call it - actually invoke the tool. Pass an optional "context" string argument if the user provides extra instructions.\n\nAvailable routine tools:\n${routineList}\n${ROUTINE_BLOCK_END}`;
    } else {
      // Remove MCP server and routine prompt block
      updates.mcp_servers = currentServers.filter((s: any) => s.name !== mcpName);
      updates.tools = currentTools.filter(
        (t: any) => !(t.type === "mcp_toolset" && t.mcp_server_name === mcpName)
      );
      updates.system = cleanSystem;
    }

    // Include version for optimistic concurrency
    const version = (agent as any).version;
    await client.beta.agents.update(agentId, { ...updates, version });
  } catch (err) {
    console.error("Failed to sync agent:", err);
  }
}
