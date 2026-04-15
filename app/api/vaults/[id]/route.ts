import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";

/**
 * GET /api/vaults/:id
 * Retrieve a single vault by ID, including its credentials list.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getClient();

    // Fetch vault details and its credentials in parallel
    const [vault, credentials] = await Promise.all([
      client.beta.vaults.retrieve(id),
      client.beta.vaults.credentials.list(id),
    ]);

    return NextResponse.json({ ...vault, credentials });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to retrieve vault";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
