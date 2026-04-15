"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Chat", href: "/chat" },
  { label: "Board", href: "/board" },
  { label: "Agents", href: "/agents" },
  { label: "Environments", href: "/environments" },
  { label: "Vaults", href: "/vaults" },
];

export default function TabNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "#0a0a0a",
        borderBottom: "1px solid #2a2a2a",
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "0 24px",
      }}
    >
      <Link
        href="/"
        style={{
          fontWeight: 700,
          fontSize: 18,
          color: "#ba9926",
          marginRight: 32,
          padding: "14px 0",
          textDecoration: "none",
          letterSpacing: "-0.3px",
        }}
      >
        Managed Agents
      </Link>
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: "14px 16px",
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "#ffffff" : "#a0a0a0",
              borderBottom: isActive ? "2px solid #ba9926" : "2px solid transparent",
              textDecoration: "none",
              transition: "color 0.15s ease, border-color 0.15s ease",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
