import { NextResponse } from "next/server";
import { getMcpLogs } from "@/lib/db";

/**
 * GET /api/mcp/logs?agent_id=X&limit=50
 * Returns MCP call logs.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agent_id") || undefined;
    const limit = Number(searchParams.get("limit") || "50");

    const logs = getMcpLogs({ agentId, limit });
    return NextResponse.json(logs);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get MCP logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
