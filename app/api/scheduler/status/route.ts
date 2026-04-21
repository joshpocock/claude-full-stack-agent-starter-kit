import { NextResponse } from "next/server";
import { getSetting } from "@/lib/db";

/**
 * GET /api/scheduler/status
 *
 * Reports whether the local scheduler worker (scripts/scheduler.mjs) is alive.
 * The worker writes `scheduler_heartbeat_at` to app_settings on each poll tick
 * (every ~30s). We consider it "connected" if the heartbeat is less than 90s
 * old — three missed ticks before we call it stale.
 */
const STALE_MS = 90_000;

export async function GET() {
  try {
    const heartbeat = getSetting("scheduler_heartbeat_at") ?? null;
    const ageMs = heartbeat ? Date.now() - new Date(heartbeat).getTime() : null;
    const connected = ageMs !== null && ageMs < STALE_MS;

    return NextResponse.json({
      connected,
      heartbeat_at: heartbeat,
      age_ms: ageMs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to read scheduler status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
