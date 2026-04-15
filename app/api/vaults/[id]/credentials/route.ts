import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";

/**
 * GET /api/vaults/:id/credentials
 * List all credentials stored in a specific vault.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getClient();
    const credentials = await client.beta.vaults.credentials.list(id);
    return NextResponse.json(credentials);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to list credentials";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/vaults/:id/credentials
 * Create a new credential inside a vault.
 *
 * Body: {
 *   display_name: string,
 *   auth: { type: string, token?: string, mcp_server_url?: string },
 *   metadata?: Record<string, string>
 * }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { display_name, auth, metadata } = body;

    if (!display_name || !auth) {
      return NextResponse.json(
        { error: "display_name and auth are required" },
        { status: 400 }
      );
    }

    const client = getClient();
    const credential = await client.beta.vaults.credentials.create(id, {
      display_name,
      auth,
      ...(metadata && { metadata }),
    });

    return NextResponse.json(credential, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create credential";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
