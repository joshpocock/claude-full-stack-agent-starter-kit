"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Agent } from "@/lib/types";
import AgentForm, { type AgentFormData } from "@/components/AgentForm";
import Modal from "@/components/Modal";

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/agents/${agentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Agent | null) => setAgent(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agentId]);

  const handleUpdate = async (data: AgentFormData) => {
    const body = {
      name: data.name,
      description: data.description || undefined,
      model: data.model,
      system: data.system || undefined,
      tools: data.tools.map((t) => ({ type: t })),
      mcp_servers: data.mcp_servers.length > 0 ? data.mcp_servers : undefined,
    };

    const res = await fetch(`/api/agents/${agentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated = await res.json();
      setAgent(updated);
      setEditing(false);
    } else {
      const err = await res.text();
      alert(`Failed to update: ${err}`);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/agents");
      } else {
        alert("Failed to delete agent");
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <p style={{ color: "#a0a0a0" }}>Loading agent...</p>;
  }

  if (!agent) {
    return <p style={{ color: "#a0a0a0" }}>Agent not found.</p>;
  }

  const infoRowStyle: React.CSSProperties = {
    display: "flex",
    padding: "12px 0",
    borderBottom: "1px solid #222",
  };

  const labelStyle: React.CSSProperties = {
    width: 140,
    color: "#a0a0a0",
    fontSize: 13,
    fontWeight: 500,
    flexShrink: 0,
  };

  if (editing) {
    return (
      <div style={{ maxWidth: 640 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            Edit Agent
          </h1>
          <button
            onClick={() => setEditing(false)}
            style={{
              background: "none",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              color: "#a0a0a0",
              padding: "8px 16px",
              fontSize: 13,
            }}
          >
            Cancel
          </button>
        </div>
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: 8,
            padding: 24,
          }}
        >
          <AgentForm
            initialData={agent}
            onSubmit={handleUpdate}
            submitLabel="Save Changes"
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          {agent.name}
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setEditing(true)}
            style={{
              background: "none",
              border: "1px solid #ba9926",
              borderRadius: 6,
              color: "#ba9926",
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Edit
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            style={{
              background: "none",
              border: "1px solid #ef5350",
              borderRadius: 6,
              color: "#ef5350",
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <div style={infoRowStyle}>
          <span style={labelStyle}>ID</span>
          <span style={{ fontFamily: "monospace", fontSize: 13 }}>
            {agent.id}
          </span>
        </div>
        <div style={infoRowStyle}>
          <span style={labelStyle}>Model</span>
          <span
            style={{
              background: "#222",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 13,
              fontFamily: "monospace",
            }}
          >
            {agent.model}
          </span>
        </div>
        <div style={infoRowStyle}>
          <span style={labelStyle}>Description</span>
          <span style={{ color: agent.description ? "#fff" : "#666" }}>
            {agent.description || "None"}
          </span>
        </div>
        <div style={infoRowStyle}>
          <span style={labelStyle}>System Prompt</span>
          <span
            style={{
              color: agent.system ? "#fff" : "#666",
              whiteSpace: "pre-wrap",
              fontSize: 13,
              flex: 1,
            }}
          >
            {agent.system || "None"}
          </span>
        </div>
        <div style={infoRowStyle}>
          <span style={labelStyle}>Tools</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {agent.tools && agent.tools.length > 0 ? (
              agent.tools.map((tool, i) => (
                <span
                  key={i}
                  style={{
                    background: "#222",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: "monospace",
                  }}
                >
                  {tool.type}
                </span>
              ))
            ) : (
              <span style={{ color: "#666" }}>None</span>
            )}
          </div>
        </div>
        <div style={{ ...infoRowStyle, borderBottom: "none" }}>
          <span style={labelStyle}>MCP Servers</span>
          <div>
            {agent.mcp_servers && agent.mcp_servers.length > 0 ? (
              agent.mcp_servers.map((server, i) => (
                <div
                  key={i}
                  style={{
                    background: "#111",
                    padding: "8px 12px",
                    borderRadius: 6,
                    marginBottom: 6,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "#ba9926", fontWeight: 500 }}>
                    {server.name || "Unnamed"}
                  </span>
                  <br />
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: "#a0a0a0",
                    }}
                  >
                    {server.url}
                  </span>
                </div>
              ))
            ) : (
              <span style={{ color: "#666" }}>None</span>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 24,
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          Recent Sessions
        </h2>
        <p style={{ color: "#666", fontSize: 14 }}>
          No sessions recorded for this agent yet.
        </p>
      </div>

      <Modal
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Delete Agent"
      >
        <p style={{ color: "#a0a0a0", marginBottom: 20, fontSize: 14 }}>
          Are you sure you want to delete <strong>{agent.name}</strong>? This
          action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={() => setDeleteConfirm(false)}
            style={{
              background: "none",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              color: "#a0a0a0",
              padding: "8px 16px",
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: "#ef5350",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
