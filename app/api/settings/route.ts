import { NextResponse } from "next/server";
import { getAllSettings, getSetting, setSetting, deleteSetting } from "@/lib/db";

/**
 * GET /api/settings
 * Returns all app settings. The API key is masked for security.
 */
export async function GET() {
  try {
    const settings = getAllSettings();
    // Mask the API key
    if (settings.anthropic_api_key) {
      const key = settings.anthropic_api_key;
      settings.anthropic_api_key =
        key.length > 12
          ? `${key.slice(0, 10)}...${key.slice(-4)}`
          : "••••••••";
    }
    // Also report whether a .env key exists
    const envKeySet = Boolean(process.env.ANTHROPIC_API_KEY);
    return NextResponse.json({ settings, envKeySet });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to read settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/settings
 * Update one or more settings.
 *
 * Body: { anthropic_api_key?: string, ... }
 * Pass an empty string to delete a key.
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string" && value.trim()) {
        setSetting(key, value.trim());
      } else {
        deleteSetting(key);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
