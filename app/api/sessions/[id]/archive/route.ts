import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";

/**
 * POST /api/sessions/:id/archive
 *
 * Archives the session. Archived sessions no longer accept new events.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getClient();
    const session = await (client.beta as any).sessions.archive(id);
    return NextResponse.json(session);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to archive session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
