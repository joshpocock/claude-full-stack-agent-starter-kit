"use client";

import { useState } from "react";
import type { Agent, McpServer } from "@/lib/types";

interface AgentFormProps {
  initialData?: Partial<Agent>;
  onSubmit: (data: AgentFormData) => Promise<void>;
  submitLabel?: string;
}

export interface AgentFormData {
  name: string;
  description: string;
  model: string;
  system: string;
  tools: string[];
  mcp_servers: McpServer[];
}

const models = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
];

const toolsets = [
  { value: "agent_toolset_20260401", label: "Agent Toolset (2026-04-01)" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "#111",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  color: "#fff",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "#a0a0a0",
  marginBottom: 6,
};

export default function AgentForm({
  initialData,
  onSubmit,
  submitLabel = "Create Agent",
}: AgentFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [model, setModel] = useState(initialData?.model || "claude-sonnet-4-6");
  const [system, setSystem] = useState(initialData?.system || "");
  const [selectedTools, setSelectedTools] = useState<string[]>(
    initialData?.tools?.map((t) => t.type) || ["agent_toolset_20260401"]
  );
  const [mcpServers, setMcpServers] = useState<McpServer[]>(
    initialData?.mcp_servers || []
  );
  const [submitting, setSubmitting] = useState(false);

  const handleToolToggle = (tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  };

  const addMcpServer = () => {
    setMcpServers((prev) => [...prev, { name: "", url: "" }]);
  };

  const updateMcpServer = (
    index: number,
    field: "name" | "url",
    value: string
  ) => {
    setMcpServers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeMcpServer = (index: number) => {
    setMcpServers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !model) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        model,
        system: system.trim(),
        tools: selectedTools,
        mcp_servers: mcpServers.filter((s) => s.url.trim()),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label style={labelStyle}>
          Name <span style={{ color: "#ba9926" }}>*</span>
        </label>
        <input
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Code Reviewer"
          required
        />
      </div>

      <div>
        <label style={labelStyle}>Description</label>
        <input
          style={inputStyle}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this agent do?"
        />
      </div>

      <div>
        <label style={labelStyle}>
          Model <span style={{ color: "#ba9926" }}>*</span>
        </label>
        <select
          style={inputStyle}
          value={model}
          onChange={(e) => setModel(e.target.value)}
          required
        >
          {models.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>System Prompt</label>
        <textarea
          style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
          value={system}
          onChange={(e) => setSystem(e.target.value)}
          placeholder="Instructions for the agent..."
        />
      </div>

      <div>
        <label style={labelStyle}>Tools</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {toolsets.map((tool) => (
            <label
              key={tool.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selectedTools.includes(tool.value)}
                onChange={() => handleToolToggle(tool.value)}
                style={{ accentColor: "#ba9926" }}
              />
              {tool.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>MCP Servers (optional)</label>
        {mcpServers.map((server, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={server.name || ""}
              onChange={(e) => updateMcpServer(i, "name", e.target.value)}
              placeholder="Server name"
            />
            <input
              style={{ ...inputStyle, flex: 2 }}
              value={server.url}
              onChange={(e) => updateMcpServer(i, "url", e.target.value)}
              placeholder="https://mcp-server-url.example.com"
            />
            <button
              type="button"
              onClick={() => removeMcpServer(i)}
              style={{
                background: "none",
                border: "1px solid #333",
                borderRadius: 6,
                color: "#a0a0a0",
                padding: "8px 12px",
                fontSize: 14,
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addMcpServer}
          style={{
            background: "none",
            border: "1px dashed #333",
            borderRadius: 6,
            color: "#a0a0a0",
            padding: "8px 16px",
            fontSize: 13,
          }}
        >
          + Add MCP Server
        </button>
      </div>

      <button
        type="submit"
        disabled={submitting || !name.trim()}
        style={{
          background: submitting ? "#7a6518" : "#ba9926",
          color: "#000",
          border: "none",
          borderRadius: 6,
          padding: "12px 24px",
          fontSize: 15,
          fontWeight: 600,
          opacity: submitting || !name.trim() ? 0.6 : 1,
          alignSelf: "flex-start",
        }}
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
