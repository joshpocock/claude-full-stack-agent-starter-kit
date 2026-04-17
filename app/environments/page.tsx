"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Server, MoreHorizontal, Trash2 } from "lucide-react";
import type { Environment } from "@/lib/types";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";

export default function EnvironmentsPage() {
  const { showToast } = useToast();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteEnv, setDeleteEnv] = useState<Environment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/environments")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setEnvironments(list);
      })
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

  const handleDelete = async () => {
    if (!deleteEnv) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/environments/${deleteEnv.id}`, { method: "DELETE" });
      if (res.ok) {
        setEnvironments((prev) => prev.filter((e) => e.id !== deleteEnv.id));
        showToast("Environment deleted", "success");
      } else {
        showToast("Failed to delete environment", "error");
      }
    } catch {
      showToast("Failed to delete environment", "error");
    } finally {
      setDeleting(false);
      setDeleteEnv(null);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Link
          href="/environments/new"
          className="btn-primary"
          style={{ textDecoration: "none" }}
        >
          Create Environment
        </Link>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 16 }}>
            <LoadingSkeleton height={20} width="30%" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: "12px 16px", borderTop: "1px solid var(--border-color)" }}>
              <LoadingSkeleton height={16} width={`${50 + i * 10}%`} />
            </div>
          ))}
        </div>
      ) : environments.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No environments yet"
          description="Create one to provide sandboxed execution for your agents."
          actionLabel="Create Environment"
          actionHref="/environments/new"
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
                <th>Hosting</th>
                <th>Network</th>
                <th>Packages</th>
                <th>Created</th>
                <th style={{ width: 48 }}></th>
              </tr>
            </thead>
            <tbody>
              {environments.map((env) => {
                const networking = env.config?.networking;
                const pkgs = env.config?.packages;
                const pkgCount = pkgs
                  ? (pkgs.apt?.length ?? 0) +
                    (pkgs.cargo?.length ?? 0) +
                    (pkgs.gem?.length ?? 0) +
                    (pkgs.go?.length ?? 0) +
                    (pkgs.npm?.length ?? 0) +
                    (pkgs.pip?.length ?? 0)
                  : 0;
                return (
                  <tr
                    key={env.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => window.location.href = `/environments/${env.id}`}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-card-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ fontWeight: 500 }}>{env.name}</td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          background: "var(--bg-badge)",
                          border: "1px solid var(--border-color)",
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      >
                        {env.config?.type === "cloud" ? "Cloud" : "Cloud"}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, textTransform: "capitalize" }}>
                      <span
                        style={{
                          color:
                            networking?.type === "unrestricted"
                              ? "var(--success)"
                              : "var(--text-secondary)",
                        }}
                      >
                        {networking?.type ?? "Limited"}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      {pkgCount > 0
                        ? `${pkgCount} package${pkgCount > 1 ? "s" : ""}`
                        : "-"}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      {env.created_at
                        ? new Date(env.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td
                      style={{ padding: "8px", verticalAlign: "middle", textAlign: "center" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        ref={menuOpenId === env.id ? menuRef : undefined}
                        style={{ position: "relative", display: "inline-block" }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setMenuOpenId(menuOpenId === env.id ? null : env.id)
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
                        {menuOpenId === env.id && (
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
                              icon={<Trash2 size={14} />}
                              label="Delete"
                              danger
                              onClick={() => {
                                setMenuOpenId(null);
                                setDeleteEnv(env);
                              }}
                            />
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

      {/* Delete confirmation modal */}
      <Modal
        open={deleteEnv !== null}
        onClose={() => setDeleteEnv(null)}
        title="Delete environment"
      >
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          Are you sure you want to delete <strong>{deleteEnv?.name}</strong>? This
          action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={() => setDeleteEnv(null)}
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
