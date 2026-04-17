import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";

/**
 * POST /api/sessions/:id/interrupt
 *
 * Sends a `user.interrupt` event into the session so the agent stops its
 * current turn. The event stream will emit status changes as a result.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getClient();

    const result = await (client.beta as any).sessions.events.send(id, {
      events: [{ type: "user.interrupt" }],
    });

    return NextResponse.json(result ?? { ok: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to send interrupt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
