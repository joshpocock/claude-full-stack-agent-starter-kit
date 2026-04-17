"use client";

import Link from "next/link";
import Markdown from "@/components/Markdown";
import {
  Circle,
  Loader,
  CheckCircle,
  XCircle,
  ExternalLink,
  MessageSquare,
  Play,
} from "lucide-react";
import type { BoardTask } from "@/lib/types";
import SessionEventLog from "./SessionEventLog";
import CostTicker from "./CostTicker";
import { useCostTracker } from "@/lib/useCostTracker";

interface TaskCardProps {
  task: BoardTask;
  onDragStart: (e: React.DragEvent, taskId: number) => void;
  onStart?: (taskId: number) => void;
}

const statusConfig: Record<
  string,
  { color: string; icon: typeof Circle; label: string }
> = {
  todo: { color: "var(--text-muted)", icon: Circle, label: "Todo" },
  in_progress: {
    color: "var(--accent)",
    icon: Loader,
    label: "In Progress",
  },
  done: { color: "var(--success)", icon: CheckCircle, label: "Done" },
  failed: { color: "var(--error)", icon: XCircle, label: "Failed" },
};

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeBlock: string[] = [];

  const flushCode = (i: number) => {
    if (codeBlock.length > 0) {
      elements.push(
        <pre
          key={`code-${i}`}
          style={{
            margin: "6px 0",
            padding: 8,
            background: "var(--bg-primary)",
            borderRadius: 6,
            fontSize: 12,
            lineHeight: 1.5,
            overflow: "auto",
            whiteSpace: "pre",
          }}
        >
          {codeBlock.join("\n")}
        </pre>
      );
      codeBlock = [];
    }
  };

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (inCode) {
        flushCode(i);
        inCode = false;
      } else {
        inCode = true;
      }
      return;
    }
    if (inCode) {
      codeBlock.push(line);
      return;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <div
          key={i}
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginTop: 10,
            marginBottom: 4,
            color: "var(--text-primary)",
          }}
        >
          {line.replace("## ", "")}
        </div>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <div
          key={i}
          style={{
            fontSize: 14,
            fontWeight: 700,
            marginTop: 10,
            marginBottom: 4,
            color: "var(--text-primary)",
          }}
        >
          {line.replace("# ", "")}
        </div>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <div
          key={i}
          style={{
            paddingLeft: 12,
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: "var(--accent)", marginRight: 4 }}>-</span>
          {line.replace(/^- /, "")}
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: 4 }} />);
    } else {
      elements.push(
        <div
          key={i}
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          {line}
        </div>
      );
    }
  });
  flushCode(lines.length);
  return elements;
}

export default function TaskCard({ task, onDragStart, onStart }: TaskCardProps) {
  const streamUrl =
    task.status === "in_progress" ? `/api/board/${task.id}/stream` : null;

  const costData = useCostTracker(streamUrl);
  const config = statusConfig[task.status] || statusConfig.todo;
  const StatusIcon = config.icon;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: 10,
        padding: 14,
        cursor: "grab",
        transition: "border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          "var(--border-dashed)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          "var(--border-color)";
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
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: config.color,
            padding: "2px 8px",
            borderRadius: 10,
            marginLeft: 8,
            whiteSpace: "nowrap",
            background: "var(--bg-badge)",
          }}
        >
          <StatusIcon size={12} />
          {config.label}
        </span>
      </div>

      {task.description && (
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
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

      {/* Run button for todo tasks with an agent assigned */}
      {task.status === "todo" && task.agent_id && onStart && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStart(task.id);
          }}
          className="btn-primary"
          style={{
            width: "100%",
            marginTop: 8,
            marginBottom: 4,
            padding: "7px 0",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Play size={14} />
          Run
        </button>
      )}

      {/* Hint when no agent assigned */}
      {task.status === "todo" && !task.agent_id && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "var(--text-muted)",
            fontStyle: "italic",
          }}
        >
          Assign an agent to run this task
        </div>
      )}

      {streamUrl && <SessionEventLog streamUrl={streamUrl} compact />}

      {streamUrl && (
        <CostTicker
          inputTokens={costData.inputTokens}
          outputTokens={costData.outputTokens}
          model={costData.model}
          sessionStartTime={costData.sessionStartTime}
          compact
        />
      )}

      {/* Result — rendered as markdown */}
      {task.status === "done" && task.result && (
        <div
          style={{
            marginTop: 10,
            background: "var(--bg-input)",
            borderRadius: 8,
            padding: 10,
            maxHeight: 160,
            overflowY: "auto",
          }}
        >
          <Markdown content={task.result} />
        </div>
      )}

      {/* Failed result */}
      {task.status === "failed" && task.result && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "var(--error)",
            background: "rgba(239, 68, 68, 0.06)",
            borderRadius: 8,
            padding: 10,
          }}
        >
          {task.result}
        </div>
      )}

      {/* Action links: View session + Continue in chat */}
      {task.session_id && (
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <Link
            href={`/sessions/${task.session_id}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "var(--text-secondary)",
              textDecoration: "none",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={12} />
            View session
          </Link>
          {(task.status === "done" || task.status === "failed") && (
            <Link
              href={`/chat?session=${task.session_id}&agent=${task.agent_id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                color: "var(--accent)",
                textDecoration: "none",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <MessageSquare size={12} />
              Continue in chat
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
