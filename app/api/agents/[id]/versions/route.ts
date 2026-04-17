import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";

/**
 * GET /api/agents/:id/versions
 *
 * Lists historical versions for an agent. Returns newest-first (the current
 * version is position 0). Each version is a full agent snapshot.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getClient();
    const versions: any[] = [];
    try {
      const page = (await (client.beta as any).agents.versions.list(
        id
      )) as any;
      if (Array.isArray(page?.data)) {
        versions.push(...page.data);
      } else if (page && typeof page[Symbol.asyncIterator] === "function") {
        for await (const v of page as AsyncIterable<Record<string, unknown>>) {
          versions.push(v);
        }
      }
    } catch {
      // Some early betas didn't expose versions — fall back to just the current agent
      try {
        const current = await client.beta.agents.retrieve(id);
        versions.push(current);
      } catch {
        // ignore
      }
    }

    // Normalize: ensure every item has a version number and sort newest-first
    versions.sort((a, b) => (b?.version ?? 0) - (a?.version ?? 0));
    return NextResponse.json(versions);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to list versions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
