import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";

/**
 * GET /api/environments
 * List all environments from the Anthropic Managed Agents API.
 */
export async function GET() {
  try {
    const client = getClient();
    const environments = await client.beta.environments.list();
    return NextResponse.json(environments);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to list environments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/environments
 * Create a new sandbox environment.
 *
 * Body: { name, setup_commands?, network_access? }
 * setup_commands is an array of shell commands to run during environment setup
 * (e.g. installing packages).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, setup_commands, network_access } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const client = getClient();
    const environment = await client.beta.environments.create({
      name,
      ...(setup_commands && { setup_commands }),
      ...(network_access !== undefined && { network_access }),
    });

    return NextResponse.json(environment, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create environment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
