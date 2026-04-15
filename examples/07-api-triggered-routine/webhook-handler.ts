/**
 * 07 - API-Triggered Routine (Express Webhook Handler)
 *
 * Shows how to wire a Claude routine into an alerting system. This Express
 * server receives webhook payloads from monitoring tools (Datadog, Sentry,
 * PagerDuty, etc.) and forwards them to a routine that investigates the alert.
 *
 * The flow:
 *   1. Alert fires in Datadog/Sentry/PagerDuty
 *   2. Webhook hits this server at POST /webhook/alert
 *   3. Server extracts the alert details and fires a routine
 *   4. Routine investigates the issue (checks logs, traces, code)
 *   5. Returns a session URL for the team to follow along
 *
 * When to use routines vs managed agents:
 *   - Routines: Quick, pre-configured tasks. One API call to fire. Best for
 *     well-defined automations that always do the same type of work.
 *   - Managed Agents: Full control over the agent's config, environment, and
 *     session lifecycle. Best when you need custom tooling, persistent state,
 *     or multi-turn conversations.
 *
 * Run: npx tsx webhook-handler.ts
 * Test: curl -X POST http://localhost:3000/webhook/alert \
 *         -H "content-type: application/json" \
 *         -d '{"alert_name": "High Error Rate", "service": "api-gateway", "severity": "critical"}'
 *
 * The SDK handles authentication, but routines use a different beta header:
 *   Routines:       experimental-cc-routine-2026-04-01
 *   Managed Agents: managed-agents-2026-04-01
 */

import express from "express";

const app = express();
app.use(express.json());

// Your routine's trigger ID from claude.ai/code/routines
const TRIGGER_ID = "trigger_alert_handler_456";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const PORT = process.env.PORT || 3000;

// -------------------------------------------------------------------
// Fire a routine with the given text payload
//
// API: POST /v1/claude_code/routines/{trigger_id}/fire
// Beta header: experimental-cc-routine-2026-04-01
// -------------------------------------------------------------------
async function fireRoutine(text: string): Promise<{ session_url: string; session_id: string }> {
  const response = await fetch(
    `https://api.anthropic.com/v1/claude_code/routines/${TRIGGER_ID}/fire`,
    {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "content-type": "application/json",
        // Routines require their own beta header
        "anthropic-beta": "experimental-cc-routine-2026-04-01",
      },
      body: JSON.stringify({ text }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Routine fire failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

// -------------------------------------------------------------------
// Webhook endpoint: receives alerts and fires the investigation routine
//
// Accepts any JSON payload. Extracts key fields and formats them into
// a clear prompt for the routine. The routine is pre-configured at
// claude.ai/code/routines with instructions for investigating alerts.
// -------------------------------------------------------------------
app.post("/webhook/alert", async (req, res) => {
  const payload = req.body;

  console.log(`Received alert: ${JSON.stringify(payload)}`);

  // Build a clear description of the alert for the routine
  const alertText = [
    "ALERT RECEIVED - Investigate and report findings.",
    "",
    `Alert Name: ${payload.alert_name || "Unknown"}`,
    `Service:    ${payload.service || "Unknown"}`,
    `Severity:   ${payload.severity || "Unknown"}`,
    `Timestamp:  ${payload.timestamp || new Date().toISOString()}`,
    "",
    "Full payload:",
    JSON.stringify(payload, null, 2),
    "",
    "Steps:",
    "1. Check recent deployments to the affected service",
    "2. Look at error logs and stack traces",
    "3. Identify the root cause if possible",
    "4. Suggest a fix or mitigation",
    "5. Write findings to /workspace/investigation.md",
  ].join("\n");

  try {
    const result = await fireRoutine(alertText);

    console.log(`Routine fired. Session: ${result.session_url}`);

    // Return the session URL so the alerting system can link to it
    res.json({
      status: "investigating",
      session_url: result.session_url,
      session_id: result.session_id,
      message: "Routine is investigating the alert. Follow the session URL for progress.",
    });
  } catch (err: any) {
    console.error(`Failed to fire routine: ${err.message}`);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Webhook handler listening on port ${PORT}`);
  console.log(`POST http://localhost:${PORT}/webhook/alert to fire routines`);
});
