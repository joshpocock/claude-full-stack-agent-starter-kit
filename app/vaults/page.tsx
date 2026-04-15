"use client";

import { useEffect, useState } from "react";
import type { Vault, Credential } from "@/lib/types";
import Modal from "@/components/Modal";

interface VaultWithCredentials extends Vault {
  credentials: Credential[];
  expanded: boolean;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "#111",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  color: "#fff",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "#a0a0a0",
  marginBottom: 6,
};

export default function VaultsPage() {
  const [vaults, setVaults] = useState<VaultWithCredentials[]>([]);
  const [loading, setLoading] = useState(true);

  // Create vault form
  const [createVaultOpen, setCreateVaultOpen] = useState(false);
  const [vaultName, setVaultName] = useState("");
  const [creatingVault, setCreatingVault] = useState(false);

  // Add credential form
  const [credVaultId, setCredVaultId] = useState<string | null>(null);
  const [credName, setCredName] = useState("");
  const [credType, setCredType] = useState("api_key");
  const [credToken, setCredToken] = useState("");
  const [credMcpUrl, setCredMcpUrl] = useState("");
  const [addingCred, setAddingCred] = useState(false);

  const fetchVaults = async () => {
    try {
      const res = await fetch("/api/vaults");
      if (!res.ok) return;
      const data: Vault[] = await res.json();

      const withCreds: VaultWithCredentials[] = await Promise.all(
        data.map(async (v) => {
          let credentials: Credential[] = [];
          try {
            const cRes = await fetch(`/api/vaults/${v.id}/credentials`);
            if (cRes.ok) credentials = await cRes.json();
          } catch { /* ignore */ }
          return { ...v, credentials, expanded: false };
        })
      );

      setVaults((prev) => {
        // Preserve expanded state
        const expandedMap = new Map(prev.map((v) => [v.id, v.expanded]));
        return withCreds.map((v) => ({
          ...v,
          expanded: expandedMap.get(v.id) || false,
        }));
      });
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaults();
  }, []);

  const toggleExpand = (id: string) => {
    setVaults((prev) =>
      prev.map((v) => (v.id === id ? { ...v, expanded: !v.expanded } : v))
    );
  };

  const createVault = async () => {
    if (!vaultName.trim()) return;
    setCreatingVault(true);
    try {
      const res = await fetch("/api/vaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: vaultName.trim() }),
      });
      if (res.ok) {
        setVaultName("");
        setCreateVaultOpen(false);
        fetchVaults();
      } else {
        alert("Failed to create vault");
      }
    } finally {
      setCreatingVault(false);
    }
  };

  const addCredential = async () => {
    if (!credVaultId || !credName.trim()) return;
    setAddingCred(true);
    try {
      const auth: Record<string, string> = { type: credType };
      if (credToken.trim()) auth.token = credToken.trim();
      if (credMcpUrl.trim()) auth.mcp_server_url = credMcpUrl.trim();

      const res = await fetch(`/api/vaults/${credVaultId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: credName.trim(),
          auth,
        }),
      });
      if (res.ok) {
        setCredVaultId(null);
        setCredName("");
        setCredToken("");
        setCredMcpUrl("");
        fetchVaults();
      } else {
        alert("Failed to add credential");
      }
    } finally {
      setAddingCred(false);
    }
  };

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
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Vaults</h1>
        <button
          onClick={() => setCreateVaultOpen(true)}
          style={{
            background: "#ba9926",
            color: "#000",
            border: "none",
            borderRadius: 6,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Create Vault
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#a0a0a0" }}>Loading vaults...</p>
      ) : vaults.length === 0 ? (
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
            No vaults yet. Create one to securely store credentials for your
            agents.
          </p>
          <button
            onClick={() => setCreateVaultOpen(true)}
            style={{
              background: "none",
              border: "none",
              color: "#ba9926",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Create Vault
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {vaults.map((vault) => (
            <div
              key={vault.id}
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <div
                onClick={() => toggleExpand(vault.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      color: "#ba9926",
                      fontSize: 16,
                      transform: vault.expanded ? "rotate(90deg)" : "rotate(0)",
                      transition: "transform 0.15s ease",
                      display: "inline-block",
                    }}
                  >
                    &#9654;
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>
                    {vault.name}
                  </span>
                  <span style={{ color: "#666", fontSize: 13 }}>
                    {vault.credentials.length} credential
                    {vault.credentials.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <span style={{ color: "#666", fontSize: 12 }}>
                  {vault.created_at
                    ? new Date(vault.created_at).toLocaleDateString()
                    : ""}
                </span>
              </div>

              {vault.expanded && (
                <div
                  style={{
                    borderTop: "1px solid #222",
                    padding: "16px 20px",
                  }}
                >
                  {vault.credentials.length === 0 ? (
                    <p style={{ color: "#666", fontSize: 13, marginBottom: 12 }}>
                      No credentials in this vault.
                    </p>
                  ) : (
                    <div style={{ marginBottom: 12 }}>
                      {vault.credentials.map((cred) => (
                        <div
                          key={cred.id}
                          style={{
                            background: "#111",
                            borderRadius: 6,
                            padding: "12px 16px",
                            marginBottom: 8,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 14 }}>
                              {cred.display_name}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#666",
                                marginTop: 2,
                              }}
                            >
                              Type: {cred.auth.type}
                              {cred.auth.mcp_server_url &&
                                ` | MCP: ${cred.auth.mcp_server_url}`}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 12,
                              color: "#444",
                              fontFamily: "monospace",
                            }}
                          >
                            {cred.id.slice(0, 12)}...
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCredVaultId(vault.id);
                    }}
                    style={{
                      background: "none",
                      border: "1px dashed #333",
                      borderRadius: 6,
                      color: "#a0a0a0",
                      padding: "8px 16px",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    + Add Credential
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Vault Modal */}
      <Modal
        open={createVaultOpen}
        onClose={() => setCreateVaultOpen(false)}
        title="Create Vault"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Vault Name</label>
            <input
              style={inputStyle}
              value={vaultName}
              onChange={(e) => setVaultName(e.target.value)}
              placeholder="e.g. Production Secrets"
            />
          </div>
          <button
            onClick={createVault}
            disabled={!vaultName.trim() || creatingVault}
            style={{
              background: "#ba9926",
              color: "#000",
              border: "none",
              borderRadius: 6,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              opacity: !vaultName.trim() || creatingVault ? 0.5 : 1,
              alignSelf: "flex-end",
            }}
          >
            {creatingVault ? "Creating..." : "Create"}
          </button>
        </div>
      </Modal>

      {/* Add Credential Modal */}
      <Modal
        open={credVaultId !== null}
        onClose={() => setCredVaultId(null)}
        title="Add Credential"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Display Name</label>
            <input
              style={inputStyle}
              value={credName}
              onChange={(e) => setCredName(e.target.value)}
              placeholder="e.g. GitHub Token"
            />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select
              style={inputStyle}
              value={credType}
              onChange={(e) => setCredType(e.target.value)}
            >
              <option value="api_key">API Key</option>
              <option value="oauth2">OAuth2</option>
              <option value="bearer_token">Bearer Token</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Token / Secret</label>
            <input
              style={inputStyle}
              type="password"
              value={credToken}
              onChange={(e) => setCredToken(e.target.value)}
              placeholder="Enter secret value"
            />
          </div>
          <div>
            <label style={labelStyle}>MCP Server URL (optional)</label>
            <input
              style={inputStyle}
              value={credMcpUrl}
              onChange={(e) => setCredMcpUrl(e.target.value)}
              placeholder="https://mcp-server.example.com"
            />
          </div>
          <button
            onClick={addCredential}
            disabled={!credName.trim() || addingCred}
            style={{
              background: "#ba9926",
              color: "#000",
              border: "none",
              borderRadius: 6,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              opacity: !credName.trim() || addingCred ? 0.5 : 1,
              alignSelf: "flex-end",
            }}
          >
            {addingCred ? "Adding..." : "Add Credential"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
