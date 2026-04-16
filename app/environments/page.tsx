"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Server } from "lucide-react";
import type { Environment } from "@/lib/types";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";

export default function EnvironmentsPage() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/environments")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        // Handle paginated response or direct array
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setEnvironments(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
          style={{ padding: 0, overflow: "hidden" }}
        >
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Hosting</th>
                <th>Network</th>
                <th>Packages</th>
                <th>Created</th>
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
                  <tr key={env.id}>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
