import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";
import { getChatSession, insertChatSession } from "@/lib/db";

// Allow up to 5 minutes for agent responses
export const maxDuration = 300;

/**
 * POST /api/chat
 *
 * High-level chat endpoint. Sends a message and waits for the full agent
 * response. Uses the same fire-and-wait pattern as the kanban board
 * (which works reliably).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chat_id, message, agent_id, environment_id } = body;

    if (!chat_id || !message) {
      return NextResponse.json(
        { error: "chat_id and message are required" },
        { status: 400 }
      );
    }

    const client = getClient();
    let session = getChatSession(chat_id);

    if (!session) {
      if (!agent_id) {
        return NextResponse.json(
          { error: "agent_id is required for the first message in a new chat" },
          { status: 400 }
        );
      }

      let resolvedEnvId = environment_id as string | undefined;
      if (!resolvedEnvId) {
        try {
          const envResp: any = await (client.beta as any).environments.list();
          const list: any[] = Array.isArray(envResp)
            ? envResp
            : envResp?.data ?? [];
          const first = list.find((e) => !e?.archived_at) ?? list[0];
          if (first?.id) resolvedEnvId = first.id;
        } catch {
          // Fall through
        }
      }
      if (!resolvedEnvId) {
        return NextResponse.json(
          {
            error:
              "environment_id is required. Create an environment at /environments/new, or pass environment_id explicitly.",
          },
          { status: 400 }
        );
      }

      const newSession = await client.beta.sessions.create({
        agent: agent_id,
        environment_id: resolvedEnvId,
      });

      const sessionRecord = {
        chat_id,
        agent_id,
        environment_id: resolvedEnvId,
        session_id: newSession.id,
      };

      insertChatSession(sessionRecord);
      session = sessionRecord as unknown as typeof session;
    }

    const sessionId = session!.session_id;

    // Send the message
    await (client.beta as any).sessions.events.send(sessionId, {
      events: [
        {
          type: "user.message",
          content: [{ type: "text", text: message }],
        },
      ],
    });

    // Poll for session to go idle (agent finished responding)
    const POLL_INTERVAL = 1500;
    const MAX_WAIT = 180_000;
    const start = Date.now();

    while (Date.now() - start < MAX_WAIT) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));

      try {
        const sessionStatus = await client.beta.sessions.retrieve(sessionId);
        const status = (sessionStatus as any).status;

        if (status === "idle" || status === "completed" || status === "terminated") {
          break;
        }
        if (status === "error") {
          return NextResponse.json(
            { error: "Session encountered an error" },
            { status: 500 }
          );
        }
      } catch {
        // Keep polling
      }
    }

    // Fetch the full conversation from replay to get the complete response
    let fullResponse = "";
    try {
      const replayRes = await (client.beta as any).sessions.events.list(sessionId);
      const events: any[] = [];

      // Handle both array and paginated responses
      if (Symbol.asyncIterator in Object(replayRes)) {
        for await (const ev of replayRes) {
          events.push(ev);
        }
      } else if (Array.isArray(replayRes)) {
        events.push(...replayRes);
      } else if (replayRes?.data) {
        events.push(...replayRes.data);
      }

      // Get the LAST agent message(s) - these are the response to our message
      const agentMessages: string[] = [];
      let foundOurMessage = false;

      for (const ev of events) {
        if (ev?.type === "user.message") {
          // Check if this is the message we just sent
          const text = ev?.content?.[0]?.text || "";
          if (text === message) {
            foundOurMessage = true;
            agentMessages.length = 0; // Reset - only want messages after ours
          }
        }
        if (foundOurMessage && ev?.type === "agent.message" && Array.isArray(ev.content)) {
          for (const block of ev.content) {
            if (block?.type === "text" && typeof block.text === "string") {
              agentMessages.push(block.text);
            }
          }
        }
      }

      fullResponse = agentMessages.join("\n\n");
    } catch (err) {
      console.error("Failed to fetch replay:", err);
    }

    // If replay failed, try a simpler approach - just get latest events
    if (!fullResponse) {
      try {
        const stream = await (client.beta as any).sessions.events.stream(sessionId);
        const chunks: string[] = [];
        const streamStart = Date.now();

        for await (const ev of stream as AsyncIterable<any>) {
          if (Date.now() - streamStart > 5000) break; // Quick scan
          if (ev?.type === "agent.message" && Array.isArray(ev.content)) {
            for (const block of ev.content) {
              if (block?.type === "text" && typeof block.text === "string") {
                chunks.push(block.text);
              }
            }
          }
          if (ev?.type === "session.status_idle") break;
        }

        fullResponse = chunks.join("\n\n");

        try {
          (stream as any)?.controller?.abort?.();
        } catch { /* ignore */ }
      } catch {
        fullResponse = "Agent responded but could not retrieve the full message. Check the session for details.";
      }
    }

    return NextResponse.json({
      chat_id,
      session_id: sessionId,
      response: fullResponse,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Chat request failed";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
