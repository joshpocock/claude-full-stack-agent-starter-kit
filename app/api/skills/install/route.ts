import { NextResponse } from "next/server";
import { uploadSkill } from "@/lib/skills-api";

/**
 * POST /api/skills/install
 *
 * Install paths:
 *
 * 1. GitHub/Library skill: body { source: "github", owner, repo, skillId?,
 *    displayName?, name? }
 *    Fetches SKILL.md/README.md from the repo, uploads to Anthropic Skills API,
 *    and stores metadata locally.
 *
 * 2. Direct content: body { source: "content", name, content, description? }
 *    Uploads provided content directly to Anthropic Skills API.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const source = body?.source || "github";

    if (source === "github" || source === "mastra") {
      return installFromGitHub(body);
    }

    if (source === "content") {
      return installFromContent(body);
    }

    return NextResponse.json(
      { error: `Unknown source: ${source}` },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to install skill";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function installFromContent(body: {
  name: string;
  content: string;
  description?: string;
}) {
  const { name, content, description } = body;
  if (!name || !content) {
    return NextResponse.json(
      { error: "name and content are required" },
      { status: 400 }
    );
  }

  // Ensure content has proper SKILL.md frontmatter
  const dirName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let skillContent = content;
  if (!content.startsWith("---")) {
    skillContent = `---\nname: ${dirName}\ndescription: ${description || name}\n---\n\n${content}`;
  }

  const uploaded = await uploadSkill({
    displayTitle: name,
    skillMdContent: skillContent,
    dirName,
  });

  // Store locally for tracking
  const skill = {
    id: uploaded.id,
    name,
    description: description || name,
    author: "Custom",
    source: "custom" as const,
    category: "Custom",
    content: skillContent,
    anthropic_skill_id: uploaded.id,
    anthropic_version: uploaded.latest_version,
  };

  try {
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    ensureImportedSkillsTable(db);
    db.prepare(
      `INSERT OR REPLACE INTO imported_skills (id, name, description, author, source, category, content, github_url)
       VALUES (@id, @name, @description, @author, @source, @category, @content, @github_url)`
    ).run({ ...skill, github_url: null });
  } catch {
    // best effort
  }

  return NextResponse.json(skill, { status: 201 });
}

interface GitHubInstallBody {
  source: string;
  owner: string;
  repo: string;
  skillId?: string;
  displayName?: string;
  name?: string;
}

async function installFromGitHub(body: GitHubInstallBody) {
  const { owner, repo, skillId, displayName, name } = body;
  if (!owner || !repo) {
    return NextResponse.json(
      { error: "owner and repo are required" },
      { status: 400 }
    );
  }

  const ghHeaders: Record<string, string> = {
    Accept: "application/vnd.github.v3.raw",
  };
  if (process.env.GITHUB_TOKEN) {
    ghHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // Build candidate URLs for SKILL.md / README.md
  const candidates: string[] = [];
  if (skillId) {
    candidates.push(
      `https://raw.githubusercontent.com/${owner}/${repo}/main/skills/${skillId}/SKILL.md`,
      `https://raw.githubusercontent.com/${owner}/${repo}/master/skills/${skillId}/SKILL.md`,
      `https://raw.githubusercontent.com/${owner}/${repo}/main/${skillId}/SKILL.md`
    );
  }
  candidates.push(
    `https://raw.githubusercontent.com/${owner}/${repo}/main/SKILL.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/master/SKILL.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`
  );

  let content = "";
  let fetchedFrom = "";
  for (const url of candidates) {
    const res = await fetch(url, { headers: ghHeaders });
    if (res.ok) {
      content = await res.text();
      fetchedFrom = url;
      break;
    }
  }

  if (!content) {
    return NextResponse.json(
      {
        error: `Could not locate SKILL.md or README.md for ${owner}/${repo}. Tried ${candidates.length} paths.`,
      },
      { status: 404 }
    );
  }

  // Extract description from YAML frontmatter or first prose line
  let description = `Imported from ${owner}/${repo}`;
  const fm = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (fm) {
    const d = fm[1].match(/description:\s*(.+)/);
    if (d) description = d[1].trim().replace(/^['"]|['"]$/g, "");
  }
  if (description.startsWith("Imported from")) {
    for (const line of content.split("\n")) {
      const t = line.trim();
      if (t && !t.startsWith("#") && !t.startsWith("---") && t.length > 10) {
        description = t.substring(0, 200);
        break;
      }
    }
  }

  const finalName =
    name ||
    displayName ||
    (skillId || repo)
      .split(/[-_]/)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const dirName = (skillId || repo)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Ensure content has proper SKILL.md frontmatter
  let skillContent = content;
  if (!content.startsWith("---")) {
    skillContent = `---\nname: ${dirName}\ndescription: ${description}\n---\n\n${content}`;
  }

  // Upload to Anthropic Skills API
  let anthropicId: string | null = null;
  let anthropicVersion: string | null = null;
  try {
    const uploaded = await uploadSkill({
      displayTitle: finalName,
      skillMdContent: skillContent,
      dirName,
    });
    anthropicId = uploaded.id;
    anthropicVersion = uploaded.latest_version;
  } catch (err) {
    // If upload fails, still save locally with a local ID
    console.error("Skills API upload failed, saving locally:", err);
  }

  const id = anthropicId || `github-${owner}-${repo}-${skillId || "root"}-${Date.now()}`;

  const skill = {
    id,
    name: finalName,
    description,
    author: owner,
    source: anthropicId ? ("custom" as const) : ("github" as const),
    category: "Community",
    content: skillContent,
    anthropic_skill_id: anthropicId,
    anthropic_version: anthropicVersion,
  };

  // Store in local DB for tracking
  try {
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    ensureImportedSkillsTable(db);
    db.prepare(
      `INSERT OR REPLACE INTO imported_skills (id, name, description, author, source, category, content, github_url)
       VALUES (@id, @name, @description, @author, @source, @category, @content, @github_url)`
    ).run({
      ...skill,
      github_url: `https://github.com/${owner}/${repo}`,
    });
  } catch {
    // DB persistence best-effort
  }

  return NextResponse.json(skill, { status: 201 });
}

function ensureImportedSkillsTable(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS imported_skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      author TEXT NOT NULL,
      source TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      github_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
}
