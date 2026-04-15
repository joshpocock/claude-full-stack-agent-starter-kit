"use client";

import type { BoardTask } from "@/lib/types";
import SessionEventLog from "./SessionEventLog";

interface TaskCardProps {
  task: BoardTask;
  onDragStart: (e: React.DragEvent, taskId: number) => void;
}

const statusColors: Record<string, string> = {
  todo: "#555555",
  in_progress: "#ba9926",
  done: "#4caf50",
  failed: "#ef5350",
};

const statusLabels: Record<string, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
  failed: "Failed",
};

export default function TaskCard({ task, onDragStart }: TaskCardProps) {
  const streamUrl =
    task.status === "in_progress" ? `/api/board/${task.id}/stream` : null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      style={{
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: 8,
        padding: 14,
        cursor: "grab",
        transition: "border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#3a3a3a";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#2a2a2a";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0, flex: 1 }}>
          {task.title}
        </h4>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#000",
            background: statusColors[task.status] || "#555",
            padding: "2px 8px",
            borderRadius: 10,
            marginLeft: 8,
            whiteSpace: "nowrap",
          }}
        >
          {statusLabels[task.status] || task.status}
        </span>
      </div>

      {task.description && (
        <p
          style={{
            fontSize: 13,
            color: "#a0a0a0",
            margin: 0,
            marginBottom: streamUrl ? 10 : 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {task.description}
        </p>
      )}

      {streamUrl && <SessionEventLog streamUrl={streamUrl} compact />}

      {task.status === "done" && task.result && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "#a0a0a0",
            background: "#111",
            borderRadius: 6,
            padding: 8,
            maxHeight: 100,
            overflowY: "auto",
            fontFamily: "monospace",
          }}
        >
          {task.result}
        </div>
      )}
    </div>
  );
}
