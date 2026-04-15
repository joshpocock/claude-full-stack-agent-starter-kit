/**
 * POST /api/chat - Next.js API Route
 *
 * Receives { chat_id, message } and returns Claude's response.
 *
 * On the first message for a given chat_id, this creates a new
 * managed agent, environment, and session via the Anthropic SDK.
 * On subsequent messages, it reuses the existing session.
 *
 * The SDK handles the beta header (interop-2025-01-24) automatically
 * when using client.agents, client.environments, and client.sessions.
 *
 * This replaces n8n's 10-node workflow with a single API route.
 * No visual workflow builder needed -- just the Anthropic SDK.
 *
 * NOT production-ready. This is a learning demo for the starter kit.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession, insertSession } from "@/lib/db";
import { createAgentSession, sendAndGetResponse } from "@/lib/agent";

export async function POST(req: NextRequest) {
  try {
    const { chat_id, message } = await req.json();

    // Validate required fields
    if (!chat_id || !message) {
      return NextResponse.json(
        { error: "chat_id and message are required" },
        { status: 400 }
      );
    }

    // Look up the existing session for this chat, or create a new one
    let session = getSession(chat_id);

    if (!session) {
      // First message from this chat -- create the agent, environment, and session
      console.log(`[${chat_id}] New chat -- creating managed agent session...`);
      const newSession = await createAgentSession(chat_id);
      insertSession(newSession);
      session = newSession;
    } else {
      console.log(`[${chat_id}] Reusing existing session: ${session.session_id}`);
    }

    // Send the user's message and wait for Claude's response
    const response = await sendAndGetResponse(session, message);

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
