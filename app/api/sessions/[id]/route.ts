import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";

/**
 * GET /api/sessions/:id
 * Retrieve details for a single session.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getClient();
    const session = await client.beta.sessions.retrieve(id);
    return NextResponse.json(session);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to retrieve session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
