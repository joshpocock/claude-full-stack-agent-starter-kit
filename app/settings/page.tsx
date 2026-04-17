"use client";

import { useEffect, useState } from "react";
import { Settings, Key, Save, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function SettingsPage() {
  const { showToast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [envKeySet, setEnvKeySet] = useState(false);
  const [maskedDbKey, setMaskedDbKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { envKeySet?: boolean; settings?: Record<string, string> }) => {
        setEnvKeySet(data.envKeySet ?? false);
        const dbKey = data.settings?.anthropic_api_key;
        if (dbKey) setMaskedDbKey(dbKey);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anthropic_api_key: apiKey }),
      });
      if (res.ok) {
        showToast("API key saved", "success");
        setMaskedDbKey(
          apiKey.length > 12
            ? `${apiKey.slice(0, 10)}...${apiKey.slice(-4)}`
            : "••••••••"
        );
        setApiKey("");
      } else {
        showToast("Failed to save", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anthropic_api_key: "" }),
      });
      if (res.ok) {
        showToast("API key removed from settings", "success");
        setMaskedDbKey(null);
        setApiKey("");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 640 }}>
        <p style={{ color: "var(--text-muted)" }}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <Settings size={24} color="var(--accent)" />
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Settings</h1>
      </div>

      {/* API Key section */}
      <section
        style={{
          border: "1px solid var(--border-color)",
          borderRadius: 10,
          padding: 20,
          background: "var(--bg-card)",
          marginBottom: 20,
        }}
      >
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            margin: 0,
            marginBottom: 4,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Key size={16} />
          Anthropic API Key
        </h3>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            margin: "4px 0 16px",
            lineHeight: 1.5,
          }}
        >
          Your API key is used for all Anthropic API calls (agents, sessions,
          environments, vaults). You can set it here or in your{" "}
          <code style={{ fontFamily: "monospace" }}>.env</code> file. The
          settings page takes priority over <code>.env</code>.
        </p>

        {/* Status indicators */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 16,
            padding: 12,
            background: "var(--bg-input)",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: envKeySet ? "var(--success)" : "var(--text-muted)",
              }}
            />
            <span style={{ color: "var(--text-secondary)" }}>
              .env file:{" "}
              <strong
                style={{
                  color: envKeySet
                    ? "var(--success)"
                    : "var(--text-muted)",
                }}
              >
                {envKeySet ? "Set" : "Not set"}
              </strong>
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: maskedDbKey
                  ? "var(--success)"
                  : "var(--text-muted)",
              }}
            />
            <span style={{ color: "var(--text-secondary)" }}>
              Settings:{" "}
              {maskedDbKey ? (
                <code
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: "var(--text-primary)",
                  }}
                >
                  {maskedDbKey}
                </code>
              ) : (
                <strong style={{ color: "var(--text-muted)" }}>
                  Not set
                </strong>
              )}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {maskedDbKey
              ? "Using key from Settings (overrides .env)"
              : envKeySet
                ? "Using key from .env file"
                : "No API key configured — set one below or in .env"}
          </div>
        </div>

        {/* Input */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            style={{ flex: 1, fontFamily: "monospace", fontSize: 13 }}
          />
          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || saving}
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              fontSize: 13,
              opacity: !apiKey.trim() || saving ? 0.5 : 1,
            }}
          >
            <Save size={14} />
            Save
          </button>
        </div>

        {maskedDbKey && (
          <button
            onClick={handleClear}
            disabled={saving}
            className="btn-secondary"
            style={{
              marginTop: 10,
              padding: "6px 14px",
              fontSize: 12,
              color: "var(--error)",
              borderColor: "var(--error)",
            }}
          >
            Remove saved key (fall back to .env)
          </button>
        )}

        <div style={{ marginTop: 12 }}>
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "var(--text-secondary)",
              textDecoration: "none",
            }}
          >
            <ExternalLink size={12} />
            Get an API key at console.anthropic.com
          </a>
        </div>
      </section>

      {/* Info */}
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
            marginBottom: 12,
          }}
        >
          Key priority
        </h3>
        <ol
          style={{
            margin: 0,
            paddingLeft: 18,
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.8,
          }}
        >
          <li>
            <strong>Settings page</strong> — stored in the app database, takes
            highest priority
          </li>
          <li>
            <strong>.env file</strong> — set{" "}
            <code style={{ fontFamily: "monospace" }}>ANTHROPIC_API_KEY</code>{" "}
            in your project root
          </li>
          <li>
            <strong>SDK default</strong> — the Anthropic SDK reads the env var
            automatically
          </li>
        </ol>
      </section>
    </div>
  );
}
