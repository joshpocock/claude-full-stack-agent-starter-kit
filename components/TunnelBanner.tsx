"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from "lucide-react";

/**
 * Tunnel status banner for agent detail pages.
 *
 * Only renders something when the agent has at least one MCP server whose URL
 * looks tunnel-bound (localhost, *.trycloudflare.com, or matches the currently
 * stored tunnel URL). For agents whose MCP servers point at public APIs,
 * nothing is rendered — the tunnel doesn't matter to them.
 *
 * States:
 *   - Tunnel connected + MCP URLs match current tunnel URL → green pill
 *   - Tunnel connected + MCP URLs stale (old hostname) → yellow banner + re-sync button
 *   - Tunnel not running → red banner with "run dev:tunnel" hint
 */

interface Props {
  mcpServers?: Array<{ name?: string; url?: string }>;
}

interface TunnelStatus {
  connected: boolean;
  url: string | null;
  heartbeat_at: string | null;
}

function isTunnelBound(url: string, currentTunnelUrl: string | null): boolean {
  if (!url) return false;
  if (url.includes("localhost") || url.includes("127.0.0.1")) return true;
  if (url.includes(".trycloudflare.com")) return true;
  if (currentTunnelUrl && url.startsWith(currentTunnelUrl)) return true;
  return false;
}

export default function TunnelBanner({ mcpServers }: Props) {
  const [status, setStatus] = useState<TunnelStatus | null>(null);
  const [resyncing, setResyncing] = useState(false);
  const [resyncResult, setResyncResult] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/tunnel/status")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && typeof d.connected === "boolean") {
            setStatus({
              connected: d.connected,
              url: d.url ?? null,
              heartbeat_at: d.heartbeat_at ?? null,
            });
          }
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);

  const tunnelBound = (mcpServers ?? []).filter((s) =>
    isTunnelBound(s.url ?? "", status?.url ?? null)
  );
  if (tunnelBound.length === 0) return null;

  const urlsMatchCurrent =
    status?.url &&
    tunnelBound.every((s) => (s.url ?? "").startsWith(status.url ?? ""));

  let variant: "ok" | "stale" | "down";
  let title: string;
  let detail: string;
  let Icon = CheckCircle2;
  let color = "var(--success)";
  let bg = "rgba(34, 197, 94, 0.08)";
  let border = "rgba(34, 197, 94, 0.3)";

  if (!status || !status.connected) {
    variant = "down";
    Icon = XCircle;
    color = "var(--error)";
    bg = "rgba(239, 68, 68, 0.08)";
    border = "rgba(239, 68, 68, 0.3)";
    title = "Tunnel not running — this agent may be unreachable";
    detail =
      "This agent has MCP servers that point at a local tunnel. Start it with `npm run dev:tunnel` (or `npm run dev:all`) so Anthropic can reach the MCP endpoint.";
  } else if (!urlsMatchCurrent) {
    variant = "stale";
    Icon = AlertTriangle;
    color = "#d97706";
    bg = "rgba(217, 119, 6, 0.08)";
    border = "rgba(217, 119, 6, 0.3)";
    title = "MCP URLs are out of date";
    detail = `Tunnel is running at ${status.url}, but this agent still points at an older hostname. Click Re-sync to update all agents to the current tunnel URL.`;
  } else {
    variant = "ok";
    title = "Tunnel connected";
    detail = `MCP is reachable via ${status.url}`;
  }

  const resync = async () => {
    if (!status?.url) return;
    setResyncing(true);
    setResyncResult(null);
    try {
      const res = await fetch("/api/mcp/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: status.url }),
      });
      if (res.ok) {
        const data = await res.json();
        setResyncResult(`Updated ${data.synced ?? 0} agent(s). Reload to see changes.`);
      } else {
        setResyncResult("Re-sync failed. Check the terminal for details.");
      }
    } catch {
      setResyncResult("Re-sync failed — is the dev server running?");
    } finally {
      setResyncing(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 10,
        background: bg,
        border: `1px solid ${border}`,
        marginBottom: 20,
      }}
    >
      <Icon size={18} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {detail}
        </div>
        {resyncResult && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
            {resyncResult}
          </div>
        )}
      </div>
      {variant === "stale" && status?.url && (
        <button
          onClick={resync}
          disabled={resyncing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 600,
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: 6,
            color: "var(--text-primary)",
            cursor: resyncing ? "not-allowed" : "pointer",
            opacity: resyncing ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          <RefreshCw size={12} style={resyncing ? { animation: "spin 1s linear infinite" } : undefined} />
          {resyncing ? "Syncing..." : "Re-sync URLs"}
        </button>
      )}
    </div>
  );
}
