"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Plus,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import type { Vault } from "@/lib/types";
import Modal from "@/components/Modal";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";

type FilterTab = "all" | "active";

const ITEMS_PER_PAGE = 10;

export default function VaultsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);

  // Create vault modal
  const [createVaultOpen, setCreateVaultOpen] = useState(false);
  const [vaultName, setVaultName] = useState("");
  const [creatingVault, setCreatingVault] = useState(false);

  // Delete vault
  const [deleteVault, setDeleteVault] = useState<Vault | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Menu
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filters and pagination
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchVaults = async () => {
    try {
      const res = await fetch("/api/vaults");
      if (!res.ok) return;
      const data: Vault[] = await res.json();
      setVaults(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaults();
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

  const filteredVaults = useMemo(() => {
    return vaults;
  }, [vaults, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredVaults.length / ITEMS_PER_PAGE));
  const paginatedVaults = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVaults.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredVaults, currentPage]);

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

  const handleDelete = async () => {
    if (!deleteVault) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/vaults/${deleteVault.id}`, { method: "DELETE" });
      if (res.ok) {
        setVaults((prev) => prev.filter((v) => v.id !== deleteVault.id));
        showToast("Vault deleted", "success");
      } else {
        showToast("Failed to delete vault", "error");
      }
    } catch {
      showToast("Failed to delete vault", "error");
    } finally {
      setDeleting(false);
      setDeleteVault(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
  ];

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginBottom: 6,
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Shield size={24} color="var(--accent)" />
            Credential Vaults
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 14,
              margin: 0,
            }}
          >
            Manage credential vaults that provide your agents with access to MCP
            servers and other tools.
          </p>
        </div>
        <button
          onClick={() => setCreateVaultOpen(true)}
          className="btn-primary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <Plus size={16} />
          New vault
        </button>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 16,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setCurrentPage(1);
            }}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color:
                activeTab === tab.key
                  ? "var(--accent)"
                  : "var(--text-secondary)",
              background:
                activeTab === tab.key ? "var(--accent-subtle)" : "transparent",
              border:
                activeTab === tab.key
                  ? "1px solid var(--accent)"
                  : "1px solid transparent",
              borderRadius: 6,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%" }}>
            <thead>
              <tr
                style={{
                  background: "var(--bg-secondary)",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <th>ID</th>
                <th>Name</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ width: 48 }}></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i}>
                  <td>
                    <LoadingSkeleton height={16} width="80%" />
                  </td>
                  <td>
                    <LoadingSkeleton height={16} width="60%" />
                  </td>
                  <td>
                    <LoadingSkeleton height={16} width="50px" />
                  </td>
                  <td>
                    <LoadingSkeleton height={16} width="70%" />
                  </td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filteredVaults.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No vaults yet"
          description="Create a credential vault to securely store credentials for your agents."
          actionLabel="New vault"
          onAction={() => setCreateVaultOpen(true)}
        />
      ) : (
        <>
          {/* Vaults Table */}
          <div
            className="card"
            style={{ padding: 0, overflow: "visible", borderRadius: 12 }}
          >
            <table style={{ width: "100%" }}>
              <thead>
                <tr
                  style={{
                    background: "var(--bg-secondary)",
                  }}
                >
                  <th
                    style={{
                      padding: "10px 16px",
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    ID
                  </th>
                  <th
                    style={{
                      padding: "10px 16px",
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      padding: "10px 16px",
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: "10px 16px",
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Created
                  </th>
                  <th style={{ width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {paginatedVaults.map((vault) => (
                  <tr
                    key={vault.id}
                    onClick={() => router.push(`/vaults/${vault.id}`)}
                    style={{
                      cursor: "pointer",
                      transition: "background 0.1s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "var(--bg-card-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        fontFamily: "monospace",
                        fontSize: 13,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {vault.id.length > 20
                        ? vault.id.slice(0, 20) + "..."
                        : vault.id}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontWeight: 500,
                        fontSize: 14,
                      }}
                    >
                      {vault.name}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 500,
                          background: "rgba(34, 197, 94, 0.1)",
                          color: "var(--success)",
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "var(--success)",
                          }}
                        />
                        Active
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {formatDate(vault.created_at)}
                    </td>
                    <td
                      style={{ padding: "8px", verticalAlign: "middle", textAlign: "center" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        ref={menuOpenId === vault.id ? menuRef : undefined}
                        style={{ position: "relative", display: "inline-block" }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setMenuOpenId(menuOpenId === vault.id ? null : vault.id)
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
                        {menuOpenId === vault.id && (
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
                                setDeleteVault(vault);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 16,
                padding: "0 4px",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  filteredVaults.length
                )}{" "}
                of {filteredVaults.length} vaults
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.max(1, p - 1))
                  }
                  disabled={currentPage === 1}
                  className="btn-secondary"
                  style={{
                    padding: "6px 10px",
                    fontSize: 13,
                    opacity: currentPage === 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        padding: "6px 12px",
                        fontSize: 13,
                        fontWeight: currentPage === page ? 600 : 400,
                        background:
                          currentPage === page
                            ? "var(--accent)"
                            : "transparent",
                        color:
                          currentPage === page
                            ? "#FFFFFF"
                            : "var(--text-secondary)",
                        border:
                          currentPage === page
                            ? "none"
                            : "1px solid var(--border-color)",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="btn-secondary"
                  style={{
                    padding: "6px 10px",
                    fontSize: 13,
                    opacity: currentPage === totalPages ? 0.4 : 1,
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Vault Modal */}
      <Modal
        open={createVaultOpen}
        onClose={() => {
          setCreateVaultOpen(false);
          setVaultName("");
        }}
        title="Create vault"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Warning callout */}
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid var(--accent)",
              background: "var(--accent-bg)",
            }}
          >
            <AlertTriangle
              size={18}
              color="var(--accent)"
              style={{ flexShrink: 0, marginTop: 1 }}
            />
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Vaults are shared across this workspace. Credentials added to this
              vault will be usable by anyone with API key access.
            </p>
          </div>

          <div>
            <label style={labelStyle}>Name</label>
            <input
              style={{ width: "100%" }}
              value={vaultName}
              onChange={(e) => {
                if (e.target.value.length <= 50) {
                  setVaultName(e.target.value);
                }
              }}
              placeholder="e.g. Production Secrets"
            />
            <span
              style={{
                display: "block",
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 4,
              }}
            >
              50 characters or fewer
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            <button
              className="btn-secondary"
              onClick={() => {
                setCreateVaultOpen(false);
                setVaultName("");
              }}
              style={{ padding: "8px 16px", fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              onClick={createVault}
              disabled={!vaultName.trim() || creatingVault}
              className="btn-primary"
              style={{
                padding: "8px 20px",
                fontSize: 13,
                opacity: !vaultName.trim() || creatingVault ? 0.5 : 1,
              }}
            >
              {creatingVault ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Vault Modal */}
      <Modal
        open={deleteVault !== null}
        onClose={() => setDeleteVault(null)}
        title="Delete vault"
      >
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          Are you sure you want to delete vault <strong>{deleteVault?.name}</strong>? All
          credentials in this vault will be permanently removed. This action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={() => setDeleteVault(null)}
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
