import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";

/**
 * GET /api/vaults
 * List all vaults from the Anthropic Managed Agents API.
 * Vaults securely store credentials that agents can use at runtime.
 */
export async function GET() {
  try {
    const client = getClient();
    const vaults = await client.beta.vaults.list();
    return NextResponse.json(vaults);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to list vaults";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/vaults
 * Create a new vault.
 *
 * Body: { name, metadata? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, metadata } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const client = getClient();
    const vault = await client.beta.vaults.create({
      name,
      ...(metadata && { metadata }),
    });

    return NextResponse.json(vault, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create vault";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
