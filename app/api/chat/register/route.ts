import { NextResponse } from "next/server";
import { insertChatSession, getChatSession } from "@/lib/db";

/**
 * POST /api/chat/register
 *
 * Registers an existing Anthropic session under a local chat_id so the
 * /api/chat endpoint can route subsequent messages to it.
 *
 * Used by "Continue in chat" when resuming a session from the task board.
 *
 * Body: { chat_id, session_id, agent_id, environment_id }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chat_id, session_id, agent_id, environment_id } = body;

    if (!chat_id || !session_id) {
      return NextResponse.json(
        { error: "chat_id and session_id are required" },
        { status: 400 }
      );
    }

    // Don't overwrite an existing mapping
    const existing = getChatSession(chat_id);
    if (existing) {
      return NextResponse.json({ ok: true, existing: true });
    }

    insertChatSession({
      chat_id,
      session_id,
      agent_id: agent_id || "",
      environment_id: environment_id || "",
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to register session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
