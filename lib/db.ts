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
    `);
  }
  return db;
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
