"use client";

import { useEffect, useRef, useState } from "react";

interface LogEntry {
  type: string;
  text: string;
  timestamp: string;
}

interface SessionEventLogProps {
  streamUrl: string | null;
  compact?: boolean;
}

const typeColors: Record<string, string> = {
  tool_use: "#ba9926",
  text_delta: "#ffffff",
  status: "#66bb6a",
  error: "#ef5350",
};

export default function SessionEventLog({
  streamUrl,
  compact = false,
}: SessionEventLogProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!streamUrl) return;

    setEntries([]);
    const source = new EventSource(streamUrl);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        let type = data.type || "unknown";
        let text = "";

        if (type === "content_block_start" && data.content_block?.type === "tool_use") {
          type = "tool_use";
          text = `Using tool: ${data.content_block.name}`;
        } else if (type === "content_block_delta") {
          if (data.delta?.type === "text_delta") {
            type = "text_delta";
            text = data.delta.text || "";
          } else if (data.delta?.type === "input_json_delta") {
            type = "tool_use";
            text = data.delta.partial_json || "";
          } else {
            return;
          }
        } else if (type === "message_start" || type === "message_stop") {
          type = "status";
          text = type === "message_start" ? "Agent started" : "Agent finished";
        } else if (type === "error") {
          text = data.error?.message || "Unknown error";
        } else {
          return;
        }

        const entry: LogEntry = {
          type,
          text,
          timestamp: new Date().toLocaleTimeString(),
        };

        setEntries((prev) => {
          // For text deltas, append to last entry if same type
          if (
            type === "text_delta" &&
            prev.length > 0 &&
            prev[prev.length - 1].type === "text_delta"
          ) {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              text: updated[updated.length - 1].text + text,
            };
            return updated;
          }
          return [...prev, entry];
        });
      } catch {
        // skip malformed events
      }
    };

    source.onerror = () => {
      setEntries((prev) => [
        ...prev,
        { type: "status", text: "Stream ended", timestamp: new Date().toLocaleTimeString() },
      ]);
      source.close();
    };

    return () => source.close();
  }, [streamUrl]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  const maxHeight = compact ? 160 : 400;

  return (
    <div
      style={{
        background: "#111111",
        borderRadius: 6,
        padding: compact ? 8 : 12,
        maxHeight,
        overflowY: "auto",
        fontSize: compact ? 12 : 13,
        fontFamily: "monospace",
        lineHeight: 1.6,
      }}
    >
      {entries.length === 0 && (
        <span style={{ color: "#666" }}>Waiting for events...</span>
      )}
      {entries.map((entry, i) => (
        <div key={i} style={{ marginBottom: 2 }}>
          {!compact && (
            <span style={{ color: "#666", marginRight: 8 }}>
              {entry.timestamp}
            </span>
          )}
          <span style={{ color: typeColors[entry.type] || "#a0a0a0" }}>
            {entry.type === "tool_use" && !entry.text.startsWith("Using") ? "" : ""}
            {entry.text}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
