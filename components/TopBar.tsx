"use client";

import { usePathname } from "next/navigation";
import { Sun, Moon, Calendar } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import ConnectionStatus from "./ConnectionStatus";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/chat": "Chat",
  "/board": "Task Board",
  "/agents": "Agents",
  "/agents/new": "Create Agent",
  "/environments": "Environments",
  "/environments/new": "Create Environment",
  "/vaults": "Vaults",
  "/templates": "Templates",
  "/settings": "Settings",
};

export default function TopBar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const getTitle = () => {
    if (routeTitles[pathname]) return routeTitles[pathname];
    if (pathname.startsWith("/agents/")) return "Agent Details";
    return "Dashboard";
  };

  return (
    <div
      className="topbar"
      style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "var(--bg-card)",
        borderBottom: "1px solid var(--border-color)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Left: Page title */}
      <h1 className="topbar-title" style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
        {getTitle()}
      </h1>

      {/* Right: Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Connection Status */}
        <ConnectionStatus compact />

        {/* Book call */}
        <a
          href="https://www.executivestride.com/apply"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <Calendar size={14} />
          Book
        </a>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            background: "transparent",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            color: "var(--text-secondary)",
            cursor: "pointer",
            padding: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--bg-card-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
          }}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </div>
  );
}
