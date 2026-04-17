"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cpu,
  Globe,
  Layers,
  Terminal,
  Brain,
  Database,
  Search,
  Wrench,
  FlaskConical,
  Shield,
  Gem,
  FileCode,
  Plus,
  Trash2,
} from "lucide-react";
import type {
  EnvironmentNetworking,
  EnvironmentPackages,
  PackageManager,
} from "@/lib/types";

interface Preset {
  icon: React.ComponentType<{ size?: number }>;
  name: string;
  description: string;
  networking: EnvironmentNetworking;
  packages: EnvironmentPackages;
}

const PRESETS: Preset[] = [
  {
    icon: Cpu,
    name: "Python Data Science",
    description:
      "Pandas, NumPy, Matplotlib, scikit-learn, and Jupyter for data analysis and ML workflows.",
    networking: { type: "limited", allow_package_managers: true },
    packages: { pip: ["pandas", "numpy", "matplotlib", "scikit-learn", "jupyter"] },
  },
  {
    icon: Globe,
    name: "Node.js Web Dev",
    description:
      "TypeScript, tsx runner, and Express for building web applications and APIs.",
    networking: { type: "limited", allow_package_managers: true },
    packages: { npm: ["typescript", "tsx", "express"] },
  },
  {
    icon: Layers,
    name: "Full Stack",
    description:
      "Python data tools, TypeScript, PostgreSQL client, and Redis tools for full-stack development.",
    networking: {
      type: "limited",
      allow_package_managers: true,
      allow_mcp_servers: true,
    },
    packages: {
      pip: ["pandas", "numpy"],
      npm: ["typescript", "tsx"],
      apt: ["postgresql-client", "redis-tools"],
    },
  },
  {
    icon: Terminal,
    name: "Go Backend",
    description:
      "Go language server (gopls) for building performant backend services.",
    networking: { type: "limited", allow_package_managers: true },
    packages: { go: ["golang.org/x/tools/gopls@latest"] },
  },
  {
    icon: Brain,
    name: "ML / Deep Learning",
    description:
      "PyTorch, Transformers, HuggingFace Hub, and datasets for training and inference.",
    networking: { type: "unrestricted" },
    packages: {
      pip: ["torch", "transformers", "huggingface_hub", "datasets", "accelerate"],
    },
  },
  {
    icon: Search,
    name: "Web Scraping",
    description:
      "Requests, BeautifulSoup, Playwright, and Selenium for harvesting the web.",
    networking: { type: "unrestricted" },
    packages: {
      pip: ["requests", "beautifulsoup4", "playwright", "selenium", "lxml"],
    },
  },
  {
    icon: Database,
    name: "Database Tools",
    description:
      "PostgreSQL, MySQL, Redis, and SQLite clients for database operations.",
    networking: { type: "limited", allow_package_managers: true },
    packages: {
      apt: ["postgresql-client", "mysql-client", "redis-tools", "sqlite3"],
      pip: ["psycopg2-binary", "mysqlclient", "redis"],
    },
  },
  {
    icon: Wrench,
    name: "DevOps / Infra",
    description:
      "Curl, git, Docker client, Ansible, and Terraform helpers for infrastructure work.",
    networking: { type: "unrestricted" },
    packages: {
      apt: ["curl", "git", "docker.io", "jq"],
      pip: ["ansible", "boto3"],
    },
  },
  {
    icon: FileCode,
    name: "Rust Development",
    description:
      "Cargo toolkit with serde, tokio, and clap for building Rust apps and CLIs.",
    networking: { type: "limited", allow_package_managers: true },
    packages: {
      cargo: ["cargo-edit", "cargo-watch"],
    },
  },
  {
    icon: Gem,
    name: "Ruby on Rails",
    description:
      "Rails, Bundler, Puma, and Sidekiq for full-stack Ruby web development.",
    networking: { type: "limited", allow_package_managers: true },
    packages: {
      gem: ["rails", "bundler", "puma", "sidekiq"],
    },
  },
  {
    icon: FlaskConical,
    name: "Research Agent",
    description:
      "Open network with requests, arxiv, wikipedia, and markdown tools for deep research tasks.",
    networking: { type: "unrestricted" },
    packages: {
      pip: ["requests", "arxiv", "wikipedia", "markdown", "pypdf2"],
    },
  },
  {
    icon: Shield,
    name: "Minimal Sandbox",
    description:
      "Locked-down environment with no packages and no network — safe code execution only.",
    networking: { type: "limited" },
    packages: {},
  },
];

const PACKAGE_MANAGERS: PackageManager[] = [
  "apt",
  "cargo",
  "gem",
  "go",
  "npm",
  "pip",
];

interface PackageRow {
  manager: PackageManager;
  value: string;
}

interface MetadataRow {
  key: string;
  value: string;
}

function packagesToRows(packages: EnvironmentPackages): PackageRow[] {
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
    const tokens = row.value
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (tokens.length === 0) continue;
    const existing = result[row.manager] ?? [];
    result[row.manager] = [...existing, ...tokens];
  }
  return result;
}

export default function NewEnvironmentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hostingType] = useState<"cloud">("cloud");

  const [networkType, setNetworkType] = useState<"unrestricted" | "limited">(
    "limited"
  );
  const [allowMcp, setAllowMcp] = useState(false);
  const [allowPkgMgr, setAllowPkgMgr] = useState(false);
  const [allowedHosts, setAllowedHosts] = useState("");

  const [packageRows, setPackageRows] = useState<PackageRow[]>([]);
  const [metadataRows, setMetadataRows] = useState<MetadataRow[]>([]);

  const [submitting, setSubmitting] = useState(false);

  const applyPreset = (preset: Preset) => {
    setName(preset.name);
    setDescription(preset.description);
    setNetworkType(preset.networking.type);
    setAllowMcp(preset.networking.allow_mcp_servers ?? false);
    setAllowPkgMgr(preset.networking.allow_package_managers ?? false);
    setAllowedHosts((preset.networking.allowed_hosts ?? []).join(", "));
    setPackageRows(packagesToRows(preset.packages));
  };

  const addPackageRow = () => {
    setPackageRows((rows) => [...rows, { manager: "pip", value: "" }]);
  };
  const removePackageRow = (idx: number) => {
    setPackageRows((rows) => rows.filter((_, i) => i !== idx));
  };
  const updatePackageRow = (idx: number, patch: Partial<PackageRow>) => {
    setPackageRows((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  };

  const addMetadataRow = () => {
    setMetadataRows((rows) => [...rows, { key: "", value: "" }]);
  };
  const removeMetadataRow = (idx: number) => {
    setMetadataRows((rows) => rows.filter((_, i) => i !== idx));
  };
  const updateMetadataRow = (idx: number, patch: Partial<MetadataRow>) => {
    setMetadataRows((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

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

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        config: {
          type: hostingType,
          networking,
          ...(Object.keys(packages).length > 0 && { packages }),
        },
        ...(Object.keys(metadata).length > 0 && { metadata }),
      };

      const res = await fetch("/api/environments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        alert(`Failed to create environment: ${err}`);
        return;
      }

      router.push("/environments");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 780 }}>
      {/* Preset tiles */}
      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: 12,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Quick Templates
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: 14,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 10,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "border-color 0.15s ease, background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--accent)";
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--accent-bg)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--border-color)";
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--bg-card)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: "var(--accent-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={15} />
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {preset.name}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    margin: 0,
                    lineHeight: 1.45,
                  }}
                >
                  {preset.description}
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                    marginTop: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: "monospace",
                      color: "var(--text-muted)",
                      background: "var(--bg-badge)",
                      padding: "2px 6px",
                      borderRadius: 4,
                      textTransform: "capitalize",
                    }}
                  >
                    {preset.networking.type}
                  </span>
                  {PACKAGE_MANAGERS.filter((m) => preset.packages[m]?.length).map(
                    (m) => (
                      <span
                        key={m}
                        style={{
                          fontSize: 10,
                          fontFamily: "monospace",
                          color: "var(--text-muted)",
                          background: "var(--bg-badge)",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        {m}
                      </span>
                    )
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        {/* Name + Hosting Type */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 220px",
            gap: 16,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: 6,
              }}
            >
              Name <span style={{ color: "var(--accent)" }}>*</span>
            </label>
            <input
              style={{ width: "100%" }}
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              placeholder="E.g. My Environment"
              required
              maxLength={50}
            />
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: 12,
                marginTop: 6,
              }}
            >
              50 characters or fewer.
            </p>
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: 6,
              }}
            >
              Hosting Type
            </label>
            <select
              value={hostingType}
              disabled
              style={{ width: "100%", cursor: "not-allowed", opacity: 0.85 }}
            >
              <option value="cloud">Cloud</option>
            </select>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: 12,
                marginTop: 6,
              }}
            >
              This cannot be changed after creation.
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: 6,
            }}
          >
            Description
          </label>
          <textarea
            style={{ width: "100%", minHeight: 72, resize: "vertical" }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description for this environment"
          />
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
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              margin: 0,
              marginBottom: 4,
            }}
          >
            Networking
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              margin: 0,
              marginBottom: 16,
            }}
          >
            Configure network access policies for this environment.
          </p>

          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: 6,
            }}
          >
            Type
          </label>
          <select
            value={networkType}
            onChange={(e) =>
              setNetworkType(e.target.value as "unrestricted" | "limited")
            }
            style={{ width: "100%", marginBottom: 16 }}
          >
            <option value="unrestricted">Unrestricted</option>
            <option value="limited">Limited</option>
          </select>

          {networkType === "limited" && (
            <>
              <ToggleRow
                label="Allow MCP server network access"
                checked={allowMcp}
                onChange={setAllowMcp}
              />
              <ToggleRow
                label="Allow package manager network access"
                checked={allowPkgMgr}
                onChange={setAllowPkgMgr}
              />

              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginTop: 16,
                  marginBottom: 6,
                }}
              >
                Allowed Hosts
              </label>
              <textarea
                value={allowedHosts}
                onChange={(e) => setAllowedHosts(e.target.value)}
                placeholder="www.example1.com, www.example2.com"
                style={{
                  width: "100%",
                  minHeight: 64,
                  fontFamily: "monospace",
                  fontSize: 13,
                  resize: "vertical",
                }}
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  margin: 0,
                  marginBottom: 4,
                }}
              >
                Packages
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  margin: 0,
                }}
              >
                Specify packages and their versions available in this environment.
                Separate multiple values with spaces.
              </p>
            </div>
            <IconButton
              label="Add package row"
              onClick={addPackageRow}
              icon={<Plus size={16} />}
            />
          </div>

          {packageRows.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                margin: 0,
              }}
            >
              No packages configured
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {packageRows.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 1fr 36px",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <select
                    value={row.manager}
                    onChange={(e) =>
                      updatePackageRow(i, {
                        manager: e.target.value as PackageManager,
                      })
                    }
                  >
                    {PACKAGE_MANAGERS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    value={row.value}
                    onChange={(e) =>
                      updatePackageRow(i, { value: e.target.value })
                    }
                    placeholder="package package==1.0.0"
                    style={{ fontFamily: "monospace", fontSize: 13 }}
                  />
                  <IconButton
                    label="Remove package row"
                    onClick={() => removePackageRow(i)}
                    icon={<Trash2 size={15} />}
                  />
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  margin: 0,
                  marginBottom: 4,
                }}
              >
                Metadata
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  margin: 0,
                }}
              >
                Add custom key-value pairs to tag and organize this environment.
                Keys must be lowercase.
              </p>
            </div>
            <IconButton
              label="Add metadata row"
              onClick={addMetadataRow}
              icon={<Plus size={16} />}
            />
          </div>

          {metadataRows.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              No metadata
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {metadataRows.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 36px",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <input
                    value={row.key}
                    onChange={(e) =>
                      updateMetadataRow(i, {
                        key: e.target.value.toLowerCase(),
                      })
                    }
                    placeholder="client_key..."
                    style={{ fontFamily: "monospace", fontSize: 13 }}
                  />
                  <input
                    value={row.value}
                    onChange={(e) =>
                      updateMetadataRow(i, { value: e.target.value })
                    }
                    placeholder="Value"
                  />
                  <IconButton
                    label="Remove metadata row"
                    onClick={() => removeMetadataRow(i)}
                    icon={<Trash2 size={15} />}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="btn-primary"
            style={{
              opacity: submitting || !name.trim() ? 0.6 : 1,
            }}
          >
            {submitting ? "Creating..." : "Create"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/environments")}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          background: checked ? "var(--accent)" : "var(--border-color)",
          border: "none",
          position: "relative",
          cursor: "pointer",
          transition: "background 0.2s ease",
          padding: 0,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: "block",
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#FFFFFF",
            position: "absolute",
            top: 3,
            left: checked ? 21 : 3,
            transition: "left 0.2s ease",
          }}
        />
      </button>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid var(--border-color)",
        background: "var(--bg-card)",
        color: "var(--text-secondary)",
        borderRadius: 8,
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "var(--bg-hover)";
        (e.currentTarget as HTMLButtonElement).style.color =
          "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "var(--bg-card)";
        (e.currentTarget as HTMLButtonElement).style.color =
          "var(--text-secondary)";
      }}
    >
      {icon}
    </button>
  );
}
