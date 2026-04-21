import Database from "better-sqlite3";
import path from "path";
import type { BoardTask, ChatSession } from "./types";

// ---------------------------------------------------------------------------
// Database singleton
// ---------------------------------------------------------------------------

let db: Database.Database | null = null;

/**
 * Returns the SQLite database instance, creating tables on first call.
 */
export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), "data", "app.db");

    // Ensure the data directory exists
    const fs = require("fs");
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");

    // Create tables if they do not exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        chat_id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        environment_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS board_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'todo',
        agent_id TEXT,
        environment_id TEXT,
        session_id TEXT,
        result TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS routines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        routine_id TEXT NOT NULL,
        token TEXT NOT NULL,
        description TEXT,
        trigger_type TEXT DEFAULT 'api',
        cron_schedule TEXT,
        last_fired_at TEXT,
        last_session_url TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS routine_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        routine_id INTEGER NOT NULL,
        routine_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'success',
        session_id TEXT,
        session_url TEXT,
        error TEXT,
        fired_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS mcp_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        method TEXT NOT NULL,
        tool_name TEXT,
        request TEXT,
        response TEXT,
        duration_ms INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Best-effort migrations for databases created before a column existed.
    // SQLite lacks "ADD COLUMN IF NOT EXISTS", so we swallow the duplicate error.
    try {
      db.exec("ALTER TABLE routines ADD COLUMN cron_schedule TEXT");
    } catch {
      // column already exists
    }
  }
  return db;
}

// ---------------------------------------------------------------------------
// App settings helpers
// ---------------------------------------------------------------------------

export function getSetting(key: string): string | undefined {
  const row = getDb()
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(key, value);
}

export function deleteSetting(key: string): void {
  getDb().prepare("DELETE FROM app_settings WHERE key = ?").run(key);
}

export function getAllSettings(): Record<string, string> {
  const rows = getDb()
    .prepare("SELECT key, value FROM app_settings")
    .all() as Array<{ key: string; value: string }>;
  const result: Record<string, string> = {};
  for (const row of rows) result[row.key] = row.value;
  return result;
}

// ---------------------------------------------------------------------------
// Chat session helpers
// ---------------------------------------------------------------------------

/**
 * Look up a chat session by its local chat_id.
 */
export function getChatSession(chatId: string): ChatSession | undefined {
  const row = getDb()
    .prepare("SELECT * FROM chat_sessions WHERE chat_id = ?")
    .get(chatId) as ChatSession | undefined;
  return row;
}

/**
 * Store a new mapping from local chat_id to Anthropic session_id.
 */
export function insertChatSession(session: {
  chat_id: string;
  agent_id: string;
  environment_id: string;
  session_id: string;
}): void {
  getDb()
    .prepare(
      `INSERT INTO chat_sessions (chat_id, agent_id, environment_id, session_id)
       VALUES (@chat_id, @agent_id, @environment_id, @session_id)`
    )
    .run(session);
}

/**
 * Return all chat sessions, ordered newest first.
 */
export function getAllChatSessions(): ChatSession[] {
  return getDb()
    .prepare("SELECT * FROM chat_sessions ORDER BY created_at DESC")
    .all() as ChatSession[];
}

/**
 * Delete a chat session by chat_id.
 */
export function deleteChatSession(chatId: string): boolean {
  const result = getDb()
    .prepare("DELETE FROM chat_sessions WHERE chat_id = ?")
    .run(chatId);
  return result.changes > 0;
}

// ---------------------------------------------------------------------------
// Board task helpers
// ---------------------------------------------------------------------------

/**
 * Return all board tasks, ordered newest first.
 */
export function getTasks(): BoardTask[] {
  return getDb()
    .prepare("SELECT * FROM board_tasks ORDER BY created_at DESC")
    .all() as BoardTask[];
}

/**
 * Get a single task by ID.
 */
export function getTask(id: number): BoardTask | undefined {
  return getDb()
    .prepare("SELECT * FROM board_tasks WHERE id = ?")
    .get(id) as BoardTask | undefined;
}

/**
 * Create a new task and return it.
 */
export function createTask(task: {
  title: string;
  description: string;
  agent_id?: string;
  environment_id?: string;
}): BoardTask {
  const stmt = getDb().prepare(
    `INSERT INTO board_tasks (title, description, agent_id, environment_id)
     VALUES (@title, @description, @agent_id, @environment_id)`
  );
  const info = stmt.run({
    title: task.title,
    description: task.description,
    agent_id: task.agent_id ?? null,
    environment_id: task.environment_id ?? null,
  });
  return getTask(info.lastInsertRowid as number)!;
}

/**
 * Update one or more fields on a task. Automatically bumps updated_at.
 */
export function updateTask(
  id: number,
  updates: Partial<Pick<BoardTask, "status" | "session_id" | "result" | "agent_id" | "environment_id">>
): BoardTask | undefined {
  const fields: string[] = [];
  const values: Record<string, unknown> = { id };

  if (updates.status !== undefined) {
    fields.push("status = @status");
    values.status = updates.status;
  }
  if (updates.session_id !== undefined) {
    fields.push("session_id = @session_id");
    values.session_id = updates.session_id;
  }
  if (updates.result !== undefined) {
    fields.push("result = @result");
    values.result = updates.result;
  }
  if (updates.agent_id !== undefined) {
    fields.push("agent_id = @agent_id");
    values.agent_id = updates.agent_id;
  }
  if (updates.environment_id !== undefined) {
    fields.push("environment_id = @environment_id");
    values.environment_id = updates.environment_id;
  }

  if (fields.length === 0) return getTask(id);

  fields.push("updated_at = datetime('now')");

  getDb()
    .prepare(`UPDATE board_tasks SET ${fields.join(", ")} WHERE id = @id`)
    .run(values);

  return getTask(id);
}

/**
 * Delete a task by ID. Returns true if a row was removed.
 */
export function deleteTask(id: number): boolean {
  const result = getDb()
    .prepare("DELETE FROM board_tasks WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

// ---------------------------------------------------------------------------
// Routine helpers
// ---------------------------------------------------------------------------

export interface Routine {
  id: number;
  name: string;
  routine_id: string;
  token: string;
  description: string | null;
  trigger_type: string;
  cron_schedule: string | null;
  last_fired_at: string | null;
  last_session_url: string | null;
  created_at: string;
}

/**
 * Return all routines, ordered newest first.
 */
export function getRoutines(): Routine[] {
  return getDb()
    .prepare("SELECT * FROM routines ORDER BY created_at DESC")
    .all() as Routine[];
}

/**
 * Get a single routine by ID.
 */
export function getRoutine(id: number): Routine | undefined {
  return getDb()
    .prepare("SELECT * FROM routines WHERE id = ?")
    .get(id) as Routine | undefined;
}

/**
 * Create a new routine and return it.
 */
export function createRoutine(routine: {
  name: string;
  routine_id: string;
  token: string;
  description?: string;
  trigger_type?: string;
  cron_schedule?: string | null;
}): Routine {
  const stmt = getDb().prepare(
    `INSERT INTO routines (name, routine_id, token, description, trigger_type, cron_schedule)
     VALUES (@name, @routine_id, @token, @description, @trigger_type, @cron_schedule)`
  );
  const info = stmt.run({
    name: routine.name,
    routine_id: routine.routine_id,
    token: routine.token,
    description: routine.description ?? null,
    trigger_type: routine.trigger_type ?? "api",
    cron_schedule: routine.cron_schedule ?? null,
  });
  return getRoutine(info.lastInsertRowid as number)!;
}

/**
 * Update a routine.
 */
export function updateRoutine(
  id: number,
  updates: Partial<Pick<Routine, "name" | "routine_id" | "token" | "description" | "trigger_type" | "cron_schedule">>
): Routine | undefined {
  const fields: string[] = [];
  const values: Record<string, unknown> = { id };

  for (const key of ["name", "routine_id", "token", "description", "trigger_type", "cron_schedule"] as const) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = @${key}`);
      values[key] = updates[key];
    }
  }

  if (fields.length === 0) return getRoutine(id);

  getDb()
    .prepare(`UPDATE routines SET ${fields.join(", ")} WHERE id = @id`)
    .run(values);

  return getRoutine(id);
}

/**
 * Update last fired metadata for a routine.
 */
export function updateRoutineLastFired(
  id: number,
  lastFiredAt: string,
  lastSessionUrl: string
): void {
  getDb()
    .prepare(
      "UPDATE routines SET last_fired_at = @last_fired_at, last_session_url = @last_session_url WHERE id = @id"
    )
    .run({ id, last_fired_at: lastFiredAt, last_session_url: lastSessionUrl });
}

/**
 * Delete a routine by ID. Returns true if a row was removed.
 */
export function deleteRoutine(id: number): boolean {
  const result = getDb()
    .prepare("DELETE FROM routines WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

// ---------------------------------------------------------------------------
// Routine run tracking
// ---------------------------------------------------------------------------

export interface RoutineRun {
  id: number;
  routine_id: number;
  routine_name: string;
  status: "success" | "error";
  session_id: string | null;
  session_url: string | null;
  error: string | null;
  fired_at: string;
}

export function logRoutineRun(run: {
  routine_id: number;
  routine_name: string;
  status: "success" | "error";
  session_id?: string;
  session_url?: string;
  error?: string;
}): void {
  getDb()
    .prepare(
      `INSERT INTO routine_runs (routine_id, routine_name, status, session_id, session_url, error)
       VALUES (@routine_id, @routine_name, @status, @session_id, @session_url, @error)`
    )
    .run({
      routine_id: run.routine_id,
      routine_name: run.routine_name,
      status: run.status,
      session_id: run.session_id ?? null,
      session_url: run.session_url ?? null,
      error: run.error ?? null,
    });
}

export function getRoutineRuns(opts?: {
  routineId?: number;
  since?: string;
  limit?: number;
}): RoutineRun[] {
  let sql = "SELECT * FROM routine_runs WHERE 1=1";
  const params: Record<string, unknown> = {};

  if (opts?.routineId) {
    sql += " AND routine_id = @routine_id";
    params.routine_id = opts.routineId;
  }
  if (opts?.since) {
    sql += " AND fired_at >= @since";
    params.since = opts.since;
  }
  sql += " ORDER BY fired_at DESC";
  if (opts?.limit) {
    sql += ` LIMIT ${opts.limit}`;
  }

  return getDb().prepare(sql).all(params) as RoutineRun[];
}

export function getTodayRunCount(): number {
  const today = new Date().toISOString().split("T")[0];
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) as count FROM routine_runs WHERE fired_at >= @today"
    )
    .get({ today: `${today}T00:00:00` }) as { count: number };
  return row?.count ?? 0;
}

// ---------------------------------------------------------------------------
// MCP log helpers
// ---------------------------------------------------------------------------

export interface McpLog {
  id: number;
  agent_id: string;
  method: string;
  tool_name: string | null;
  request: string | null;
  response: string | null;
  duration_ms: number | null;
  created_at: string;
}

export function logMcpCall(entry: {
  agent_id: string;
  method: string;
  tool_name?: string;
  request?: string;
  response?: string;
  duration_ms?: number;
}): void {
  getDb()
    .prepare(
      `INSERT INTO mcp_logs (agent_id, method, tool_name, request, response, duration_ms)
       VALUES (@agent_id, @method, @tool_name, @request, @response, @duration_ms)`
    )
    .run({
      agent_id: entry.agent_id,
      method: entry.method,
      tool_name: entry.tool_name ?? null,
      request: entry.request ?? null,
      response: entry.response ?? null,
      duration_ms: entry.duration_ms ?? null,
    });
}

export function getMcpLogs(opts?: {
  agentId?: string;
  limit?: number;
}): McpLog[] {
  let sql = "SELECT * FROM mcp_logs WHERE 1=1";
  const params: Record<string, unknown> = {};

  if (opts?.agentId) {
    sql += " AND agent_id = @agent_id";
    params.agent_id = opts.agentId;
  }
  sql += " ORDER BY created_at DESC";
  sql += ` LIMIT ${opts?.limit ?? 50}`;

  return getDb().prepare(sql).all(params) as McpLog[];
}
