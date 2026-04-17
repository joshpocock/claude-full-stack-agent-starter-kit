"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: 12,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "var(--accent-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Icon size={28} color="var(--accent)" />
      </div>
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 8,
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          maxWidth: 360,
          marginBottom: actionLabel ? 20 : 0,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-primary"
        >
          {actionLabel}
        </button>
      )}
      {actionLabel && actionHref && !onAction && (
        <Link
          href={actionHref}
          className="btn-primary"
          style={{ textDecoration: "none" }}
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
