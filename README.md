# Stride Agents

An open-source control plane for Claude Managed Agents, Routines, and the full Anthropic cloud automation stack. Built with Next.js 15, TypeScript, and the Anthropic SDK.

## What is this?

Stride Agents is a self-hosted dashboard that wraps Anthropic's Managed Agents API into a production-ready web app. Instead of managing agents, sessions, environments, vaults, and routines through raw API calls or the Anthropic Console, you get a polished UI with features beyond what the console offers.

**Core features:**

- **Agents** - Create, edit (Form + YAML/JSON), version history, per-tool permission controls, clone/delete
- **Sessions** - Transcript + Debug views, event timeline waterfall, live polling, send messages/interrupts/events, archive
- **Environments** - Cloud sandbox config with networking (Limited/Unrestricted), package managers (apt/cargo/gem/go/npm/pip), metadata
- **Chat** - Multi-turn conversations with agents, session resume, conversation history sidebar
- **Task Board** - Queue work for agents, drag-and-drop kanban, markdown results, session links, "Continue in Chat"
- **Skills** - Browse 34,000+ community skills from the Mastra registry, import from GitHub, attach to agents
- **Vaults** - Credential management for agent runtime access
- **Routines** - Fire Claude Code routines via API, run tracking with calendar view, daily usage counter, local cron scheduler worker with Hourly/Daily/Weekdays/Weekly/Custom presets
- **Settings** - API key management (DB or .env), no restart needed
- **Analytics** - Token usage, cost tracking, model breakdown

## Quick Start

### Prerequisites

- **Node.js 22+**
- **pnpm** (recommended) or npm
- **Anthropic API key** with Managed Agents access

### Install and run

```bash
# Clone
git clone https://github.com/joshpocock/stride-agents.git
cd stride-agents

# Install dependencies
pnpm install

# Configure
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
# Or skip this and set it in the Settings page after launch

# Run
pnpm dev
```

Open [http://localhost:3002](http://localhost:3002).

### Alternative: set API key via UI

If you don't want to edit `.env`, just run `pnpm dev` and navigate to **Settings** in the sidebar. Paste your API key there - it's stored in the local SQLite database and takes priority over `.env`. No restart needed.

## Run modes

The app ships with four npm scripts, each for a different layer. Pick the one that matches what you need — they're cumulative, not exclusive.


| Command | Next.js | Cloudflare tunnel | Cron scheduler | When to use |
| --- | :---: | :---: | :---: | --- |
| `pnpm dev` | ✓ | | | Default. Fastest startup. UI + API, nothing else. |
| `pnpm dev:tunnel` | ✓ | ✓ | | Expose your local MCP endpoints to Anthropic (needed so routines on agents can reach tools running on your machine). |
| `pnpm dev:scheduler` | | | ✓ | Run only the cron worker. Assumes Next.js is already running in another terminal. |
| `pnpm dev:all` | ✓ | ✓ | ✓ | Run everything together via `concurrently`. The one-command mode. |


### `pnpm dev`

```bash
pnpm dev
```

Starts Next.js on port 3002. Use this when you're just browsing the UI, editing agents, firing routines manually, or working on the app itself. The lightest setup — no tunnel, no scheduler.

### `pnpm dev:tunnel`

```bash
pnpm dev:tunnel
```

Starts Next.js + a Cloudflare tunnel (via `untun`) and automatically:

1. Stores the public tunnel URL in `app_settings` (`mcp_base_url`)
2. Updates the MCP server URL on every agent that has connected routines

Use this when your agents expose MCP tool endpoints that Anthropic's managed runtime needs to reach — routines firing in the cloud can't hit `localhost:3002`, so they hit the tunnel instead.

### `pnpm dev:scheduler`

```bash
# In terminal 1:
pnpm dev
# In terminal 2:
pnpm dev:scheduler
```

Starts a standalone Node worker (`scripts/scheduler.mjs`) that:

- Polls `/api/routines` every 30s
- Registers every routine with a `cron_schedule` using `node-cron`
- Fires each routine on tick by POSTing to `/api/routines/:id/fire` — the same endpoint the UI hits, so run history and `last_fired_at` are recorded normally
- Reconciles on every poll, so editing a schedule in the UI takes effect without restarting the worker
- Validates cron expressions and logs invalid ones

This worker only runs while your machine is on. That's intentional — a self-hosted tool isn't meant to replace Vercel Cron. If you need always-on schedules, deploy the app and run the worker as a systemd service / background agent on a server you control.

### `pnpm dev:all`

```bash
pnpm dev:all
```

Runs `dev:tunnel` and `dev:scheduler` side-by-side in one terminal using `concurrently`, with color-coded prefixes so you can tell output apart. This is usually what you want once you're actively using scheduled routines with remote MCP.

## Other scripts


| Command      | Description                |
| ------------ | -------------------------- |
| `pnpm build` | Production build           |
| `pnpm start` | Serve the production build |


## Project Structure

```
app/                    # Next.js app router pages
  agents/               # Agent list, detail (tabs: Agent/Sessions), create
  board/                # Task board (kanban with drag-and-drop)
  chat/                 # Multi-turn chat with session resume
  environments/         # Environment list + create (networking, packages, metadata)
  routines/             # Routine dashboard with calendar + run tracking
  sessions/             # Session list (filters) + detail (Transcript/Debug)
  settings/             # API key management
  skills/               # Skills browser (Bundled/Anthropic/GitHub/Library tabs)
  templates/            # Agent template gallery
  vaults/               # Credential vault management
  analytics/            # Usage analytics
  quickstart/           # Guided setup wizard

app/api/                # API routes (proxy to Anthropic SDK)
  agents/               # CRUD + versions
  board/                # Task CRUD + streaming
  chat/                 # Session-backed chat + history
  environments/         # CRUD
  routines/             # CRUD + fire + run tracking
  sessions/             # List, create, events, trace, replay, archive, interrupt
  settings/             # App settings (API key)
  skills/               # Bundled + Anthropic + GitHub import + Mastra library
  vaults/               # CRUD + credentials

components/             # Shared UI components
  AgentEditor.tsx       # Bidirectional Form/YAML/JSON editor
  Modal.tsx, Toast.tsx  # UI primitives
  TaskCard.tsx          # Board task card with Run button + session links
  Sidebar.tsx           # Navigation with theme-aware logo
  TopBar.tsx            # Header with Book button + theme toggle

lib/                    # Shared utilities
  anthropic.ts          # SDK client (reads key from Settings DB > .env)
  db.ts                 # SQLite (chat sessions, tasks, routines, runs, settings)
  types.ts              # TypeScript types matching the Anthropic SDK

reference-scripts/      # Standalone TypeScript/Python examples
  01-basic-agent/       # Agent lifecycle: create, configure, run
  02-deep-researcher/   # Web research with report output
  03-code-reviewer/     # GitHub PR review
  04-scheduled-agent/   # Cron-triggered sessions
  05-multi-environment/ # Same agent, different sandboxes
  06-scheduled-routine/ # Fire a routine on a schedule
  07-api-triggered-routine/ # Webhook-to-routine bridge
  09-chat-agent/        # Standalone chat app (Next.js + Python/Flask)

templates/              # YAML agent configs for the Anthropic Console
docs/claude/            # Local copy of Anthropic platform docs
public/                 # Logos + favicon
```

## How it works

The app is a Next.js frontend that talks to API routes in `app/api/`. Those routes use the `@anthropic-ai/sdk` to call Anthropic's Managed Agents API. Local state (chat history, board tasks, routines, settings) lives in a SQLite database at `data/app.db`.

```
Browser  -->  Next.js API routes  -->  Anthropic SDK  -->  api.anthropic.com
                    |
                SQLite (local state)
```

Key API mappings:


| Stride Agents | Anthropic API                                            |
| ------------- | -------------------------------------------------------- |
| Create agent  | `client.beta.agents.create()`                            |
| Start session | `client.beta.sessions.create({ agent, environment_id })` |
| Send message  | `client.beta.sessions.events.send()`                     |
| Stream events | `client.beta.sessions.events.stream()`                   |
| Fire routine  | `POST /v1/claude_code/routines/{id}/fire`                |


## Two Anthropic products, one dashboard


|             | Managed Agents                                   | Routines                                         |
| ----------- | ------------------------------------------------ | ------------------------------------------------ |
| API         | `/v1/agents`, `/v1/sessions`, `/v1/environments` | `/v1/claude_code/routines/{id}/fire`             |
| Auth        | `x-api-key` (Anthropic API key)                  | `Bearer` (per-routine token, `sk-ant-oat01-...`) |
| Beta header | `managed-agents-2026-04-01`                      | `experimental-cc-routine-2026-04-01`             |
| Billing     | $0.08/session-hour + tokens                      | Subscription (Pro/Max/Team/Enterprise)           |
| Use case    | Production agent apps                            | Developer workflow automation                    |


## Built-in agent tools

Every agent session includes `agent_toolset_20260401`:


| Tool                      | What it does                      |
| ------------------------- | --------------------------------- |
| `bash`                    | Run shell commands in the sandbox |
| `read` / `write` / `edit` | File operations                   |
| `glob` / `grep`           | File search                       |
| `web_search`              | Search the web                    |
| `web_fetch`               | Fetch URL content                 |


You can disable individual tools or set permission policies (always allow / require confirmation) per tool in the agent editor.

## Environment variables


| Variable            | Required | Description                                                                                                                                                     |
| ------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Yes*     | Your Anthropic API key. *Or set via Settings page                                                                                                               |
| `ANTHROPIC_MODEL`   | No       | Override default model (default: `claude-sonnet-4-6`). Set to `claude-opus-4-7` for higher reasoning at ~5× cost, or `claude-haiku-4-5-20251001` for fast/cheap |
| `GITHUB_TOKEN`      | No       | Only needed if you import skills from private GitHub repos or hit rate limits on public ones. Also used by the `03-code-reviewer` reference script              |


## Scheduling routines locally

To have a routine fire on a schedule from your own machine:

1. Create the routine at [claude.ai/code/routines](https://claude.ai/code/routines), add an **API** trigger, and copy the `trig_...` ID + `sk-ant-oat01-...` bearer token.
2. Add it to **Routines** in this app (the Add Routine modal has an optional **Schedule** builder with Hourly / Daily / Weekdays / Weekly / Custom presets; Custom accepts a raw 5-field cron expression).
3. Run `pnpm dev:scheduler` (or `pnpm dev:all` to start everything in one terminal).
4. Switch to the **Calendar** tab on the Routines page to see both historical runs and the next upcoming fires for every scheduled routine.

Cron times on the server are interpreted in your machine's local timezone. The worker only fires while it's running — close the terminal and the schedule pauses.

## Troubleshooting

**"unauthorized" error**: Check your API key in Settings or `.env`.

**"environment_id: Field required"**: Sessions require an environment. Create one at `/environments/new`.

**Agent model shows as `[object Object]*`*: The API returns `model` as `{id, speed}`. This is handled automatically.

**Routine returns 404**: The routine ID must be prefixed `trig_`. Get it from claude.ai/code/routines.

**Routine returns 401**: The bearer token is per-routine (`sk-ant-oat01-...`), not your API key.

**Session takes a long time**: First session after creating an environment provisions the container (30-60s). Subsequent sessions are faster.

**Scheduled routine never fires**: The scheduler worker runs as a separate process. Make sure `pnpm dev:scheduler` (or `pnpm dev:all`) is running — `pnpm dev` alone does not fire schedules.

**Scheduler says "Dev server didn't respond within 60s"**: Start `pnpm dev` first (or use `pnpm dev:all`) so the API is reachable before the worker tries to poll `/api/routines`.

## Reference scripts

The `reference-scripts/` folder contains standalone examples you can run directly:

```bash
# TypeScript
pnpm tsx reference-scripts/01-basic-agent/create-agent.ts

# Python
pip install anthropic
python reference-scripts/01-basic-agent/create-agent.py
```

## Links

- [Managed Agents docs](https://platform.claude.com/docs/en/managed-agents/overview)
- [Routines docs](https://code.claude.com/docs/en/routines)
- [Anthropic Console](https://platform.claude.com)
- [Routines UI](https://claude.ai/code/routines)
- [Stride AI Academy](https://www.skool.com/stride-ai-academy-7057)
- [Executive Stride](https://www.executivestride.com)

## License

MIT