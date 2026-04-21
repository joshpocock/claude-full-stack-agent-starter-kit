#!/usr/bin/env node

/**
 * Local routine scheduler.
 *
 * Polls /api/routines every SYNC_INTERVAL_MS, registers each routine that has
 * a cron_schedule with node-cron, and fires it on tick by POSTing to the same
 * endpoint the UI uses. Reconciles on every poll so UI-edited schedules take
 * effect without restarting the worker.
 *
 * Usage: node scripts/scheduler.mjs
 */

import cron from "node-cron";

const START_PORT = Number(process.env.PORT || 3002);
let LOCAL_URL = process.env.LOCAL_URL || `http://localhost:${START_PORT}`;
const SYNC_INTERVAL_MS = 30_000;
const READY_TIMEOUT_MS = 60_000;

// Tracks live node-cron tasks keyed by routine id, with the schedule string
// we registered them under so we can detect changes.
const active = new Map(); // id -> { schedule, task }

async function findDevServer() {
  // Try ports from START_PORT to START_PORT+20 to find a running dev server
  for (let port = START_PORT; port < START_PORT + 20; port++) {
    try {
      const url = `http://localhost:${port}`;
      const res = await fetch(`${url}/api/routines`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) return url;
    } catch {}
  }
  return null;
}

async function waitForDevServer() {
  const start = Date.now();
  while (Date.now() - start < READY_TIMEOUT_MS) {
    // First try the known URL
    try {
      const res = await fetch(`${LOCAL_URL}/api/routines`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) return true;
    } catch {}

    // If that fails, scan ports to find where the dev server is running
    const found = await findDevServer();
    if (found) {
      LOCAL_URL = found;
      console.log(`  Dev server found at ${LOCAL_URL}`);
      return true;
    }

    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

async function fireRoutine(routine) {
  try {
    const res = await fetch(`${LOCAL_URL}/api/routines/${routine.id}/fire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`  ✗ [${routine.name}] fire failed (${res.status}): ${txt.slice(0, 200)}`);
      return;
    }
    const data = await res.json();
    const url = data.last_session_url || data.claude_code_session_url || "";
    console.log(`  ✓ [${routine.name}] fired${url ? ` → ${url}` : ""}`);
  } catch (err) {
    console.error(`  ✗ [${routine.name}] fire errored:`, err.message);
  }
}

async function writeHeartbeat() {
  try {
    await fetch(`${LOCAL_URL}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduler_heartbeat_at: new Date().toISOString() }),
    });
  } catch {
    // best effort — dev server may be restarting
  }
}

async function sync() {
  let routines;
  try {
    const res = await fetch(`${LOCAL_URL}/api/routines`);
    if (!res.ok) {
      console.error(`  ⚠ Could not list routines: HTTP ${res.status}`);
      return;
    }
    routines = await res.json();
  } catch (err) {
    console.error("  ⚠ Could not reach dev server:", err.message);
    return;
  }

  await writeHeartbeat();

  const scheduled = routines.filter((r) => r.cron_schedule && r.cron_schedule.trim());
  const seen = new Set();

  for (const routine of scheduled) {
    const schedule = routine.cron_schedule.trim();
    seen.add(routine.id);

    if (!cron.validate(schedule)) {
      console.error(`  ⚠ [${routine.name}] invalid cron expression: "${schedule}"`);
      const existing = active.get(routine.id);
      if (existing) {
        existing.task.stop();
        active.delete(routine.id);
      }
      continue;
    }

    const existing = active.get(routine.id);
    if (existing && existing.schedule === schedule) continue;
    if (existing) existing.task.stop();

    const task = cron.schedule(schedule, () => fireRoutine(routine));
    active.set(routine.id, { schedule, task });
    console.log(`  + [${routine.name}] scheduled (${schedule})`);
  }

  // Remove tasks for routines that no longer have a schedule or were deleted.
  for (const [id, entry] of active) {
    if (!seen.has(id)) {
      entry.task.stop();
      active.delete(id);
      console.log(`  - routine ${id} unscheduled`);
    }
  }
}

async function main() {
  console.log(`\n  Scheduler connecting to ${LOCAL_URL}...`);
  const ready = await waitForDevServer();
  if (!ready) {
    console.error("\n  ✗ Dev server didn't respond within 60s — is `npm run dev` running?");
    process.exit(1);
  }
  console.log("  ✓ Connected\n");

  await sync();
  setInterval(sync, SYNC_INTERVAL_MS);
}

process.on("SIGINT", () => {
  for (const entry of active.values()) entry.task.stop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  for (const entry of active.values()) entry.task.stop();
  process.exit(0);
});

main().catch((err) => {
  console.error("Scheduler crashed:", err);
  process.exit(1);
});
