"""
06 - Scheduled Routine

Routines are a separate feature from Managed Agents. While Managed Agents
give you full control over agent configs, environments, and sessions,
Routines are pre-configured automations that you trigger via a simple
/fire endpoint. Think of them as one-shot tasks with built-in scheduling.

This example fires a nightly backlog triage routine that:
1. Pulls open issues from Linear
2. Labels them by priority and category
3. Posts a summary to Slack

The routine itself is configured at claude.ai/code/routines. This script
just fires it and tracks the result.

Run: python routine.py

In production, schedule this with cron or CI:
  0 2 * * * cd /path/to/project && python routine.py

Raw API call (for reference):
  curl -X POST https://api.anthropic.com/v1/claude_code/routines/{trigger_id}/fire \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "content-type: application/json" \
    -H "anthropic-beta: experimental-cc-routine-2026-04-01" \
    -d '{"text": "Run nightly backlog triage for 2026-04-13"}'

Note: Routines use a different beta header than Managed Agents:
  Routines:       experimental-cc-routine-2026-04-01
  Managed Agents: managed-agents-2026-04-01
"""

import os
from datetime import date

import httpx

# Your routine's trigger ID from claude.ai/code/routines
TRIGGER_ID = "trigger_abc123"

API_KEY = os.environ["ANTHROPIC_API_KEY"]
BASE_URL = "https://api.anthropic.com"


def main():
    today = date.today().isoformat()
    print(f"[{today}] Firing nightly backlog triage routine...")

    # -------------------------------------------------------------------
    # Fire the routine
    #
    # Unlike Managed Agents where you create agents, environments, and
    # sessions separately, routines are a single fire-and-forget call.
    # You send text input and get back a session URL to track progress.
    #
    # API: POST /v1/claude_code/routines/{trigger_id}/fire
    # Beta header: experimental-cc-routine-2026-04-01
    # -------------------------------------------------------------------
    response = httpx.post(
        f"{BASE_URL}/v1/claude_code/routines/{TRIGGER_ID}/fire",
        headers={
            "x-api-key": API_KEY,
            "content-type": "application/json",
            # Routines require their own beta header (not the managed-agents one)
            "anthropic-beta": "experimental-cc-routine-2026-04-01",
        },
        json={
            "text": (
                f"Run nightly backlog triage for {today}. "
                "Pull all open issues from Linear, categorize by priority "
                "(critical, high, medium, low), label any unlabeled issues, "
                "and post the summary to #engineering-standup in Slack."
            ),
        },
    )

    response.raise_for_status()
    result = response.json()

    # -------------------------------------------------------------------
    # Handle the response
    #
    # The /fire endpoint returns a session URL where you can track the
    # routine's progress. The routine runs asynchronously, so this script
    # can exit immediately after firing.
    # -------------------------------------------------------------------
    print("Routine fired successfully.")
    print(f"Session URL: {result['session_url']}")
    print(f"Session ID:  {result['session_id']}")
    print(
        "\nThe routine is running in the background. "
        "Visit the session URL to watch progress."
    )


if __name__ == "__main__":
    main()
