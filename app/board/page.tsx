"use client";

import { useEffect, useState, useCallback } from "react";
import type { BoardTask, Agent } from "@/lib/types";
import TaskCard from "@/components/TaskCard";
import Modal from "@/components/Modal";

type Column = "todo" | "in_progress" | "done";

const columns: { key: Column; label: string }[] = [
  { key: "todo", label: "Todo" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

const columnHeaderColors: Record<Column, string> = {
  todo: "#555",
  in_progress: "#ba9926",
  done: "#4caf50",
};

export default function BoardPage() {
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAgentId, setNewAgentId] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/board");
      if (res.ok) setTasks(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetch("/api/agents")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Agent[]) => {
        setAgents(data);
        if (data.length > 0) setNewAgentId(data[0].id);
      })
      .catch(() => {});
  }, [fetchTasks]);

  // Poll for task updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData("text/plain", String(taskId));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: Column) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData("text/plain"));
    if (isNaN(taskId)) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );

    try {
      await fetch(`/api/board/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      fetchTasks();
    } catch {
      fetchTasks(); // revert on failure
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const createTask = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          agent_id: newAgentId || undefined,
        }),
      });
      setNewTitle("");
      setNewDesc("");
      setModalOpen(false);
      fetchTasks();
    } catch { /* ignore */ } finally {
      setCreating(false);
    }
  };

  const tasksByColumn = (col: Column) =>
    tasks.filter((t) => {
      if (col === "done") return t.status === "done" || t.status === "failed";
      return t.status === col;
    });

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          Task Board
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            background: "#ba9926",
            color: "#000",
            border: "none",
            borderRadius: 6,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Add Task
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          minHeight: "calc(100vh - 180px)",
        }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.key)}
            style={{
              background: "#0a0a0a",
              borderRadius: 8,
              padding: 16,
              border: "1px solid #1a1a1a",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: columnHeaderColors[col.key],
                }}
              />
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                {col.label}
              </h3>
              <span
                style={{
                  fontSize: 12,
                  color: "#666",
                  marginLeft: "auto",
                }}
              >
                {tasksByColumn(col.key).length}
              </span>
            </div>
            {tasksByColumn(col.key).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onDragStart={handleDragStart}
              />
            ))}
            {tasksByColumn(col.key).length === 0 && (
              <div
                style={{
                  color: "#444",
                  fontSize: 13,
                  textAlign: "center",
                  padding: "24px 0",
                  border: "2px dashed #1a1a1a",
                  borderRadius: 8,
                }}
              >
                Drop tasks here
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Task">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                color: "#a0a0a0",
                marginBottom: 6,
              }}
            >
              Title
            </label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task title"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#111",
                border: "1px solid #2a2a2a",
                borderRadius: 6,
                color: "#fff",
                fontSize: 14,
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                color: "#a0a0a0",
                marginBottom: 6,
              }}
            >
              Description
            </label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="What should the agent do?"
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#111",
                border: "1px solid #2a2a2a",
                borderRadius: 6,
                color: "#fff",
                fontSize: 14,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                color: "#a0a0a0",
                marginBottom: 6,
              }}
            >
              Agent
            </label>
            <select
              value={newAgentId}
              onChange={(e) => setNewAgentId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#111",
                border: "1px solid #2a2a2a",
                borderRadius: 6,
                color: "#fff",
                fontSize: 14,
              }}
            >
              <option value="">No agent assigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={createTask}
            disabled={!newTitle.trim() || creating}
            style={{
              background: "#ba9926",
              color: "#000",
              border: "none",
              borderRadius: 6,
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 600,
              opacity: !newTitle.trim() || creating ? 0.5 : 1,
              alignSelf: "flex-end",
            }}
          >
            {creating ? "Creating..." : "Create Task"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
