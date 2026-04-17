import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;
let clientApiKey: string | null = null;

/**
 * Returns the Anthropic client singleton.
 *
 * API key resolution order:
 *   1. `app_settings` table in SQLite (key: "anthropic_api_key") — set via /settings
 *   2. `ANTHROPIC_API_KEY` environment variable from .env
 *   3. SDK default (reads ANTHROPIC_API_KEY from process.env automatically)
 *
 * When the key in the DB changes (e.g. user updates it in /settings), the
 * client is recreated on the next call.
 */
export function getClient(): Anthropic {
  let dbKey: string | undefined;
  try {
    // Dynamic import to avoid issues if DB isn't ready at module load
    const { getSetting } = require("@/lib/db");
    dbKey = getSetting("anthropic_api_key");
  } catch {
    // DB not available — fall through to env
  }

  const effectiveKey = dbKey || process.env.ANTHROPIC_API_KEY || "";

  // Recreate client if the key changed
  if (client && clientApiKey === effectiveKey) {
    return client;
  }

  client = dbKey
    ? new Anthropic({ apiKey: dbKey })
    : new Anthropic(); // SDK reads ANTHROPIC_API_KEY from env
  clientApiKey = effectiveKey;
  return client;
}
