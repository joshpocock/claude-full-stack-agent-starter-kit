/**
 * 06 - Scheduled Routine
 *
 * Routines are a separate feature from Managed Agents. While Managed Agents
 * give you full control over agent configs, environments, and sessions,
 * Routines are pre-configured automations that you trigger via a simple
 * /fire endpoint. Think of them as one-shot tasks with built-in scheduling.
 *
 * This example fires a nightly backlog triage routine that:
 * 1. Pulls open issues from Linear
 * 2. Labels them by priority and category
 * 3. Posts a summary to Slack
 *
 * The routine itself is configured at claude.ai/code/routines. This script
 * just fires it and tracks the result.
 *
 * Run: npx tsx routine.ts
 *
 * In production, schedule this with cron or CI:
 *   0 2 * * * cd /path/to/project && npx tsx routine.ts
 *
 * Raw API call (for reference):
 *   curl -X POST https://api.anthropic.com/v1/claude_code/routines/{trigger_id}/fire \
 *     -H "x-api-key: $ANTHROPIC_API_KEY" \
 *     -H "content-type: application/json" \
 *     -H "anthropic-beta: experimental-cc-routine-2026-04-01" \
 *     -d '{"text": "Run nightly backlog triage for 2026-04-13"}'
 *
 * Note: Routines use a different beta header than Managed Agents:
 *   Routines:       experimental-cc-routine-2026-04-01
 *   Managed Agents: managed-agents-2026-04-01
 */

import Anthropic from "@anthropic-ai/sdk";

// Your routine's trigger ID from claude.ai/code/routines
const TRIGGER_ID = "trigger_abc123";

const client = new Anthropic();

async function main() {
  const today = new Date().toISOString().split("T")[0];
  console.log(`[${today}] Firing nightly backlog triage routine...`);

  // -------------------------------------------------------------------
  // Fire the routine
  //
  // Unlike Managed Agents where you create agents, environments, and
  // sessions separately, routines are a single fire-and-forget call.
  // You send text input and get back a session URL to track progress.
  //
  // API: POST /v1/claude_code/routines/{trigger_id}/fire
  // Beta header: experimental-cc-routine-2026-04-01
  // -------------------------------------------------------------------
  const response = await fetch(
    `https://api.anthropic.com/v1/claude_code/routines/${TRIGGER_ID}/fire`,
    {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "content-type": "application/json",
        // Routines require their own beta header (not the managed-agents one)
        "anthropic-beta": "experimental-cc-routine-2026-04-01",
      },
      body: JSON.stringify({
        text: `Run nightly backlog triage for ${today}. Pull all open issues from Linear, categorize by priority (critical, high, medium, low), label any unlabeled issues, and post the summary to #engineering-standup in Slack.`,
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Routine fire failed (${response.status}): ${errorBody}`
    );
  }

  const result = await response.json();

  // -------------------------------------------------------------------
  // Handle the response
  //
  // The /fire endpoint returns a session URL where you can track the
  // routine's progress. The routine runs asynchronously, so this script
  // can exit immediately after firing.
  // -------------------------------------------------------------------
  console.log("Routine fired successfully.");
  console.log(`Session URL: ${result.session_url}`);
  console.log(`Session ID:  ${result.session_id}`);
  console.log(
    "\nThe routine is running in the background. " +
    "Visit the session URL to watch progress."
  );
}

main().catch((err) => {
  console.error(`Routine fire failed: ${err.message}`);
  process.exit(1);
});
