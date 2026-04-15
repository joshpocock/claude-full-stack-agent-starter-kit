"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Agent } from "@/lib/types";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Agent[]) => setAgents(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Agents</h1>
        <Link
          href="/agents/new"
          style={{
            background: "#ba9926",
            color: "#000",
            border: "none",
            borderRadius: 6,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Create Agent
        </Link>
      </div>

      {loading ? (
        <p style={{ color: "#a0a0a0" }}>Loading agents...</p>
      ) : agents.length === 0 ? (
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: 8,
            padding: 48,
            textAlign: "center",
          }}
        >
          <p style={{ color: "#a0a0a0", fontSize: 15, marginBottom: 16 }}>
            No agents yet. Create your first agent to get started.
          </p>
          <Link
            href="/agents/new"
            style={{
              color: "#ba9926",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Create Agent
          </Link>
        </div>
      ) : (
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Model</th>
                <th>Description</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr
                  key={agent.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    window.location.href = `/agents/${agent.id}`;
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      "#222";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      "transparent";
                  }}
                >
                  <td style={{ fontWeight: 500 }}>{agent.name}</td>
                  <td>
                    <span
                      style={{
                        background: "#222",
                        padding: "3px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontFamily: "monospace",
                      }}
                    >
                      {agent.model}
                    </span>
                  </td>
                  <td style={{ color: "#a0a0a0" }}>
                    {agent.description || "-"}
                  </td>
                  <td style={{ color: "#666", fontSize: 13 }}>
                    {agent.created_at
                      ? new Date(agent.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
