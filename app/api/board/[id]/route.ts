import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";
import { getTask, updateTask, deleteTask } from "@/lib/db";

/**
 * PATCH /api/board/:id
 *
 * Update a task's status or other fields.
 *
 * When status changes to "in_progress", the handler:
 *   1. Creates a new Anthropic session for the task's agent
 *   2. Sends the task description as the first message
 *   3. Stores the session_id on the task for later streaming
 *
 * Body: { status?, result?, agent_id?, environment_id? }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);
    const body = await request.json();
    const { status, result, agent_id, environment_id } = body;

    const task = getTask(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // When transitioning to in_progress, spin up a session and kick it off
    if (status === "in_progress" && task.status !== "in_progress") {
      const effectiveAgentId = agent_id || task.agent_id;
      if (!effectiveAgentId) {
        return NextResponse.json(
          { error: "agent_id is required to start a task" },
          { status: 400 }
        );
      }

      const client = getClient();

      // environment_id is required. Try the request, the task, or fall back to
      // the first non-archived environment.
      let effectiveEnvId = environment_id || task.environment_id;
      if (!effectiveEnvId) {
        try {
          const envResp: any = await (client.beta as any).environments.list();
          const list: any[] = Array.isArray(envResp)
            ? envResp
            : envResp?.data ?? [];
          const first = list.find((e: any) => !e?.archived_at) ?? list[0];
          if (first?.id) effectiveEnvId = first.id;
        } catch {
          // fall through
        }
      }
      if (!effectiveEnvId) {
        return NextResponse.json(
          { error: "environment_id is required. Create one at /environments/new" },
          { status: 400 }
        );
      }

      const session = await client.beta.sessions.create({
        agent: effectiveAgentId,
        environment_id: effectiveEnvId,
      });

      updateTask(taskId, {
        status: "in_progress",
        session_id: session.id,
        agent_id: effectiveAgentId,
        environment_id: effectiveEnvId,
      });

      // Send the task description and stream agent's response (fire and forget)
      (async () => {
        try {
          const streamPromise = (client.beta as any).sessions.events.stream(
            session.id
          );

          await (client.beta as any).sessions.events.send(session.id, {
            events: [
              {
                type: "user.message",
                content: [
                  { type: "text", text: task.description || task.title },
                ],
              },
            ],
          });

          const stream = await streamPromise;
          const chunks: string[] = [];
          const TIMEOUT_MS = 180_000;
          const start = Date.now();
          let sawRunning = false;

          for await (const ev of stream as AsyncIterable<any>) {
            if (Date.now() - start > TIMEOUT_MS) break;

            if (ev?.type === "session.status_running") {
              sawRunning = true;
            }

            if (ev?.type === "agent.message" && Array.isArray(ev.content)) {
              for (const block of ev.content) {
                if (block?.type === "text" && typeof block.text === "string") {
                  chunks.push(block.text);
                }
              }
            }

            // Only break on idle after the agent has started running
            if (ev?.type === "session.status_idle" && sawRunning) break;
            if (ev?.type === "session.error") {
              const errDetail = ev?.error?.message || ev?.message || ev?.description || JSON.stringify(ev?.error || ev);
              throw new Error(errDetail);
            }
            if (ev?.type === "session.deleted") break;
          }

          updateTask(taskId, {
            status: "done",
            result: chunks.join("") || "Completed",
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Agent failed";
          updateTask(taskId, { status: "failed", result: `Agent failed: ${msg}` });
        }
      })();

      const updated = getTask(taskId);
      return NextResponse.json(updated);
    }

    // For other updates, just apply the fields directly
    const updated = updateTask(taskId, {
      ...(status && { status }),
      ...(result !== undefined && { result }),
      ...(agent_id && { agent_id }),
      ...(environment_id && { environment_id }),
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/board/:id
 * Remove a task from the board.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);
    const removed = deleteTask(taskId);

    if (!removed) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
