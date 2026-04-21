import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";

/**
 * GET /api/sessions/:id/replay
 * Fetches all events for a session and returns them with timing data
 * for the replay timeline UI.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getClient();

    // Fetch session details
    let session;
    try {
      session = await client.beta.sessions.retrieve(id);
    } catch {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Fetch events for the session
    let events: Array<Record<string, unknown>> = [];
    try {
      const rawEvents: Array<Record<string, unknown>> = [];
      const page = (await (client.beta as any).sessions.events.list(id, {})) as any;
      if (Array.isArray(page?.data)) {
        rawEvents.push(...page.data);
      } else if (page && typeof page[Symbol.asyncIterator] === "function") {
        for await (const ev of page as AsyncIterable<Record<string, unknown>>) {
          rawEvents.push(ev);
        }
      }

      // Process Managed Agents session events into replay-friendly format
      let baseTime: number | null = null;
      events = rawEvents.map((event, index) => {
        const timestamp =
          (event.processed_at as string) ||
          (event.created_at as string) ||
          new Date().toISOString();
        const eventTime = new Date(timestamp).getTime();

        if (baseTime === null) baseTime = eventTime;
        const offsetMs = eventTime - (baseTime || 0);

        let eventType = "status";
        let description = "";
        const detail = event;

        const type = event.type as string;
        const firstText = (): string => {
          const content = event.content as Array<Record<string, unknown>> | undefined;
          if (!Array.isArray(content)) return "";
          const block = content.find((c) => c.type === "text");
          return (block?.text as string) || "";
        };

        if (type === "user.message") {
          eventType = "text";
          description = firstText() || "User message";
        } else if (type === "agent.message") {
          eventType = "text";
          description = firstText() || "Agent message";
        } else if (type === "agent.thinking") {
          eventType = "status";
          description = "Agent thinking";
        } else if (
          type === "agent.tool_use" ||
          type === "agent.mcp_tool_use" ||
          type === "agent.custom_tool_use"
        ) {
          eventType = "tool_use";
          description = `Tool: ${(event.name as string) || (event.tool_name as string) || "unknown"}`;
        } else if (
          type === "agent.tool_result" ||
          type === "agent.mcp_tool_result"
        ) {
          eventType = "tool_use";
          description = "Tool result";
        } else if (type === "span.model_request_start") {
          eventType = "status";
          description = "Model request started";
        } else if (type === "span.model_request_end") {
          eventType = "status";
          const usage = event.model_usage as Record<string, number> | undefined;
          const inTok = usage?.input_tokens ?? 0;
          const outTok = usage?.output_tokens ?? 0;
          description = `Model request done · ${inTok} in / ${outTok} out`;
        } else if (type === "session.status_running") {
          eventType = "status";
          description = "Session running";
        } else if (type === "session.status_idle") {
          eventType = "status";
          description = "Session idle";
        } else if (type === "session.status_terminated") {
          eventType = "status";
          description = "Session terminated";
        } else if (type === "session.status_rescheduled") {
          eventType = "status";
          description = "Session rescheduled";
        } else if (type === "user.interrupt") {
          eventType = "status";
          description = "Interrupt";
        } else if (type === "session.error") {
          eventType = "error";
          description =
            ((event.error as Record<string, unknown>)?.message as string) ||
            (event.message as string) ||
            "Session error";
        } else {
          description = type || "Event";
        }

        return {
          id: (event.id as string) || `event-${index}`,
          index,
          type: eventType,
          rawType: type,
          description,
          timestamp,
          offsetMs,
          detail,
        };
      });
    } catch {
      // Events may not be available
    }

    // Calculate duration
    let durationMs = 0;
    if (events.length > 1) {
      const first = events[0].offsetMs as number;
      const last = events[events.length - 1].offsetMs as number;
      durationMs = last - first;
    }

    // Estimate token count from events
    let tokenEstimate = 0;
    for (const event of events) {
      if ((event.type as string) === "text") {
        tokenEstimate += Math.ceil(
          ((event.description as string) || "").length / 4
        );
      }
    }

    const s = session as unknown as Record<string, unknown>;
    const agentObj = s.agent as Record<string, unknown> | undefined;
    const envObj = s.environment as Record<string, unknown> | undefined;
    return NextResponse.json({
      session: {
        id: (s.id as string) || id,
        agent_id: (agentObj?.id as string) || (s.agent_id as string) || null,
        environment_id:
          (envObj?.id as string) || (s.environment_id as string) || null,
        status: (s.status as string) || "unknown",
        created_at: s.created_at as string,
        updated_at: s.updated_at as string,
        archived_at: s.archived_at as string | null,
        durationMs,
        tokenEstimate,
      },
      events,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch replay data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
