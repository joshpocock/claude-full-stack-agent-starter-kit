import { NextResponse } from "next/server";
import { getAllChatSessions, deleteChatSession } from "@/lib/db";
import { getClient } from "@/lib/anthropic";

/**
 * GET /api/chat/history
 *
 * Returns all local chat sessions enriched with agent names.
 */
export async function GET() {
  try {
    const sessions = getAllChatSessions();

    // Collect unique agent IDs and fetch their names
    const agentIds = [...new Set(sessions.map((s) => s.agent_id).filter(Boolean))];
    const agentMap: Record<string, string> = {};

    if (agentIds.length > 0) {
      const client = getClient();
      const results = await Promise.allSettled(
        agentIds.map((id) => client.beta.agents.retrieve(id))
      );
      for (let i = 0; i < agentIds.length; i++) {
        const result = results[i];
        if (result.status === "fulfilled") {
          agentMap[agentIds[i]] = (result.value as any).name || agentIds[i];
        } else {
          agentMap[agentIds[i]] = agentIds[i];
        }
      }
    }

    const enriched = sessions.map((s) => ({
      ...s,
      agent_name: agentMap[s.agent_id] || s.agent_id || "Unknown Agent",
    }));

    return NextResponse.json(enriched);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch chat history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/history
 *
 * Delete a chat session by chat_id.
 * Body: { chat_id: string }
 */
export async function DELETE(request: Request) {
  try {
    const { chat_id } = await request.json();
    if (!chat_id) {
      return NextResponse.json({ error: "chat_id is required" }, { status: 400 });
    }
    deleteChatSession(chat_id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete chat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
