"use client";

import { useEffect, useState } from "react";

interface CostData {
  inputTokens: number;
  outputTokens: number;
  model: string;
  sessionStartTime: string | null;
}

/**
 * Tracks token usage from an SSE stream of Managed Agents session events.
 *
 * Reads real token counts from `span.model_request_end` events (which carry
 * `model_usage` with exact input/output tokens). Also estimates from
 * `agent.message` text content as a fallback when model spans haven't arrived.
 */
export function useCostTracker(streamUrl: string | null): CostData {
  const [inputTokens, setInputTokens] = useState(0);
  const [outputTokens, setOutputTokens] = useState(0);
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!streamUrl) return;

    setInputTokens(0);
    setOutputTokens(0);
    setSessionStartTime(new Date().toISOString());

    const source = new EventSource(streamUrl);

    // Track whether we've received real usage from model spans.
    // If so, prefer those numbers over content-based estimates.
    let hasRealUsage = false;

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const type = data.type || "";

        // Real token counts from model request completion
        if (type === "span.model_request_end" && data.model_usage) {
          hasRealUsage = true;
          const usage = data.model_usage;
          setInputTokens((prev) => prev + (usage.input_tokens || 0));
          setOutputTokens((prev) => prev + (usage.output_tokens || 0));
          return;
        }

        // Fallback: estimate from agent message text
        if (type === "agent.message" && !hasRealUsage) {
          const content = data.content as
            | Array<{ type?: string; text?: string }>
            | undefined;
          if (Array.isArray(content)) {
            const chars = content
              .filter((c) => c.type === "text" && c.text)
              .reduce((sum, c) => sum + (c.text?.length || 0), 0);
            setOutputTokens((prev) => prev + Math.ceil(chars / 4));
          }
        }

        // Estimate input from user message
        if (type === "user.message" && !hasRealUsage) {
          const content = data.content as
            | Array<{ type?: string; text?: string }>
            | undefined;
          if (Array.isArray(content)) {
            const chars = content
              .filter((c) => c.type === "text" && c.text)
              .reduce((sum, c) => sum + (c.text?.length || 0), 0);
            setInputTokens((prev) => prev + Math.ceil(chars / 4));
          }
        }

        // Pick up model name if available
        if (type === "span.model_request_start" && data.model) {
          setModel(data.model);
        }
      } catch {
        // skip malformed events
      }
    };

    // Also listen for named events (SSE `event:` field)
    const namedHandler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.model_usage) {
          hasRealUsage = true;
          setInputTokens((prev) => prev + (data.model_usage.input_tokens || 0));
          setOutputTokens(
            (prev) => prev + (data.model_usage.output_tokens || 0)
          );
        }
      } catch {
        // skip
      }
    };
    source.addEventListener("span.model_request_end", namedHandler);

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.removeEventListener("span.model_request_end", namedHandler);
      source.close();
    };
  }, [streamUrl]);

  return {
    inputTokens,
    outputTokens,
    model,
    sessionStartTime,
  };
}
