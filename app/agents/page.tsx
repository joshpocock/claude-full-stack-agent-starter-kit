"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, MoreHorizontal, Copy, Trash2 } from "lucide-react";
import type { Agent } from "@/lib/types";
import { getModelId } from "@/lib/types";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import SearchBar from "@/components/SearchBar";
import ShortcutHint from "@/components/ShortcutHint";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";

export default function AgentsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteAgent, setDeleteAgent] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cloning, setCloning] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredAgents = useMemo(() => {
    if (!search.trim()) return agents;
    const q = search.toLowerCase();
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description || "").toLowerCase().includes(q)
    );
  }, [agents, search]);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Agent[]) => setAgents(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpenId) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpenId]);

  const handleClone = async (agent: Agent) => {
    setMenuOpenId(null);
    setCloning(agent.id);
    try {
      const body = {
        name: `${agent.name} (Copy)`,
        model: getModelId(agent.model),
        ...(agent.description && { description: agent.description }),
        ...(agent.system && { system: agent.system }),
        ...(agent.tools && { tools: agent.tools }),
        ...(agent.mcp_servers && { mcp_servers: agent.mcp_servers }),
      };
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const newAgent = await res.json();
        showToast("Agent cloned", "success");
        router.push(`/agents/${newAgent.id}`);
      } else {
        showToast("Failed to clone agent", "error");
      }
    } catch {
      showToast("Failed to clone agent", "error");
    } finally {
      setCloning(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteAgent) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/agents/${deleteAgent.id}`, { method: "DELETE" });
      if (res.ok) {
        setAgents((prev) => prev.filter((a) => a.id !== deleteAgent.id));
        showToast("Agent deleted", "success");
      } else {
        showToast("Failed to delete agent", "error");
      }
    } catch {
      showToast("Failed to delete agent", "error");
    } finally {
      setDeleting(false);
      setDeleteAgent(null);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          gap: 16,
        }}
      >
        <div style={{ flex: 1, maxWidth: 400 }}>
          <SearchBar
            placeholder="Search agents by name or description..."
            value={search}
            onChange={setSearch}
          />
        </div>
        <Link
          href="/agents/new"
          className="btn-primary"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          Create Agent
          <ShortcutHint keys="N" />
        </Link>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 16 }}>
            <LoadingSkeleton height={20} width="30%" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: "12px 16px", borderTop: "1px solid var(--border-color)" }}>
              <LoadingSkeleton height={16} width={`${60 + i * 10}%`} />
            </div>
          ))}
        </div>
      ) : filteredAgents.length === 0 && !search ? (
        <EmptyState
          icon={Bot}
          title="No agents yet"
          description="Create your first agent to get started with managed AI agents."
          actionLabel="Create Agent"
          actionHref="/agents/new"
        />
      ) : (
        <div
          className="card"
          style={{ padding: 0, overflow: "visible", borderRadius: 12 }}
        >
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Model</th>
                <th>Description</th>
                <th>Created</th>
                <th style={{ width: 48 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.length === 0 && search && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      color: "var(--text-muted)",
                      padding: 32,
                    }}
                  >
                    No agents match &quot;{search}&quot;
                  </td>
                </tr>
              )}
              {filteredAgents.map((agent) => (
                <tr
                  key={agent.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    window.location.href = `/agents/${agent.id}`;
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      "var(--bg-card-hover)";
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
                        background: "var(--bg-badge)",
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontFamily: "monospace",
                      }}
                    >
                      {getModelId(agent.model)}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {agent.description || "-"}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    {agent.created_at
                      ? new Date(agent.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td
                    style={{ padding: "8px", verticalAlign: "middle", textAlign: "center" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      ref={menuOpenId === agent.id ? menuRef : undefined}
                      style={{ position: "relative", display: "inline-block" }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setMenuOpenId(menuOpenId === agent.id ? null : agent.id)
                        }
                        aria-label="More actions"
                        className="btn-secondary"
                        style={{
                          width: 32,
                          height: 32,
                          padding: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {menuOpenId === agent.id && (
                        <div
                          style={{
                            position: "absolute",
                            top: "calc(100% + 4px)",
                            right: 0,
                            minWidth: 160,
                            background: "var(--bg-card)",
                            border: "1px solid var(--border-color)",
                            borderRadius: 8,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                            padding: 4,
                            zIndex: 40,
                          }}
                        >
                          <MenuButton
                            icon={<Copy size={14} />}
                            label={cloning === agent.id ? "Cloning..." : "Clone"}
                            onClick={() => handleClone(agent)}
                          />
                          <MenuButton
                            icon={<Trash2 size={14} />}
                            label="Delete"
                            danger
                            onClick={() => {
                              setMenuOpenId(null);
                              setDeleteAgent(agent);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={deleteAgent !== null}
        onClose={() => setDeleteAgent(null)}
        title="Delete agent"
      >
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          Are you sure you want to delete <strong>{deleteAgent?.name}</strong>? This
          action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={() => setDeleteAgent(null)}
            className="btn-secondary"
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: "var(--error)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              opacity: deleting ? 0.6 : 1,
              cursor: "pointer",
            }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "9px 12px",
        fontSize: 13,
        background: "transparent",
        border: "none",
        borderRadius: 6,
        color: danger ? "var(--error)" : "var(--text-primary)",
        cursor: "pointer",
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          color: danger ? "var(--error)" : "var(--text-secondary)",
        }}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}
