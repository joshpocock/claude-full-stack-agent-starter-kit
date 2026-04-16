import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";

/**
 * GET /api/environments
 * List all environments from the Anthropic Managed Agents API.
 */
export async function GET() {
  try {
    const client = getClient();
    const response: any = await (client.beta as any).environments.list();
    // Normalize paginated response to plain array
    const environments = Array.isArray(response)
      ? response
      : (response?.data ?? []);
    return NextResponse.json(environments);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to list environments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/environments
 * Create a new cloud sandbox environment using the Managed Agents API.
 *
 * Body: {
 *   name: string,
 *   description?: string,
 *   config?: { type: "cloud", networking?, packages? },
 *   metadata?: Record<string, string>
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, config, metadata } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const client = getClient();
    const environment = await client.beta.environments.create({
      name,
      ...(description && { description }),
      ...(config && { config }),
      ...(metadata && Object.keys(metadata).length > 0 && { metadata }),
    });

    return NextResponse.json(environment, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create environment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
