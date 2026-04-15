"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardCounts {
  agents: number;
  environments: number;
  sessions: number;
}

const cardStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2a2a2a",
  borderRadius: 8,
  padding: 24,
  textAlign: "center",
};

const countStyle: React.CSSProperties = {
  fontSize: 48,
  fontWeight: 700,
  color: "#ba9926",
  lineHeight: 1.1,
};

const actionBtnStyle: React.CSSProperties = {
  background: "#ba9926",
  color: "#000",
  border: "none",
  borderRadius: 6,
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-block",
};

const actionBtnOutlineStyle: React.CSSProperties = {
  ...actionBtnStyle,
  background: "transparent",
  color: "#ba9926",
  border: "1px solid #ba9926",
};

export default function DashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts>({
    agents: 0,
    environments: 0,
    sessions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [agentsRes, envsRes] = await Promise.all([
          fetch("/api/agents"),
          fetch("/api/environments"),
        ]);
        const agents = agentsRes.ok ? await agentsRes.json() : [];
        const envs = envsRes.ok ? await envsRes.json() : [];
        setCounts({
          agents: Array.isArray(agents) ? agents.length : 0,
          environments: Array.isArray(envs) ? envs.length : 0,
          sessions: 0,
        });
      } catch {
        // API may not be set up yet
      } finally {
        setLoading(false);
      }
    }
    fetchCounts();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          Dashboard
        </h1>
        <p style={{ color: "#a0a0a0", fontSize: 15 }}>
          Manage your agents, environments, and tasks from one place.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 40,
        }}
      >
        <div style={cardStyle}>
          <div style={countStyle}>{loading ? "-" : counts.agents}</div>
          <div style={{ color: "#a0a0a0", marginTop: 8, fontSize: 14 }}>
            Agents
          </div>
        </div>
        <div style={cardStyle}>
          <div style={countStyle}>{loading ? "-" : counts.environments}</div>
          <div style={{ color: "#a0a0a0", marginTop: 8, fontSize: 14 }}>
            Environments
          </div>
        </div>
        <div style={cardStyle}>
          <div style={countStyle}>{loading ? "-" : counts.sessions}</div>
          <div style={{ color: "#a0a0a0", marginTop: 8, fontSize: 14 }}>
            Active Sessions
          </div>
        </div>
      </div>

      <h2
        style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}
      >
        Quick Actions
      </h2>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/agents/new" style={actionBtnStyle}>
          Create Agent
        </Link>
        <Link href="/board" style={actionBtnOutlineStyle}>
          New Task
        </Link>
        <Link href="/chat" style={actionBtnOutlineStyle}>
          Start Chat
        </Link>
      </div>
    </div>
  );
}
