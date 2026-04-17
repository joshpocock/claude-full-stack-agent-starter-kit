import { NextResponse } from "next/server";
import { getRoutineRuns, getTodayRunCount } from "@/lib/db";

/**
 * GET /api/routines/runs
 *
 * Returns run history and today's usage count.
 *
 * Query params:
 *   routine_id — filter to a specific routine
 *   since      — ISO date, return runs from this date onwards
 *   limit      — max rows (default 100)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const routineId = searchParams.get("routine_id");
    const since = searchParams.get("since");
    const limit = Number(searchParams.get("limit") ?? "100");

    const runs = getRoutineRuns({
      routineId: routineId ? Number(routineId) : undefined,
      since: since ?? undefined,
      limit,
    });

    const todayCount = getTodayRunCount();

    return NextResponse.json({
      runs,
      today_count: todayCount,
      daily_limit: 15,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get runs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
