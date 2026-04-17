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
    const vaults: any[] = [];
    try {
      const response = await (client.beta as any).vaults.list();
      if (Array.isArray(response)) {
        vaults.push(...response);
      } else if (response?.data) {
        vaults.push(...response.data);
      } else {
        for await (const vault of (client.beta as any).vaults.list()) {
          vaults.push(vault);
        }
      }
    } catch {
      // If the list method doesn't exist yet in the SDK, return empty
    }
    // The SDK exposes the human-readable name as `display_name`; our UI reads `name`.
    const normalized = vaults.map((v) => ({
      ...v,
      name: v?.name ?? v?.display_name ?? "",
    }));
    return NextResponse.json(normalized);
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
    // Anthropic API uses display_name for vaults, not name
    const vault: any = await (client.beta as any).vaults.create({
      display_name: name,
      ...(metadata && { metadata }),
    });

    return NextResponse.json(
      { ...vault, name: vault?.name ?? vault?.display_name ?? name },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create vault";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
