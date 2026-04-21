import { NextResponse } from "next/server";
import { getSetting } from "@/lib/db";

/**
 * GET /api/tunnel/status
 *
 * Reports whether the Cloudflare tunnel started by scripts/dev-with-tunnel.mjs
 * is currently alive. The tunnel script writes `tunnel_heartbeat_at` and
 * `tunnel_url` every ~30s; a missing or stale heartbeat means the tunnel is
 * down (or was never started), so any agent with an MCP server pointing at it
 * won't be reachable from Anthropic's managed runtime.
 */
const STALE_MS = 90_000;

export async function GET() {
  try {
    const heartbeat = getSetting("tunnel_heartbeat_at") ?? null;
    const url = getSetting("tunnel_url") ?? getSetting("mcp_base_url") ?? null;
    const ageMs = heartbeat ? Date.now() - new Date(heartbeat).getTime() : null;
    const connected = ageMs !== null && ageMs < STALE_MS;

    return NextResponse.json({
      connected,
      url,
      heartbeat_at: heartbeat,
      age_ms: ageMs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to read tunnel status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
