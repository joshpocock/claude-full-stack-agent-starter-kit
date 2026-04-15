import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";

/**
 * GET /api/environments/:id
 * Retrieve a single environment by ID.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getClient();
    const environment = await client.beta.environments.retrieve(id);
    return NextResponse.json(environment);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to retrieve environment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
