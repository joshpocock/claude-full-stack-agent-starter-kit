"""
07 - API-Triggered Routine (Flask Webhook Handler)

Shows how to wire a Claude routine into an alerting system. This Flask
server receives webhook payloads from monitoring tools (Datadog, Sentry,
PagerDuty, etc.) and forwards them to a routine that investigates the alert.

The flow:
  1. Alert fires in Datadog/Sentry/PagerDuty
  2. Webhook hits this server at POST /webhook/alert
  3. Server extracts the alert details and fires a routine
  4. Routine investigates the issue (checks logs, traces, code)
  5. Returns a session URL for the team to follow along

When to use routines vs managed agents:
  - Routines: Quick, pre-configured tasks. One API call to fire. Best for
    well-defined automations that always do the same type of work.
  - Managed Agents: Full control over the agent's config, environment, and
    session lifecycle. Best when you need custom tooling, persistent state,
    or multi-turn conversations.

Run: python webhook-handler.py
Test: curl -X POST http://localhost:5000/webhook/alert \
        -H "content-type: application/json" \
        -d '{"alert_name": "High Error Rate", "service": "api-gateway", "severity": "critical"}'

Install dependencies: pip install flask httpx

Routines use a different beta header than Managed Agents:
  Routines:       experimental-cc-routine-2026-04-01
  Managed Agents: managed-agents-2026-04-01
"""

import json
import os
from datetime import datetime

import httpx
from flask import Flask, jsonify, request

app = Flask(__name__)

# Your routine's trigger ID from claude.ai/code/routines
TRIGGER_ID = "trigger_alert_handler_456"
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
BASE_URL = "https://api.anthropic.com"


def fire_routine(text: str) -> dict:
    """
    Fire a routine with the given text payload.

    API: POST /v1/claude_code/routines/{trigger_id}/fire
    Beta header: experimental-cc-routine-2026-04-01
    """
    response = httpx.post(
        f"{BASE_URL}/v1/claude_code/routines/{TRIGGER_ID}/fire",
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "content-type": "application/json",
            # Routines require their own beta header
            "anthropic-beta": "experimental-cc-routine-2026-04-01",
        },
        json={"text": text},
    )
    response.raise_for_status()
    return response.json()


@app.post("/webhook/alert")
def handle_alert():
    """
    Webhook endpoint: receives alerts and fires the investigation routine.

    Accepts any JSON payload. Extracts key fields and formats them into
    a clear prompt for the routine. The routine is pre-configured at
    claude.ai/code/routines with instructions for investigating alerts.
    """
    payload = request.get_json()

    print(f"Received alert: {json.dumps(payload)}")

    # Build a clear description of the alert for the routine
    alert_text = "\n".join([
        "ALERT RECEIVED - Investigate and report findings.",
        "",
        f"Alert Name: {payload.get('alert_name', 'Unknown')}",
        f"Service:    {payload.get('service', 'Unknown')}",
        f"Severity:   {payload.get('severity', 'Unknown')}",
        f"Timestamp:  {payload.get('timestamp', datetime.now().isoformat())}",
        "",
        "Full payload:",
        json.dumps(payload, indent=2),
        "",
        "Steps:",
        "1. Check recent deployments to the affected service",
        "2. Look at error logs and stack traces",
        "3. Identify the root cause if possible",
        "4. Suggest a fix or mitigation",
        "5. Write findings to /workspace/investigation.md",
    ])

    try:
        result = fire_routine(alert_text)
        print(f"Routine fired. Session: {result['session_url']}")

        # Return the session URL so the alerting system can link to it
        return jsonify({
            "status": "investigating",
            "session_url": result["session_url"],
            "session_id": result["session_id"],
            "message": (
                "Routine is investigating the alert. "
                "Follow the session URL for progress."
            ),
        })

    except httpx.HTTPStatusError as err:
        print(f"Failed to fire routine: {err}")
        return jsonify({
            "status": "error",
            "message": str(err),
        }), 500


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Webhook handler listening on port {port}")
    print(f"POST http://localhost:{port}/webhook/alert to fire routines")
    app.run(host="0.0.0.0", port=port)
