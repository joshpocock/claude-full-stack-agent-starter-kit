import { NextResponse } from "next/server";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
}

/**
 * GET /api/skills/:id/files
 * Returns the file tree for a skill. For GitHub-imported skills, fetches the
 * repo tree from GitHub. For others, returns a single SKILL.md entry.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Look up the skill in local DB to get the github_url
    let githubUrl: string | null = null;
    try {
      const { getDb } = await import("@/lib/db");
      const db = getDb();
      const row = db
        .prepare("SELECT github_url FROM imported_skills WHERE id = ?")
        .get(id) as { github_url: string } | undefined;
      githubUrl = row?.github_url ?? null;
    } catch {
      // not found
    }

    // If we have a GitHub URL, fetch the repo tree
    if (githubUrl) {
      const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        const [, owner, repo] = match;
        const tree = await fetchGitHubTree(owner, repo.replace(/\.git$/, ""));
        if (tree) {
          return NextResponse.json(tree);
        }
      }
    }

    // Fallback: return a single SKILL.md entry
    return NextResponse.json([
      { name: "SKILL.md", path: "SKILL.md", type: "file" },
    ]);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/skills/:id/files?path=some/file.md
 * Fetches the raw content of a specific file from the GitHub repo.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { path: filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    // Look up skill to get GitHub URL
    let githubUrl: string | null = null;
    let storedContent: string | null = null;
    try {
      const { getDb } = await import("@/lib/db");
      const db = getDb();
      const row = db
        .prepare("SELECT github_url, content FROM imported_skills WHERE id = ?")
        .get(id) as { github_url: string; content: string } | undefined;
      githubUrl = row?.github_url ?? null;
      storedContent = row?.content ?? null;
    } catch {
      // not found
    }

    // If requesting SKILL.md and we have stored content, return it
    if (filePath === "SKILL.md" && storedContent) {
      return NextResponse.json({ content: storedContent });
    }

    // Fetch from GitHub
    if (githubUrl) {
      const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        const [, owner, repo] = match;
        const cleanRepo = repo.replace(/\.git$/, "");

        for (const branch of ["main", "master"]) {
          const url = `https://raw.githubusercontent.com/${owner}/${cleanRepo}/${branch}/${filePath}`;
          const res = await fetch(url);
          if (res.ok) {
            const content = await res.text();
            return NextResponse.json({ content });
          }
        }
      }
    }

    return NextResponse.json(
      { error: "File not found" },
      { status: 404 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function fetchGitHubTree(
  owner: string,
  repo: string
): Promise<FileNode[] | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // Try main then master
  for (const branch of ["main", "master"]) {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const res = await fetch(url, { headers });
    if (!res.ok) continue;

    const data = await res.json();
    if (!data.tree) continue;

    // Build tree structure from flat list
    const root: FileNode[] = [];
    const dirMap = new Map<string, FileNode>();

    // Sort: directories first, then files
    const items = (data.tree as Array<{ path: string; type: string }>)
      .filter((t) => t.type === "blob" || t.type === "tree")
      .sort((a, b) => a.path.localeCompare(b.path));

    for (const item of items) {
      const parts = item.path.split("/");
      const name = parts[parts.length - 1];
      const isDir = item.type === "tree";

      const node: FileNode = {
        name,
        path: item.path,
        type: isDir ? "dir" : "file",
        ...(isDir && { children: [] }),
      };

      if (parts.length === 1) {
        root.push(node);
      } else {
        const parentPath = parts.slice(0, -1).join("/");
        const parent = dirMap.get(parentPath);
        if (parent?.children) {
          parent.children.push(node);
        }
      }

      if (isDir) {
        dirMap.set(item.path, node);
      }
    }

    // Sort: SKILL.md first, then dirs, then files
    const sortNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.sort((a, b) => {
        if (a.name === "SKILL.md") return -1;
        if (b.name === "SKILL.md") return 1;
        if (a.name === "README.md") return -1;
        if (b.name === "README.md") return 1;
        if (a.type === "dir" && b.type === "file") return -1;
        if (a.type === "file" && b.type === "dir") return 1;
        return a.name.localeCompare(b.name);
      });
    };

    const sortTree = (nodes: FileNode[]): FileNode[] => {
      return sortNodes(nodes).map((n) => ({
        ...n,
        ...(n.children && { children: sortTree(n.children) }),
      }));
    };

    return sortTree(root);
  }

  return null;
}
