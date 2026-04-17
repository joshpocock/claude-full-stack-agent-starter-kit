import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";

/**
 * POST /api/sessions/:id/send-event
 *
 * Sends an arbitrary session event, or a convenience shape for the common
 * "user.message" case.
 *
 * Body accepts one of:
 *   { events: [...] }               — forwarded verbatim to the SDK
 *   { message: "some text" }        — sugar for a user.message with one text block
 *   { type: "...", ...rest }        — forwarded as events: [body]
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const client = getClient();

    let events: any[];
    if (Array.isArray(body?.events)) {
      events = body.events;
    } else if (typeof body?.message === "string" && body.message.trim()) {
      events = [
        {
          type: "user.message",
          content: [{ type: "text", text: body.message }],
        },
      ];
    } else if (body?.type) {
      events = [body];
    } else {
      return NextResponse.json(
        { error: "Provide `events`, `message`, or an event `type`" },
        { status: 400 }
      );
    }

    const result = await (client.beta as any).sessions.events.send(id, {
      events,
    });
    return NextResponse.json(result ?? { ok: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to send event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
