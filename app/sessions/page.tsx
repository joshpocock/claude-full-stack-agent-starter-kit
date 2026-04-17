"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  History,
  ArrowRight,
  Bot,
  MoreHorizontal,
  Archive,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Agent } from "@/lib/types";
import { getModelId } from "@/lib/types";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";

interface SessionRow {
  id: string;
  status: string;
  created_at: string;
  archived_at?: string | null;
  agent?: { id?: string; version?: number };
  metadata?: Record<string, string>;
  [key: string]: unknown;
}

const PAGE_SIZE = 15;

export default function SessionsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [sessionIdSearch, setSessionIdSearch] = useState("");
  const [createdFilter, setCreatedFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  // Kebab
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Pagination
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (agentFilter !== "all") params.set("agent_id", agentFilter);
      if (showArchived) params.set("include_archived", "true");
      if (createdFilter !== "all") {
        const now = Date.now();
        const deltas: Record<string, number> = {
          "1h": 3_600_000,
          "24h": 86_400_000,
          "7d": 604_800_000,
          "30d": 2_592_000_000,
          today: now - new Date().setHours(0, 0, 0, 0),
        };
        if (deltas[createdFilter]) {
          params.set(
            "created_after",
            new Date(now - deltas[createdFilter]).toISOString()
          );
        }
      }

      const [sessionsRes, agentsRes] = await Promise.all([
        fetch(`/api/sessions?${params.toString()}`),
        fetch("/api/agents"),
      ]);

      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(Array.isArray(data) ? data : []);
      }

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [agentFilter, showArchived, createdFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [agentFilter, showArchived, createdFilter, sessionIdSearch]);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!agentDropdownOpen && !menuOpenId) return;
    const handler = (e: MouseEvent) => {
      if (
        agentDropdownOpen &&
        agentDropdownRef.current &&
        !agentDropdownRef.current.contains(e.target as Node)
      ) {
        setAgentDropdownOpen(false);
      }
      if (
        menuOpenId &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [agentDropdownOpen, menuOpenId]);

  const agentNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of agents) map[a.id] = a.name;
    return map;
  }, [agents]);

  const filteredAgents = useMemo(() => {
    if (!agentSearch.trim()) return agents;
    const q = agentSearch.toLowerCase();
    return agents.filter((a) => a.name.toLowerCase().includes(q));
  }, [agents, agentSearch]);

  const filteredSessions = useMemo(() => {
    let list = sessions;
    if (sessionIdSearch.trim()) {
      const q = sessionIdSearch.toLowerCase();
      list = list.filter((s) => s.id.toLowerCase().includes(q));
    }
    return list;
  }, [sessions, sessionIdSearch]);

  const pageCount = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE));
  const paginated = filteredSessions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const getAgentName = (session: SessionRow) => {
    const agentId =
      session.agent?.id ?? (session as Record<string, unknown>).agent_id;
    if (typeof agentId === "string" && agentNameMap[agentId]) {
      return agentNameMap[agentId];
    }
    return null;
  };

  const handleArchive = async (sessionId: string) => {
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/archive`, {
        method: "POST",
      });
      if (res.ok) {
        showToast("Session archived", "success");
        load();
      } else {
        showToast("Failed to archive", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  };

  const formatRelative = (iso: string) => {
    try {
      const sec = (Date.now() - new Date(iso).getTime()) / 1000;
      if (sec < 60) return "just now";
      if (sec < 3600)
        return `${Math.floor(sec / 60)} min${sec < 120 ? "" : "s"} ago`;
      if (sec < 86400) {
        const h = Math.floor(sec / 3600);
        return `${h} hour${h === 1 ? "" : "s"} ago`;
      }
      const d = Math.floor(sec / 86400);
      if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              margin: 0,
              marginBottom: 4,
            }}
          >
            Sessions
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>
            Trace and debug Claude Managed Agents sessions.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        {/* Session ID search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
          <ArrowRight
            size={14}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            value={sessionIdSearch}
            onChange={(e) => setSessionIdSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && sessionIdSearch.trim()) {
                router.push(`/sessions/${sessionIdSearch.trim()}`);
              }
            }}
            placeholder="Go to session ID"
            style={{
              width: "100%",
              padding: "8px 10px 8px 32px",
              background: "var(--bg-input)",
              border: "1px solid var(--border-color)",
              borderRadius: 8,
              color: "var(--text-primary)",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>

        {/* Created filter */}
        <select
          value={createdFilter}
          onChange={(e) => setCreatedFilter(e.target.value)}
          style={{ padding: "8px 12px", fontSize: 13, borderRadius: 8 }}
        >
          <option value="all">Created: All time</option>
          <option value="today">Today</option>
          <option value="1h">Last hour</option>
          <option value="24h">Last day</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>

        {/* Agent filter */}
        <div style={{ position: "relative" }} ref={agentDropdownRef}>
          <button
            type="button"
            onClick={() => setAgentDropdownOpen((v) => !v)}
            style={{
              padding: "8px 12px",
              fontSize: 13,
              borderRadius: 8,
              background: "var(--bg-input)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              minWidth: 140,
            }}
          >
            Agent:{" "}
            {agentFilter === "all"
              ? "All"
              : agentNameMap[agentFilter] ?? "?"}
            <ChevronRight
              size={14}
              style={{
                marginLeft: "auto",
                transform: agentDropdownOpen
                  ? "rotate(90deg)"
                  : "none",
                transition: "transform 0.15s",
              }}
            />
          </button>
          {agentDropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                minWidth: 240,
                maxHeight: 300,
                overflowY: "auto",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                padding: 4,
                zIndex: 40,
              }}
            >
              <div style={{ padding: "6px 8px" }}>
                <input
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  placeholder="Search agents..."
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 6,
                    color: "var(--text-primary)",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setAgentFilter("all");
                  setAgentDropdownOpen(false);
                  setAgentSearch("");
                }}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  fontSize: 13,
                  background:
                    agentFilter === "all"
                      ? "var(--accent-subtle)"
                      : "transparent",
                  border: "none",
                  borderRadius: 6,
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                All agents
              </button>
              {filteredAgents.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setAgentFilter(a.id);
                    setAgentDropdownOpen(false);
                    setAgentSearch("");
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    fontSize: 13,
                    background:
                      agentFilter === a.id
                        ? "var(--accent-subtle)"
                        : "transparent",
                    border: "none",
                    borderRadius: 6,
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{a.name}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {a.created_at ? formatRelative(a.created_at) : ""}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Show archived toggle */}
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            cursor: "pointer",
            padding: "6px 12px",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            background: "var(--bg-input)",
          }}
        >
          Show archived
          <ToggleSwitch checked={showArchived} onChange={setShowArchived} />
        </label>
      </div>

      {/* Table */}
      {loading ? (
        <div
          className="card"
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          Loading sessions...
        </div>
      ) : filteredSessions.length === 0 ? (
        <EmptyState
          icon={History}
          title="No sessions found"
          description="Sessions appear here when agents are run. Start a chat or create a task."
          actionLabel="Start Chat"
          actionHref="/chat"
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Agent</th>
                <th style={thStyle}>Created</th>
                <th style={{ ...thStyle, width: 48 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((session) => {
                const agentName = getAgentName(session);
                return (
                  <tr
                    key={session.id}
                    onClick={() => router.push(`/sessions/${session.id}`)}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) =>
                      ((
                        e.currentTarget as HTMLTableRowElement
                      ).style.background = "var(--bg-card-hover)")
                    }
                    onMouseLeave={(e) =>
                      ((
                        e.currentTarget as HTMLTableRowElement
                      ).style.background = "transparent")
                    }
                  >
                    <td style={tdStyle}>
                      <code
                        style={{
                          fontFamily: "monospace",
                          fontSize: 12,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {session.id.length > 24
                          ? `${session.id.slice(0, 12)}...${session.id.slice(-6)}`
                          : session.id}
                      </code>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontSize: 13,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {session.metadata?.name || "—"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <StatusPill status={session.status} />
                    </td>
                    <td style={tdStyle}>
                      {agentName ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "3px 10px",
                            borderRadius: 6,
                            background: "var(--bg-badge)",
                            fontSize: 12,
                          }}
                        >
                          <Bot size={12} color="var(--text-secondary)" />
                          {agentName}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                          —
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          fontSize: 13,
                          color: "var(--text-muted)",
                        }}
                      >
                        {session.created_at
                          ? formatRelative(session.created_at)
                          : "—"}
                      </span>
                    </td>
                    <td
                      style={{ ...tdStyle, position: "relative" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        ref={
                          menuOpenId === session.id ? menuRef : undefined
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setMenuOpenId(
                              menuOpenId === session.id
                                ? null
                                : session.id
                            )
                          }
                          className="btn-secondary"
                          style={{
                            width: 30,
                            height: 30,
                            padding: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {menuOpenId === session.id && (
                          <div
                            style={{
                              position: "absolute",
                              top: "calc(100% - 4px)",
                              right: 8,
                              minWidth: 170,
                              background: "var(--bg-card)",
                              border: "1px solid var(--border-color)",
                              borderRadius: 8,
                              boxShadow:
                                "0 8px 24px rgba(0,0,0,0.35)",
                              padding: 4,
                              zIndex: 40,
                            }}
                          >
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() =>
                                handleArchive(session.id)
                              }
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
                                color: "var(--text-primary)",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                              onMouseEnter={(e) =>
                                ((
                                  e.currentTarget as HTMLButtonElement
                                ).style.background = "var(--bg-hover)")
                              }
                              onMouseLeave={(e) =>
                                ((
                                  e.currentTarget as HTMLButtonElement
                                ).style.background = "transparent")
                              }
                            >
                              <Archive
                                size={14}
                                color="var(--text-secondary)"
                              />
                              Archive session
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filteredSessions.length > PAGE_SIZE && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary"
            style={{
              width: 34,
              height: 34,
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: page === 1 ? 0.4 : 1,
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page === pageCount}
            className="btn-secondary"
            style={{
              width: 34,
              height: 34,
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: page === pageCount ? 0.4 : 1,
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 16px",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
};

function StatusPill({ status }: { status: string }) {
  const s = (status ?? "idle").toLowerCase();
  const map: Record<string, { color: string; bg: string; label: string }> = {
    idle: { color: "var(--text-primary)", bg: "var(--bg-badge)", label: "Idle" },
    running: { color: "var(--accent)", bg: "var(--accent-subtle)", label: "Running" },
    terminated: { color: "var(--text-muted)", bg: "var(--bg-badge)", label: "Terminated" },
    completed: { color: "var(--success)", bg: "rgba(34, 197, 94, 0.1)", label: "Completed" },
    failed: { color: "var(--error)", bg: "rgba(239, 68, 68, 0.1)", label: "Failed" },
    error: { color: "var(--error)", bg: "rgba(239, 68, 68, 0.1)", label: "Error" },
  };
  const cfg = map[s] ?? map.idle;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
        color: cfg.color,
        background: cfg.bg,
      }}
    >
      {cfg.label}
    </span>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 34,
        height: 20,
        borderRadius: 10,
        background: checked ? "var(--accent)" : "var(--border-color)",
        border: "none",
        position: "relative",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: "block",
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#FFFFFF",
          position: "absolute",
          top: 3,
          left: checked ? 17 : 3,
          transition: "left 0.2s ease",
        }}
      />
    </button>
  );
}
