"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Environment } from "@/lib/types";

export default function EnvironmentsPage() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/environments")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Environment[]) => setEnvironments(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          Environments
        </h1>
        <Link
          href="/environments/new"
          style={{
            background: "#ba9926",
            color: "#000",
            border: "none",
            borderRadius: 6,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Create Environment
        </Link>
      </div>

      {loading ? (
        <p style={{ color: "#a0a0a0" }}>Loading environments...</p>
      ) : environments.length === 0 ? (
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: 8,
            padding: 48,
            textAlign: "center",
          }}
        >
          <p style={{ color: "#a0a0a0", fontSize: 15, marginBottom: 16 }}>
            No environments yet. Create one to provide sandboxed execution for
            your agents.
          </p>
          <Link
            href="/environments/new"
            style={{
              color: "#ba9926",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Create Environment
          </Link>
        </div>
      ) : (
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Setup Commands</th>
                <th>Network</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {environments.map((env) => (
                <tr key={env.id}>
                  <td style={{ fontWeight: 500 }}>{env.name}</td>
                  <td style={{ color: "#a0a0a0", fontSize: 13 }}>
                    {env.setup_commands && env.setup_commands.length > 0
                      ? `${env.setup_commands.length} command${env.setup_commands.length > 1 ? "s" : ""}`
                      : "-"}
                  </td>
                  <td>
                    <span
                      style={{
                        color: env.network_access ? "#4caf50" : "#666",
                        fontSize: 13,
                      }}
                    >
                      {env.network_access ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td style={{ color: "#666", fontSize: 13 }}>
                    {env.created_at
                      ? new Date(env.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
