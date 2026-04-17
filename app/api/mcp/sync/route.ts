import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";

const ROUTINE_BLOCK_START = "<!-- STRIDE_ROUTINES_START -->";
const ROUTINE_BLOCK_END = "<!-- STRIDE_ROUTINES_END -->";

/**
 * POST /api/mcp/sync
 * Called by dev:tunnel startup script after obtaining the tunnel URL.
 * Updates ALL agents that have connected routines:
 * - Sets the MCP server URL to the new tunnel URL
 * - Updates the system prompt with routine tool info
 * Body: { base_url: string }
 */
export async function POST(request: Request) {
  try {
    const { base_url } = await request.json();

    if (!base_url) {
      return NextResponse.json(
        { error: "base_url is required" },
        { status: 400 }
      );
    }

    const { getDb, setSetting } = await import("@/lib/db");
    const db = getDb();

    setSetting("mcp_base_url", base_url);

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

    // Get all agents with routines + the routine details
    const agentIds = db
      .prepare("SELECT DISTINCT agent_id FROM agent_routines")
      .all() as Array<{ agent_id: string }>;

    if (agentIds.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    const client = getClient();
    const mcpName = "stride-routines";
    let synced = 0;

    for (const { agent_id } of agentIds) {
      try {
        const mcpUrl = `${base_url}/api/mcp/${agent_id}`;

        // Get routines for this agent
        const routines = db
          .prepare(
            `SELECT ar.tool_name, r.name, r.description
             FROM agent_routines ar
             JOIN routines r ON ar.routine_id = r.id
             WHERE ar.agent_id = ?`
          )
          .all(agent_id) as Array<{
          tool_name: string;
          name: string;
          description: string | null;
        }>;

        // Get current agent config
        const agent = await client.beta.agents.retrieve(agent_id);
        const currentServers: any[] = (agent as any).mcp_servers || [];
        const currentTools: any[] = (agent as any).tools || [];
        const currentSystem: string = (agent as any).system || "";

        // --- MCP server config ---
        const hasServer = currentServers.some((s: any) => s.name === mcpName);
        const updatedServers = hasServer
          ? currentServers.map((s: any) =>
              s.name === mcpName
                ? { type: "url", name: mcpName, url: mcpUrl }
                : s
            )
          : [...currentServers, { type: "url", name: mcpName, url: mcpUrl }];

        const hasToolset = currentTools.some(
          (t: any) => t.type === "mcp_toolset" && t.mcp_server_name === mcpName
        );
        const updatedTools = hasToolset
          ? currentTools
          : [...currentTools, { type: "mcp_toolset", mcp_server_name: mcpName }];

        // --- System prompt with routine info ---
        const cleanSystem = currentSystem
          .replace(
            new RegExp(`\\n*${ROUTINE_BLOCK_START}[\\s\\S]*?${ROUTINE_BLOCK_END}`, "g"),
            ""
          )
          .trimEnd();

        const routineList = routines
          .map((r) => `- Tool: "${r.tool_name}" → Fires routine "${r.name}"${r.description ? ` (${r.description})` : ""}`)
          .join("\n");

        const updatedSystem =
          cleanSystem +
          `\n\n${ROUTINE_BLOCK_START}\nYou have routines available via the "stride-routines" MCP server. When the user asks you to run, fire, call, or trigger a routine, use the corresponding MCP tool. You can pass an optional "context" string argument with extra instructions.\n\nAvailable routine tools:\n${routineList}\n${ROUTINE_BLOCK_END}`;

        const version = (agent as any).version;
        await client.beta.agents.update(agent_id, {
          version,
          mcp_servers: updatedServers,
          tools: updatedTools,
          system: updatedSystem,
        } as any);

        synced++;
      } catch (err) {
        console.error(
          `Failed to sync agent ${agent_id}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    return NextResponse.json({ synced, total: agentIds.length });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to sync MCP servers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
