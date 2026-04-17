"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import type {
  Environment,
  EnvironmentNetworking,
  EnvironmentPackages,
  PackageManager,
} from "@/lib/types";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useToast } from "@/components/Toast";

const PACKAGE_MANAGERS: PackageManager[] = [
  "apt", "cargo", "gem", "go", "npm", "pip",
];

interface PackageRow { manager: PackageManager; value: string }
interface MetadataRow { key: string; value: string }

function packagesToRows(packages?: EnvironmentPackages): PackageRow[] {
  if (!packages) return [];
  const rows: PackageRow[] = [];
  for (const mgr of PACKAGE_MANAGERS) {
    const list = packages[mgr];
    if (list && list.length > 0) {
      rows.push({ manager: mgr, value: list.join(" ") });
    }
  }
  return rows;
}

function rowsToPackages(rows: PackageRow[]): EnvironmentPackages {
  const result: EnvironmentPackages = {};
  for (const row of rows) {
    const tokens = row.value.split(/\s+/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length === 0) continue;
    result[row.manager] = [...(result[row.manager] ?? []), ...tokens];
  }
  return result;
}

export default function EnvironmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const envId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [env, setEnv] = useState<Environment | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [networkType, setNetworkType] = useState<"unrestricted" | "limited">("limited");
  const [allowMcp, setAllowMcp] = useState(false);
  const [allowPkgMgr, setAllowPkgMgr] = useState(false);
  const [allowedHosts, setAllowedHosts] = useState("");
  const [packageRows, setPackageRows] = useState<PackageRow[]>([]);
  const [metadataRows, setMetadataRows] = useState<MetadataRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/environments/${envId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Environment | null) => {
        if (!data) return;
        setEnv(data);
        setName(data.name || data.id || "");
        setDescription(data.description || "");

        const net = data.config?.networking;
        if (net) {
          setNetworkType(net.type);
          if (net.type === "limited") {
            setAllowMcp(net.allow_mcp_servers ?? false);
            setAllowPkgMgr(net.allow_package_managers ?? false);
            setAllowedHosts((net.allowed_hosts ?? []).join(", "));
          }
        }

        setPackageRows(packagesToRows(data.config?.packages));

        if (data.metadata) {
          setMetadataRows(
            Object.entries(data.metadata).map(([key, value]) => ({ key, value: String(value) }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [envId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const networking: EnvironmentNetworking =
        networkType === "unrestricted"
          ? { type: "unrestricted" }
          : {
              type: "limited",
              allow_mcp_servers: allowMcp,
              allow_package_managers: allowPkgMgr,
              allowed_hosts: allowedHosts
                .split(/[,\n]/)
                .map((h) => h.trim())
                .filter(Boolean),
            };

      const packages = rowsToPackages(packageRows);
      const metadata: Record<string, string> = {};
      for (const { key, value } of metadataRows) {
        const k = key.trim().toLowerCase();
        if (k) metadata[k] = value;
      }

      const res = await fetch(`/api/environments/${envId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            type: "cloud",
            networking,
            ...(Object.keys(packages).length > 0 && { packages }),
          },
          ...(Object.keys(metadata).length > 0 && { metadata }),
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        showToast(`Failed to update: ${err.slice(0, 100)}`, "error");
        return;
      }

      showToast("Environment updated", "success");
      router.push("/environments");
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle = {
    display: "block" as const,
    fontSize: 13,
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginBottom: 6,
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 780 }}>
        <LoadingSkeleton height={32} width="40%" />
        <div className="card" style={{ marginTop: 24, padding: 24 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid var(--border-color)" }}>
              <LoadingSkeleton height={16} width={`${50 + i * 10}%`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!env) {
    return <p style={{ color: "var(--text-secondary)" }}>Environment not found.</p>;
  }

  return (
    <div style={{ maxWidth: 780 }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
        <Link href="/environments" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
          Environments
        </Link>
        <span style={{ margin: "0 6px" }}>/</span>
        <span style={{ color: "var(--text-primary)" }}>{name || envId}</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{name}</h1>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24, fontFamily: "monospace" }}>
        {envId}
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Name (read-only) */}
        <div>
          <label style={labelStyle}>Name</label>
          <input
            style={{ width: "100%", opacity: 0.7, cursor: "not-allowed" }}
            value={name}
            disabled
          />
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
            Name cannot be changed after creation.
          </p>
        </div>

        {/* Networking */}
        <section
          style={{
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            padding: 20,
            background: "var(--bg-card)",
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Networking</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 16px" }}>
            Configure network access policies.
          </p>

          <label style={labelStyle}>Type</label>
          <select
            value={networkType}
            onChange={(e) => setNetworkType(e.target.value as "unrestricted" | "limited")}
            style={{ width: "100%", marginBottom: 16 }}
          >
            <option value="unrestricted">Unrestricted</option>
            <option value="limited">Limited</option>
          </select>

          {networkType === "limited" && (
            <>
              <ToggleRow label="Allow MCP server network access" checked={allowMcp} onChange={setAllowMcp} />
              <ToggleRow label="Allow package manager network access" checked={allowPkgMgr} onChange={setAllowPkgMgr} />

              <label style={{ ...labelStyle, marginTop: 16 }}>Allowed Hosts</label>
              <textarea
                value={allowedHosts}
                onChange={(e) => setAllowedHosts(e.target.value)}
                placeholder="www.example.com, api.example.com"
                style={{ width: "100%", minHeight: 64, fontFamily: "monospace", fontSize: 13, resize: "vertical" }}
              />
            </>
          )}
        </section>

        {/* Packages */}
        <section
          style={{
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            padding: 20,
            background: "var(--bg-card)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Packages</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                Separate multiple values with spaces.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPackageRows((r) => [...r, { manager: "pip", value: "" }])}
              className="btn-secondary"
              style={{ padding: "6px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {packageRows.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>No packages configured</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {packageRows.map((row, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "140px 1fr 36px", gap: 8, alignItems: "center" }}>
                  <select
                    value={row.manager}
                    onChange={(e) => setPackageRows((rows) => rows.map((r, j) => j === i ? { ...r, manager: e.target.value as PackageManager } : r))}
                  >
                    {PACKAGE_MANAGERS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input
                    value={row.value}
                    onChange={(e) => setPackageRows((rows) => rows.map((r, j) => j === i ? { ...r, value: e.target.value } : r))}
                    placeholder="package package==1.0.0"
                    style={{ fontFamily: "monospace", fontSize: 13 }}
                  />
                  <button
                    type="button"
                    onClick={() => setPackageRows((rows) => rows.filter((_, j) => j !== i))}
                    className="btn-secondary"
                    style={{ width: 32, height: 32, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Metadata */}
        <section
          style={{
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            padding: 20,
            background: "var(--bg-card)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Metadata</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>Custom key-value pairs.</p>
            </div>
            <button
              type="button"
              onClick={() => setMetadataRows((r) => [...r, { key: "", value: "" }])}
              className="btn-secondary"
              style={{ padding: "6px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {metadataRows.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>No metadata</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {metadataRows.map((row, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 36px", gap: 8, alignItems: "center" }}>
                  <input
                    value={row.key}
                    onChange={(e) => setMetadataRows((rows) => rows.map((r, j) => j === i ? { ...r, key: e.target.value.toLowerCase() } : r))}
                    placeholder="key"
                    style={{ fontFamily: "monospace", fontSize: 13 }}
                  />
                  <input
                    value={row.value}
                    onChange={(e) => setMetadataRows((rows) => rows.map((r, j) => j === i ? { ...r, value: e.target.value } : r))}
                    placeholder="value"
                  />
                  <button
                    type="button"
                    onClick={() => setMetadataRows((rows) => rows.filter((_, j) => j !== i))}
                    className="btn-secondary"
                    style={{ width: 32, height: 32, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" onClick={() => router.push("/environments")} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        style={{
          width: 40, height: 22, borderRadius: 11,
          background: checked ? "var(--accent)" : "var(--border-color)",
          border: "none", position: "relative", cursor: "pointer",
          transition: "background 0.2s ease", padding: 0, flexShrink: 0,
        }}
      >
        <span style={{
          display: "block", width: 16, height: 16, borderRadius: "50%",
          background: "#FFFFFF", position: "absolute", top: 3,
          left: checked ? 21 : 3, transition: "left 0.2s ease",
        }} />
      </button>
    </div>
  );
}
