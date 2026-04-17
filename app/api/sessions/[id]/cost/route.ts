import { NextResponse } from "next/server";
import { getClient } from "@/lib/anthropic";

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-opus-4-6": { input: 15, output: 75 },
  "claude-haiku-4-5": { input: 0.8, output: 4 },
};

const SESSION_RATE_PER_HOUR = 0.08;

/**
 * GET /api/sessions/:id/cost
 * Returns token usage and estimated cost for a session.
 * Calculates from session messages and runtime.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getClient();

    // Get session details for model and timing
    const session = await client.beta.sessions.retrieve(id);

    // Sum tokens across all span.model_request_end events in this session
    const events: Array<Record<string, unknown>> = [];
    try {
      const page = (await (client.beta as any).sessions.events.list(id, {})) as any;
      if (Array.isArray(page?.data)) {
        events.push(...page.data);
      } else if (page && typeof page[Symbol.asyncIterator] === "function") {
        for await (const ev of page as AsyncIterable<Record<string, unknown>>) {
          events.push(ev);
        }
      }
    } catch {
      // Leave events empty on failure
    }

    let inputTokens = 0;
    let outputTokens = 0;

    for (const ev of events) {
      if (ev.type === "span.model_request_end") {
        const usage = ev.model_usage as Record<string, number> | undefined;
        if (usage) {
          inputTokens += usage.input_tokens || 0;
          outputTokens += usage.output_tokens || 0;
        }
      } else if (ev.type === "agent.message" || ev.type === "user.message") {
        // Fallback: estimate from text if no model_request_end present
        const content = ev.content as Array<{ type?: string; text?: string }> | undefined;
        if (Array.isArray(content)) {
          const textLength = content
            .filter((c) => c.type === "text" && c.text)
            .reduce((sum, c) => sum + (c.text?.length || 0), 0);
          const estimated = Math.ceil(textLength / 4);
          if (ev.type === "user.message") inputTokens += estimated;
          else outputTokens += estimated;
        }
      }
    }

    // Calculate costs
    const model = (session as { model?: string }).model || "claude-sonnet-4-6";
    const pricing = MODEL_PRICING[model] || MODEL_PRICING["claude-sonnet-4-6"];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    // Runtime cost
    const createdAt = (session as { created_at?: string }).created_at;
    let runtimeHours = 0;
    if (createdAt) {
      runtimeHours =
        (Date.now() - new Date(createdAt).getTime()) / 1000 / 3600;
    }
    const runtimeCost = runtimeHours * SESSION_RATE_PER_HOUR;

    const totalCost = inputCost + outputCost + runtimeCost;

    return NextResponse.json({
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      model,
      input_cost: inputCost,
      output_cost: outputCost,
      runtime_cost: runtimeCost,
      total_cost: totalCost,
      created_at: createdAt || null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to calculate cost";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
