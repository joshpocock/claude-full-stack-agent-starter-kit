"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Search,
  Sparkles,
  GitBranch,
  Package,
  Building2,
  ExternalLink,
  Plus,
  Wrench,
  FileText,
  Globe,
  Database,
  PenTool,
  Link as LinkIcon,
  Library,
  Download,
  ChevronLeft,
  ChevronRight,
  Check,
  Trash2,
  Folder,
  File,
  ChevronDown,
  Eye,
  Code,
  Copy,
} from "lucide-react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";

interface Skill {
  id: string;
  name: string;
  description: string;
  author: string;
  source: "bundled" | "anthropic" | "github" | "custom";
  category: string;
  content: string;
  anthropic_skill_id?: string;
}

interface Agent {
  id: string;
  name: string;
}

type FilterTab = "all" | "bundled" | "anthropic" | "github" | "custom" | "library";

interface LibrarySkill {
  source: string;
  skillId: string;
  name: string;
  displayName?: string;
  installs?: number;
  owner: string;
  repo: string;
  githubUrl: string;
}

interface LibraryResponse {
  scrapedAt?: string;
  totalInRegistry?: number;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  results: LibrarySkill[];
}

const sourceConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Package }
> = {
  bundled: {
    label: "Bundled",
    color: "var(--accent)",
    bg: "var(--accent-subtle)",
    icon: Package,
  },
  anthropic: {
    label: "Anthropic",
    color: "var(--success)",
    bg: "rgba(34, 197, 94, 0.1)",
    icon: Building2,
  },
  github: {
    label: "GitHub",
    color: "var(--text-secondary)",
    bg: "var(--bg-hover)",
    icon: GitBranch,
  },
  custom: {
    label: "Installed",
    color: "var(--accent)",
    bg: "var(--accent-subtle)",
    icon: Package,
  },
};

const categoryIcons: Record<string, typeof Wrench> = {
  Research: Globe,
  Development: Wrench,
  Data: Database,
  Content: PenTool,
  Community: GitBranch,
};

export default function SkillsPage() {
  const { showToast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmSkill, setDeleteConfirmSkill] = useState<Skill | null>(null);

  const refreshSkills = async () => {
    try {
      const res = await fetch("/api/skills");
      if (res.ok) {
        const data = await res.json();
        setSkills(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const [skillsRes, agentsRes] = await Promise.all([
          fetch("/api/skills"),
          fetch("/api/agents"),
        ]);
        const skillsData = skillsRes.ok ? await skillsRes.json() : [];
        const agentsData = agentsRes.ok ? await agentsRes.json() : [];
        setSkills(Array.isArray(skillsData) ? skillsData : []);
        setAgents(Array.isArray(agentsData) ? agentsData : []);
        if (skillsData.length > 0) {
          setSelectedId(skillsData[0].id);
        }
      } catch {
        // API may not be ready
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      if (activeTab !== "all" && s.source !== activeTab) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [skills, activeTab, searchQuery]);

  const selectedSkill = skills.find((s) => s.id === selectedId) || null;

  const handleInstall = async (skill: Skill) => {
    if (!skill.anthropic_skill_id) return;
    setInstallingId(skill.id);
    try {
      const res = await fetch("/api/skills/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anthropic_skill_id: skill.anthropic_skill_id,
          name: skill.name,
          description: skill.description,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to install skill", "error");
        return;
      }
      showToast(`${skill.name} installed successfully`, "success");
    } catch {
      showToast("Network error while installing skill", "error");
    } finally {
      setInstallingId(null);
    }
  };

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError("");
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_url: importUrl.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        setImportError(err.error || "Import failed");
        return;
      }
      const newSkill = await res.json();
      await refreshSkills();
      setSelectedId(newSkill.id);
      setActiveTab("all");
      setImportUrl("");
      setImportModalOpen(false);
      showToast(`${newSkill.name} installed`, "success");
    } catch {
      setImportError("Network error. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteSkill = (skill: Skill) => {
    setDeleteConfirmSkill(skill);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmSkill) return;
    const skill = deleteConfirmSkill;
    setDeletingId(skill.id);
    setDeleteConfirmSkill(null);
    try {
      const res = await fetch(`/api/skills/${encodeURIComponent(skill.id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSkills((prev) => prev.filter((s) => s.id !== skill.id));
        if (selectedId === skill.id) {
          setSelectedId(skills.find((s) => s.id !== skill.id)?.id ?? null);
        }
        showToast(`${skill.name} deleted`, "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to delete skill", "error");
      }
    } catch {
      showToast("Failed to delete skill", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "custom", label: "Installed" },
    { key: "bundled", label: "Bundled" },
    { key: "anthropic", label: "Anthropic" },
    { key: "github", label: "GitHub" },
    { key: "library", label: "Library" },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
            <Sparkles size={24} color="var(--accent)" />
            Skills
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Browse, import, and attach skills to your agents.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setImportModalOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <GitBranch size={16} />
          Import from GitHub
        </button>
      </div>

      {activeTab === "library" ? (
        <LibraryBrowser
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onInstalled={refreshSkills}
        />
      ) : (
      <div
        style={{
          display: "flex",
          gap: 0,
          border: "1px solid var(--border-color)",
          borderRadius: 12,
          overflow: "hidden",
          height: "calc(100vh - 200px)",
          minHeight: 500,
        }}
      >
        {/* Sidebar List */}
        <div
          style={{
            width: "30%",
            minWidth: 280,
            maxWidth: 380,
            background: "var(--bg-card)",
            borderRight: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search */}
          <div style={{ padding: "16px 16px 12px" }}>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search skills..."
                style={{
                  width: "100%",
                  padding: "8px 10px 8px 34px",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 6,
                  color: "var(--text-primary)",
                  fontSize: 13,
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: "0 16px 12px",
              borderBottom: "1px solid var(--border-color)",
              overflowX: "auto",
              flexShrink: 0,
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "5px 10px",
                  fontSize: 12,
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  color:
                    activeTab === tab.key
                      ? "var(--accent)"
                      : "var(--text-secondary)",
                  background:
                    activeTab === tab.key
                      ? "var(--accent-subtle)"
                      : "transparent",
                  border:
                    activeTab === tab.key
                      ? "1px solid var(--accent)"
                      : "1px solid transparent",
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Skill List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {loading ? (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                Loading skills...
              </div>
            ) : filteredSkills.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {activeTab === "anthropic"
                  ? "Anthropic Skills Library is coming soon. Check back as more official skills are published."
                  : "No skills found"}
              </div>
            ) : (
              filteredSkills.map((skill) => {
                const config = sourceConfig[skill.source] || sourceConfig.bundled;
                const isSelected = selectedId === skill.id;
                return (
                  <button
                    key={skill.id}
                    onClick={() => setSelectedId(skill.id)}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "12px 16px",
                      textAlign: "left",
                      background: isSelected
                        ? "var(--accent-subtle)"
                        : "transparent",
                      border: "none",
                      borderLeft: isSelected
                        ? "3px solid var(--accent)"
                        : "3px solid transparent",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background =
                          "var(--bg-card-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: isSelected
                            ? "var(--accent)"
                            : "var(--text-primary)",
                        }}
                      >
                        {skill.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: config.bg,
                          color: config.color,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {config.label}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        margin: 0,
                      }}
                    >
                      {skill.description}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div
          style={{
            flex: 1,
            background: "var(--bg-primary)",
            overflow: "hidden",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {selectedSkill ? (
            <SkillDetail
              skill={selectedSkill}
              agents={agents}
              onInstall={handleInstall}
              installing={installingId === selectedSkill.id}
              onDelete={handleDeleteSkill}
              deleting={deletingId === selectedSkill.id}
            />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--text-muted)",
                fontSize: 14,
              }}
            >
              <Sparkles
                size={40}
                style={{ marginBottom: 16, opacity: 0.3 }}
              />
              Select a skill to view details
            </div>
          )}
        </div>
      </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirmSkill !== null}
        onClose={() => setDeleteConfirmSkill(null)}
        title="Delete skill"
      >
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          Are you sure you want to delete <strong>{deleteConfirmSkill?.name}</strong>?
          {deleteConfirmSkill?.id.startsWith("skill_") && (
            <> This will remove it from Anthropic&apos;s Skills API and detach it from any agents using it.</>
          )}
          {" "}This action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={() => setDeleteConfirmSkill(null)}
            className="btn-secondary"
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            disabled={deletingId !== null}
            style={{
              background: "var(--error)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              opacity: deletingId ? 0.6 : 1,
              cursor: "pointer",
            }}
          >
            {deletingId ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        open={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportError("");
          setImportUrl("");
        }}
        title="Import Skill from GitHub"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              margin: 0,
            }}
          >
            Provide a GitHub repository URL or user/repo shorthand. The
            skill content will be pulled from SKILL.md or README.md.
          </p>
          <div style={{ position: "relative" }}>
            <LinkIcon
              size={16}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              value={importUrl}
              onChange={(e) => {
                setImportUrl(e.target.value);
                setImportError("");
              }}
              placeholder="https://github.com/user/repo or user/repo"
              style={{
                width: "100%",
                padding: "10px 12px 10px 34px",
                background: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                borderRadius: 6,
                color: "var(--text-primary)",
                fontSize: 14,
                outline: "none",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleImport();
              }}
            />
          </div>
          {importError && (
            <p style={{ fontSize: 13, color: "var(--error)", margin: 0 }}>
              {importError}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="btn-secondary"
              onClick={() => {
                setImportModalOpen(false);
                setImportError("");
                setImportUrl("");
              }}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleImport}
              disabled={importing || !importUrl.trim()}
              style={{
                opacity: importing || !importUrl.trim() ? 0.6 : 1,
              }}
            >
              {importing ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skill Detail Sub-component with file tree + pretty/raw toggle
// ---------------------------------------------------------------------------

interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
}

function SkillDetail({
  skill,
  agents,
  onInstall,
  installing,
  onDelete,
  deleting,
}: {
  skill: Skill;
  agents: Agent[];
  onInstall: (skill: Skill) => void;
  installing: boolean;
  onDelete: (skill: Skill) => void;
  deleting: boolean;
}) {
  const { showToast } = useToast();
  const [attachAgent, setAttachAgent] = useState("");
  const [attaching, setAttaching] = useState(false);
  const [attachedAgents, setAttachedAgents] = useState<Set<string>>(new Set());

  // File tree state
  const [files, setFiles] = useState<FileNode[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState("SKILL.md");
  const [fileContent, setFileContent] = useState(skill.content);
  const [fileLoading, setFileLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"pretty" | "raw">("pretty");
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const config = sourceConfig[skill.source] || sourceConfig.bundled;
  const SourceIcon = config.icon;
  const CategoryIcon = categoryIcons[skill.category] || FileText;
  const canAttach = skill.id.startsWith("skill_") || skill.source === "custom";

  // Fetch file tree
  useEffect(() => {
    setSelectedFile("SKILL.md");
    setFileContent(skill.content);
    setViewMode("pretty");
    setExpandedDirs(new Set());

    if (skill.id.startsWith("bundled-")) {
      setFiles([{ name: "SKILL.md", path: "SKILL.md", type: "file" }]);
      return;
    }

    setFilesLoading(true);
    fetch(`/api/skills/${encodeURIComponent(skill.id)}/files`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFiles(data);
        } else {
          setFiles([{ name: "SKILL.md", path: "SKILL.md", type: "file" }]);
        }
      })
      .catch(() =>
        setFiles([{ name: "SKILL.md", path: "SKILL.md", type: "file" }])
      )
      .finally(() => setFilesLoading(false));
  }, [skill.id, skill.content]);

  // Load file content when selecting a file
  const loadFile = useCallback(
    async (path: string) => {
      setSelectedFile(path);
      if ((path === "SKILL.md" || path === "README.md") && skill.content) {
        setFileContent(skill.content);
        return;
      }
      setFileLoading(true);
      try {
        const res = await fetch(
          `/api/skills/${encodeURIComponent(skill.id)}/files`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          setFileContent(data.content || "");
        } else {
          setFileContent("// Failed to load file");
        }
      } catch {
        setFileContent("// Failed to load file");
      } finally {
        setFileLoading(false);
      }
    },
    [skill.id, skill.content]
  );

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleAttach = async () => {
    if (!attachAgent || !canAttach) return;
    setAttaching(true);
    try {
      const res = await fetch("/api/skills/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: attachAgent,
          skill_id: skill.id,
          skill_type: "custom",
        }),
      });
      if (res.ok) {
        const agentName =
          agents.find((a) => a.id === attachAgent)?.name || "agent";
        setAttachedAgents((prev) => new Set(prev).add(attachAgent));
        setAttachAgent("");
        showToast(`${skill.name} attached to ${agentName}`, "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to attach skill", "error");
      }
    } catch {
      showToast("Failed to attach skill", "error");
    } finally {
      setAttaching(false);
    }
  };

  const copyContent = () => {
    navigator.clipboard?.writeText(fileContent).catch(() => {});
    showToast("Copied to clipboard", "success");
  };

  const isMarkdown =
    selectedFile.endsWith(".md") || selectedFile.endsWith(".markdown");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: "0 0 4px",
            }}
          >
            {skill.name}
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: config.color,
                background: config.bg,
                padding: "2px 7px",
                borderRadius: 4,
                fontWeight: 500,
              }}
            >
              <SourceIcon size={11} />
              {config.label}
            </span>
            <span>{skill.author}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!skill.id.startsWith("bundled-") && (
            <button
              onClick={() => onDelete(skill)}
              disabled={deleting}
              className="btn-secondary"
              style={{
                padding: "7px 12px",
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: "var(--error)",
              }}
            >
              <Trash2 size={13} />
              {deleting ? "..." : "Delete"}
            </button>
          )}
        </div>
      </div>

      {/* Attach to Agent (compact) */}
      {canAttach && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            padding: "10px 14px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
          }}
        >
          <label
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            Attach to:
          </label>
          <select
            value={attachAgent}
            onChange={(e) => setAttachAgent(e.target.value)}
            style={{
              flex: 1,
              padding: "6px 8px",
              fontSize: 12,
            }}
          >
            <option value="">Select agent...</option>
            {agents
              .filter((a) => !attachedAgents.has(a.id))
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
          <button
            className="btn-primary"
            onClick={handleAttach}
            disabled={!attachAgent || attaching}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              opacity: !attachAgent || attaching ? 0.5 : 1,
            }}
          >
            {attaching ? "..." : "Attach"}
          </button>
          {attachedAgents.size > 0 && (
            <span
              style={{
                fontSize: 11,
                color: "var(--success)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                whiteSpace: "nowrap",
              }}
            >
              <Check size={12} />
              {attachedAgents.size} agent{attachedAgents.size > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* File tree + content viewer */}
      <div
        style={{
          display: "flex",
          border: "1px solid var(--border-color)",
          borderRadius: 10,
          overflow: "hidden",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* File tree sidebar */}
        <div
          style={{
            width: 200,
            minWidth: 200,
            background: "var(--bg-secondary)",
            borderRight: "1px solid var(--border-color)",
            overflowY: "auto",
            padding: "8px 0",
          }}
        >
          {filesLoading ? (
            <div
              style={{
                padding: 16,
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              Loading...
            </div>
          ) : (
            <FileTree
              nodes={files}
              selectedPath={selectedFile}
              expandedDirs={expandedDirs}
              onSelectFile={loadFile}
              onToggleDir={toggleDir}
              depth={0}
            />
          )}
        </div>

        {/* Content viewer */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-primary)",
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 14px",
              borderBottom: "1px solid var(--border-color)",
              background: "var(--bg-card)",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-secondary)",
                fontFamily: "monospace",
              }}
            >
              {selectedFile}
            </span>
            <div style={{ display: "flex", gap: 2 }}>
              {isMarkdown && (
                <>
                  <button
                    onClick={() => setViewMode("pretty")}
                    title="Pretty view"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: "none",
                      background:
                        viewMode === "pretty"
                          ? "var(--accent-subtle)"
                          : "transparent",
                      color:
                        viewMode === "pretty"
                          ? "var(--accent)"
                          : "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => setViewMode("raw")}
                    title="Raw view"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: "none",
                      background:
                        viewMode === "raw"
                          ? "var(--accent-subtle)"
                          : "transparent",
                      color:
                        viewMode === "raw"
                          ? "var(--accent)"
                          : "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    <Code size={14} />
                  </button>
                </>
              )}
              <button
                onClick={copyContent}
                title="Copy content"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: isMarkdown && viewMode === "pretty" ? "20px 24px" : 0,
            }}
          >
            {fileLoading ? (
              <div
                style={{
                  padding: 24,
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                Loading file...
              </div>
            ) : isMarkdown && viewMode === "pretty" ? (
              <div>{renderMarkdown(fileContent)}</div>
            ) : (
              <pre
                style={{
                  margin: 0,
                  padding: "16px 20px",
                  fontFamily: "monospace",
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "var(--text-primary)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  counterReset: "line",
                }}
              >
                {fileContent.split("\n").map((line, i) => (
                  <div key={i} style={{ display: "flex" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 45,
                        textAlign: "right",
                        paddingRight: 16,
                        color: "var(--text-muted)",
                        userSelect: "none",
                        flexShrink: 0,
                        opacity: 0.5,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span>{line || " "}</span>
                  </div>
                ))}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FileTree({
  nodes,
  selectedPath,
  expandedDirs,
  onSelectFile,
  onToggleDir,
  depth,
}: {
  nodes: FileNode[];
  selectedPath: string;
  expandedDirs: Set<string>;
  onSelectFile: (path: string) => void;
  onToggleDir: (path: string) => void;
  depth: number;
}) {
  return (
    <>
      {nodes.map((node) => {
        const isDir = node.type === "dir";
        const isExpanded = expandedDirs.has(node.path);
        const isSelected = selectedPath === node.path;

        return (
          <div key={node.path}>
            <button
              onClick={() =>
                isDir ? onToggleDir(node.path) : onSelectFile(node.path)
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                padding: `4px 10px 4px ${12 + depth * 14}px`,
                fontSize: 12,
                fontFamily: "monospace",
                background: isSelected
                  ? "var(--accent-subtle)"
                  : "transparent",
                color: isSelected
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              onMouseEnter={(e) => {
                if (!isSelected)
                  e.currentTarget.style.background = "var(--bg-card-hover)";
              }}
              onMouseLeave={(e) => {
                if (!isSelected)
                  e.currentTarget.style.background = "transparent";
              }}
              title={node.path}
            >
              {isDir ? (
                <>
                  <ChevronDown
                    size={12}
                    style={{
                      transform: isExpanded
                        ? "rotate(0deg)"
                        : "rotate(-90deg)",
                      transition: "transform 0.15s",
                      flexShrink: 0,
                    }}
                  />
                  <Folder
                    size={13}
                    color="var(--text-muted)"
                    style={{ flexShrink: 0 }}
                  />
                </>
              ) : (
                <>
                  <span style={{ width: 12, flexShrink: 0 }} />
                  <File
                    size={13}
                    color="var(--text-muted)"
                    style={{ flexShrink: 0 }}
                  />
                </>
              )}
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontWeight:
                    node.name === "SKILL.md" || node.name === "README.md"
                      ? 600
                      : 400,
                }}
              >
                {node.name}
              </span>
            </button>
            {isDir && isExpanded && node.children && (
              <FileTree
                nodes={node.children}
                selectedPath={selectedPath}
                expandedDirs={expandedDirs}
                onSelectFile={onSelectFile}
                onToggleDir={onToggleDir}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

function renderMarkdown(content: string): React.ReactNode[] {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={i}
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginTop: 8,
            marginBottom: 12,
          }}
        >
          {line.replace("# ", "")}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginTop: 24,
            marginBottom: 10,
            paddingBottom: 6,
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          {line.replace("## ", "")}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={i}
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginTop: 18,
            marginBottom: 6,
          }}
        >
          {line.replace("### ", "")}
        </h3>
      );
    } else if (line.startsWith("- **")) {
      const match = line.match(/^- \*\*(.+?)\*\*\s*[-:]\s*(.+)/);
      if (match) {
        elements.push(
          <div
            key={i}
            style={{
              padding: "3px 0 3px 16px",
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: "var(--text-primary)" }}>
              {match[1]}
            </strong>{" "}
            — {match[2]}
          </div>
        );
      }
    } else if (line.startsWith("- ")) {
      elements.push(
        <div
          key={i}
          style={{
            padding: "2px 0 2px 16px",
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: 2,
              color: "var(--text-muted)",
            }}
          >
            •
          </span>
          {line.replace(/^- /, "")}
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(
        <p
          key={i}
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            paddingLeft: 16,
            margin: "2px 0",
          }}
        >
          {line}
        </p>
      );
    } else if (line.startsWith("```")) {
      // skip code fence markers
    } else if (line.startsWith("---") && i < 5) {
      // skip frontmatter delimiters
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: 6 }} />);
    } else {
      elements.push(
        <p
          key={i}
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.7,
            margin: "3px 0",
          }}
        >
          {line}
        </p>
      );
    }
  });

  return elements;
}

// ---------------------------------------------------------------------------
// Library Browser — searches the community skills registry
// ---------------------------------------------------------------------------

function LibraryBrowser({
  tabs,
  activeTab,
  onTabChange,
  onInstalled,
}: {
  tabs: { key: FilterTab; label: string }[];
  activeTab: FilterTab;
  onTabChange: (t: FilterTab) => void;
  onInstalled?: () => void;
}) {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState<"installs" | "name">("installs");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LibraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [installingKey, setInstallingKey] = useState<string | null>(null);
  const [installedKeys, setInstalledKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, sortBy]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "20",
          sortBy,
          sortOrder: "desc",
        });
        if (debouncedQuery) params.set("query", debouncedQuery);
        const res = await fetch(`/api/skills/library?${params}`);
        if (!res.ok) {
          if (!cancelled) setData(null);
          return;
        }
        const json: LibraryResponse = await res.json();
        if (!cancelled) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedQuery, sortBy]);

  const handleInstall = async (s: LibrarySkill) => {
    const key = `${s.owner}/${s.repo}/${s.skillId}`;
    setInstallingKey(key);
    try {
      const res = await fetch("/api/skills/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "github",
          owner: s.owner,
          repo: s.repo,
          skillId: s.skillId,
          displayName: s.displayName ?? s.name,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Install failed", "error");
        return;
      }
      setInstalledKeys((prev) => new Set(prev).add(key));
      showToast(`${s.displayName ?? s.name} installed and uploaded to Anthropic`, "success");
      onInstalled?.();
    } catch {
      showToast("Network error", "error");
    } finally {
      setInstallingKey(null);
    }
  };

  return (
    <div
      style={{
        border: "1px solid var(--border-color)",
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--bg-card)",
      }}
    >
      {/* Header — tabs + search + sort */}
      <div
        style={{
          padding: 16,
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: activeTab === tab.key ? 600 : 400,
                color:
                  activeTab === tab.key
                    ? "var(--accent)"
                    : "var(--text-secondary)",
                background:
                  activeTab === tab.key
                    ? "var(--accent-subtle)"
                    : "transparent",
                border:
                  activeTab === tab.key
                    ? "1px solid var(--accent)"
                    : "1px solid transparent",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 34,000+ skills from 2,800+ repos..."
              style={{
                width: "100%",
                padding: "9px 10px 9px 34px",
                background: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                borderRadius: 6,
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "installs" | "name")
            }
            style={{
              padding: "9px 10px",
              background: "var(--bg-input)",
              border: "1px solid var(--border-color)",
              borderRadius: 6,
              color: "var(--text-primary)",
              fontSize: 13,
            }}
          >
            <option value="installs">Most installs</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Library size={13} />
            Community skills registry
            {data?.scrapedAt && (
              <span>
                {" "}
                · updated {new Date(data.scrapedAt).toLocaleDateString()}
              </span>
            )}
          </span>
          {data && (
            <span>
              {data.total.toLocaleString()} matching
              {debouncedQuery ? ` "${debouncedQuery}"` : ""}
              {data.totalInRegistry
                ? ` of ${data.totalInRegistry.toLocaleString()}`
                : ""}
            </span>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{ maxHeight: "calc(100vh - 360px)", overflowY: "auto" }}>
        {loading ? (
          <div
            style={{
              padding: 48,
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            Loading library…
          </div>
        ) : !data || data.results.length === 0 ? (
          <div
            style={{
              padding: 48,
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            No skills found{debouncedQuery ? ` for "${debouncedQuery}"` : ""}.
          </div>
        ) : (
          data.results.map((s) => {
            const key = `${s.owner}/${s.repo}/${s.skillId}`;
            const installing = installingKey === key;
            const installed = installedKeys.has(key);
            return (
              <div
                key={key}
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {s.displayName || s.name}
                    </span>
                    {typeof s.installs === "number" && s.installs > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "var(--accent-subtle)",
                          color: "var(--accent)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <Download size={10} />
                        {s.installs.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontFamily: "monospace" }}>
                      {s.owner}/{s.repo}
                    </span>
                    <span>·</span>
                    <a
                      href={s.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        color: "var(--text-secondary)",
                        textDecoration: "none",
                      }}
                    >
                      <ExternalLink size={11} />
                      GitHub
                    </a>
                  </div>
                </div>
                {installed ? (
                  <span
                    style={{
                      padding: "7px 14px",
                      fontSize: 13,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      flexShrink: 0,
                      color: "var(--success)",
                      fontWeight: 500,
                    }}
                  >
                    <Check size={14} />
                    Installed
                  </span>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={() => handleInstall(s)}
                    disabled={installing}
                    style={{
                      padding: "7px 14px",
                      fontSize: 13,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      opacity: installing ? 0.6 : 1,
                      flexShrink: 0,
                    }}
                  >
                    <Plus size={14} />
                    {installing ? "Installing…" : "Install"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {data && data.pageCount > 1 && (
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          <span>
            Page {data.page} of {data.pageCount}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn-secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page <= 1}
              style={{
                padding: "6px 10px",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                opacity: data.page <= 1 ? 0.5 : 1,
              }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              className="btn-secondary"
              onClick={() =>
                setPage((p) => Math.min(data.pageCount, p + 1))
              }
              disabled={data.page >= data.pageCount}
              style={{
                padding: "6px 10px",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                opacity: data.page >= data.pageCount ? 0.5 : 1,
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
