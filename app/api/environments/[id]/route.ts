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

/**
 * PATCH /api/environments/:id
 * Update an existing environment's configuration.
 * Uses raw fetch because the SDK may require fields the API doesn't.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Remove version field - the raw API doesn't need it
    const apiKey = process.env.ANTHROPIC_API_KEY;
    let dbKey: string | undefined;
    try {
      const { getSetting } = await import("@/lib/db");
      dbKey = getSetting("anthropic_api_key");
    } catch {}

    const key = dbKey || apiKey || "";
    const headers = {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "managed-agents-2026-04-01",
      "Content-Type": "application/json",
    };

    // Fetch current environment to get its version (required for updates)
    const getRes = await fetch(`https://api.anthropic.com/v1/environments/${id}`, { headers });
    if (!getRes.ok) {
      return NextResponse.json({ error: "Failed to fetch environment" }, { status: 500 });
    }
    const current = await getRes.json();
    const version = current.version ?? current.latest_version;

    const res = await fetch(`https://api.anthropic.com/v1/environments/${id}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, ...(version != null && { version }) }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: res.status });
    }

    const updated = await res.json();
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update environment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/environments/:id
 * Delete an environment by ID.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getClient();

    try {
      await client.beta.environments.delete(id);
    } catch {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "ANTHROPIC_API_KEY is not configured" },
          { status: 500 }
        );
      }
      const res = await fetch(`https://api.anthropic.com/v1/environments/${id}`, {
        method: "DELETE",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "managed-agents-2026-04-01",
        },
      });
      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { error: `Delete failed: ${errText || res.statusText}` },
          { status: res.status }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete environment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
