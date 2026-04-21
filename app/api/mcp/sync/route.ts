import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";

const ROUTINE_BLOCK_START = "<!-- STRIDE_ROUTINES_START -->";
const ROUTINE_BLOCK_END = "<!-- STRIDE_ROUTINES_END -->";

/**
 * POST /api/mcp/sync
 * Called by dev:tunnel startup script after obtaining the tunnel URL.
 * 1. Creates/updates vault credential for the MCP endpoint
 * 2. Updates all agents with routines: MCP server URL + system prompt
 * 3. Stores vault info for session creation
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

    const { getDb, setSetting, getSetting } = await import("@/lib/db");
    const db = getDb();
    const client = getClient();

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

    // --- Step 1: Manage vault credential for the MCP endpoint ---
    await syncVaultCredential(client, base_url, getSetting, setSetting);

    // --- Step 2: Update agents with routines ---
    const agentIds = db
      .prepare("SELECT DISTINCT agent_id FROM agent_routines")
      .all() as Array<{ agent_id: string }>;

    if (agentIds.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    const mcpName = "stride-routines";
    let synced = 0;

    for (const { agent_id } of agentIds) {
      try {
        const mcpUrl = `${base_url}/api/mcp/${agent_id}`;

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

        const agent = await client.beta.agents.retrieve(agent_id);
        const currentServers: any[] = (agent as any).mcp_servers || [];
        const currentTools: any[] = (agent as any).tools || [];
        const currentSystem: string = (agent as any).system || "";

        // MCP server config
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

        // System prompt
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
          `\n\n${ROUTINE_BLOCK_START}\nCRITICAL: You have routine tools from the "stride-routines" MCP server. When the user mentions ANY of the routines below, you MUST call the tool immediately using mcp__stride-routines__<tool_name>. Do NOT just say you will call it - actually invoke the tool. Pass an optional "context" string argument if the user provides extra instructions.\n\nAvailable routine tools:\n${routineList}\n${ROUTINE_BLOCK_END}`;

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

/**
 * Create or update the vault credential for our MCP endpoint.
 * Since mcp_server_url is immutable on credentials, we delete the old
 * one and create a new one when the tunnel URL changes.
 */
async function syncVaultCredential(
  client: any,
  baseUrl: string,
  getSetting: (key: string) => string | undefined,
  setSetting: (key: string, value: string) => void
) {
  const mcpUrl = baseUrl; // The base URL is the MCP server URL
  const oldUrl = getSetting("mcp_credential_url") || "";
  const vaultId = getSetting("mcp_vault_id") || "";
  const credentialId = getSetting("mcp_credential_id") || "";

  // If URL hasn't changed and we have a credential, nothing to do
  if (oldUrl === mcpUrl && vaultId && credentialId) {
    return;
  }

  try {
    // Delete old credential if it exists
    if (vaultId && credentialId) {
      try {
        await client.beta.vaults.credentials.delete(credentialId, {
          vault_id: vaultId,
        });
        console.log("  Deleted old MCP credential");
      } catch {
        // May already be deleted
      }
    }

    // Find or create a vault
    let targetVaultId = "";

    // Check if stored vault still exists
    if (vaultId) {
      try {
        await client.beta.vaults.retrieve(vaultId);
        targetVaultId = vaultId;
      } catch {
        // Vault was deleted externally - clear stored ID
        console.log("  Stored vault no longer exists, finding/creating new one");
      }
    }

    if (!targetVaultId) {
      try {
        const vaults = await client.beta.vaults.list();
        const vaultList: any[] = [];
        if (Array.isArray(vaults)) {
          vaultList.push(...vaults);
        } else if (vaults?.data) {
          vaultList.push(...vaults.data);
        } else if (typeof vaults[Symbol.asyncIterator] === "function") {
          for await (const v of vaults) {
            vaultList.push(v);
          }
        }

        const existing = vaultList.find((v: any) =>
          v.name?.includes("stride") || v.name?.includes("Stride")
        );
        if (existing) {
          targetVaultId = existing.id;
        } else if (vaultList.length > 0) {
          targetVaultId = vaultList[0].id;
        } else {
          const newVault = await client.beta.vaults.create({
            name: "Stride Routines",
          });
          targetVaultId = newVault.id;
          console.log(`  Created new vault: ${targetVaultId}`);
        }
      } catch (err) {
        console.error("  Failed to find/create vault:", err);
        return;
      }
    }

    setSetting("mcp_vault_id", targetVaultId);

    // Create new credential with the current tunnel URL
    // Use a dummy token since our MCP endpoint doesn't require auth
    const credential = await client.beta.vaults.credentials.create(
      targetVaultId,
      {
        display_name: "Stride Routines MCP",
        auth: {
          type: "static_bearer",
          token: "stride-routines-token",
          mcp_server_url: mcpUrl,
        },
      }
    );

    setSetting("mcp_credential_id", credential.id);
    setSetting("mcp_credential_url", mcpUrl);
    console.log(`  Created MCP credential: ${credential.id} → ${mcpUrl}`);
  } catch (err) {
    console.error(
      "  Failed to sync vault credential:",
      err instanceof Error ? err.message : err
    );
  }
}
