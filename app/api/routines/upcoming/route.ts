import { NextResponse } from "next/server";
import { CronExpressionParser } from "cron-parser";
import { getRoutines } from "@/lib/db";

/**
 * GET /api/routines/upcoming?days=7
 *
 * Returns predicted fire times for every routine with a cron_schedule,
 * covering the next N days. Used by the Calendar view.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Math.max(1, Math.min(31, Number(searchParams.get("days") ?? "7")));

    const now = new Date();
    const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const results: Array<{ routine_id: number; routine_name: string; at: string }> = [];

    for (const routine of getRoutines()) {
      if (!routine.cron_schedule) continue;
      try {
        const iter = CronExpressionParser.parse(routine.cron_schedule, {
          currentDate: now,
          endDate: horizon,
        });
        while (true) {
          const next = iter.next();
          results.push({
            routine_id: routine.id,
            routine_name: routine.name,
            at: next.toDate().toISOString(),
          });
        }
      } catch (err) {
        if (err instanceof Error && err.message === "Out of the timespan range") {
          // normal end-of-iteration signal
        } else {
          // invalid cron — skip this routine
        }
      }
    }

    return NextResponse.json({ runs: results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to compute upcoming runs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
