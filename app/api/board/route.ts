import { NextResponse } from "next/server";
import { getTasks, createTask } from "@/lib/db";

/**
 * GET /api/board
 * List all board tasks from the local SQLite database.
 * Returns tasks ordered by creation date (newest first).
 */
export async function GET() {
  try {
    const tasks = getTasks();
    return NextResponse.json(tasks);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to list tasks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/board
 * Create a new task on the board.
 *
 * Body: {
 *   title: string,
 *   description: string,
 *   agent_id?: string,
 *   environment_id?: string
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, agent_id, environment_id } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "title and description are required" },
        { status: 400 }
      );
    }

    const task = createTask({ title, description, agent_id, environment_id });
    return NextResponse.json(task, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
