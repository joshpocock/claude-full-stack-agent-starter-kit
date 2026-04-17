import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Bundled skills -- always available
// ---------------------------------------------------------------------------

export interface BundledSkill {
  id: string;
  name: string;
  description: string;
  author: string;
  source: "bundled" | "anthropic" | "github" | "custom";
  category: string;
  content: string;
  anthropic_skill_id?: string;
}

const BUNDLED_SKILLS: BundledSkill[] = [
  {
    id: "bundled-deep-researcher",
    name: "Deep Researcher",
    description: "Conducts multi-source web research, synthesizes findings, and produces structured reports with citations.",
    author: "Anthropic",
    source: "bundled",
    category: "Research",
    content: `# Deep Researcher

A skill for conducting thorough web research and producing structured reports.

## Capabilities

- Multi-source web research with citation tracking
- Automatic claim verification across sources
- Structured report generation with executive summary
- Source quality assessment and ranking
- Follow-up question generation

## Usage

Attach this skill to an agent and ask it to research any topic. The agent will search multiple sources, cross-reference claims, and produce a formatted report.

## Configuration

No additional configuration required. The skill uses the agent's built-in web search tools.

## Example Prompts

- "Research the current state of quantum computing in 2026"
- "Compare the top 5 project management tools for remote teams"
- "Investigate recent developments in solid-state batteries"
`,
  },
  {
    id: "bundled-code-reviewer",
    name: "Code Reviewer",
    description: "Reviews pull requests with a structured checklist covering security, performance, and best practices.",
    author: "Anthropic",
    source: "bundled",
    category: "Development",
    content: `# Code Reviewer

A skill for performing thorough, structured code reviews on pull requests.

## Capabilities

- Security vulnerability detection
- Performance bottleneck identification
- Code style and consistency checks
- Test coverage analysis
- Dependency audit
- Architecture pattern validation

## Review Checklist

1. **Security** - SQL injection, XSS, auth bypass, secret exposure
2. **Performance** - N+1 queries, unnecessary re-renders, memory leaks
3. **Correctness** - Edge cases, error handling, race conditions
4. **Style** - Naming conventions, code organization, documentation
5. **Tests** - Coverage gaps, flaky test patterns, missing assertions

## Usage

Attach to an agent with GitHub MCP server access. Provide a PR URL or diff and the agent will produce a structured review.
`,
  },
  {
    id: "bundled-data-processor",
    name: "Data Processor",
    description: "Analyzes CSV, JSON, and tabular data with summary statistics, filtering, and transformation.",
    author: "Anthropic",
    source: "bundled",
    category: "Data",
    content: `# Data Processor

A skill for analyzing and transforming structured data files.

## Capabilities

- CSV and JSON file parsing
- Summary statistics (mean, median, mode, std dev)
- Data filtering and grouping
- Format conversion (CSV to JSON, JSON to CSV)
- Outlier detection
- Trend analysis and visualization descriptions

## Usage

Attach this skill to an agent and provide a data file or paste tabular data. The agent will analyze the data and provide insights.

## Supported Formats

- CSV (comma, tab, pipe delimited)
- JSON (arrays, nested objects)
- TSV
- JSONL (newline-delimited JSON)
`,
  },
  {
    id: "bundled-content-writer",
    name: "Content Writer",
    description: "Writes blog posts, documentation, and long-form content with SEO optimization and consistent tone.",
    author: "Anthropic",
    source: "bundled",
    category: "Content",
    content: `# Content Writer

A skill for producing high-quality written content across multiple formats.

## Capabilities

- Blog post writing with SEO optimization
- Technical documentation generation
- Tutorial and how-to guide creation
- Content outline and structure planning
- Tone and style adaptation
- Meta description and title tag generation

## Content Types

- **Blog Posts** - SEO-optimized articles with headers, internal links
- **Documentation** - API docs, user guides, README files
- **Tutorials** - Step-by-step guides with code examples
- **Landing Pages** - Conversion-focused copy

## Usage

Attach to an agent and provide a topic, target audience, and desired format. The agent will produce publication-ready content.
`,
  },
  {
    id: "bundled-web-scraper",
    name: "Web Scraper",
    description: "Extracts structured data from websites with configurable selectors and pagination support.",
    author: "Anthropic",
    source: "bundled",
    category: "Data",
    content: `# Web Scraper

A skill for extracting structured data from web pages.

## Capabilities

- URL content extraction and parsing
- CSS selector-based data extraction
- Pagination handling
- Rate limiting and polite crawling
- Output formatting (JSON, CSV)
- Error handling and retry logic

## Usage

Attach this skill to an agent and provide a URL along with what data you want extracted. The agent will fetch the page, parse the content, and return structured data.

## Configuration

- **Rate Limiting** - Built-in delays between requests
- **User Agent** - Configurable request headers
- **Timeout** - Adjustable page load timeout
- **Retries** - Automatic retry on transient failures
`,
  },
  {
    id: "bundled-api-integration",
    name: "API Integration",
    description: "Connects to REST APIs, handles auth, pagination, and error retries.",
    author: "Anthropic",
    source: "bundled",
    category: "Development",
    content: `# API Integration

A skill for connecting to and interacting with REST APIs.

## Capabilities

- REST API request construction (GET, POST, PUT, DELETE, PATCH)
- Authentication handling (API keys, OAuth2, Bearer tokens)
- Automatic pagination traversal
- Rate limit detection and backoff
- Error retry with exponential backoff
- Response parsing and transformation
- Request/response logging

## Usage

Attach this skill to an agent and provide an API endpoint along with the desired action. The agent will handle authentication, construct the request, and process the response.

## Supported Auth Methods

- **API Key** - Header or query parameter
- **Bearer Token** - Authorization header
- **OAuth2** - Client credentials or authorization code flow
- **Basic Auth** - Username and password
`,
  },
  {
    id: "bundled-database-query",
    name: "Database Query",
    description: "Runs SQL queries, analyzes schemas, and generates reports from databases.",
    author: "Anthropic",
    source: "bundled",
    category: "Data",
    content: `# Database Query

A skill for interacting with SQL databases and generating data-driven reports.

## Capabilities

- SQL query construction and execution
- Schema exploration and documentation
- Data aggregation and reporting
- Query optimization suggestions
- Result formatting (tables, CSV, JSON)
- Cross-table relationship analysis

## Usage

Attach this skill to an agent with database access. Provide a question in natural language and the agent will construct the appropriate SQL query, execute it, and present the results.

## Supported Databases

- PostgreSQL
- MySQL / MariaDB
- SQLite
- Microsoft SQL Server
`,
  },
  {
    id: "bundled-email-drafter",
    name: "Email Drafter",
    description: "Drafts professional emails based on context, tone, and recipient.",
    author: "Anthropic",
    source: "bundled",
    category: "Content",
    content: `# Email Drafter

A skill for drafting professional emails tailored to context, tone, and audience.

## Capabilities

- Professional email composition
- Tone adaptation (formal, friendly, urgent, follow-up)
- Subject line optimization
- Context-aware threading (replies, forwards)
- Template-based generation
- Multi-recipient handling with CC/BCC suggestions

## Usage

Attach this skill to an agent and describe the email you need. Specify the recipient, context, desired tone, and key points. The agent will produce a polished email ready to send.

## Tone Options

- **Formal** - Business communication, executive updates
- **Friendly** - Team communication, casual check-ins
- **Urgent** - Time-sensitive requests, escalations
- **Follow-up** - Reminders, status updates
`,
  },
  {
    id: "bundled-test-writer",
    name: "Test Writer",
    description: "Generates unit tests, integration tests, and test fixtures for codebases.",
    author: "Anthropic",
    source: "bundled",
    category: "Development",
    content: `# Test Writer

A skill for generating comprehensive test suites for your codebase.

## Capabilities

- Unit test generation with full coverage
- Integration test scaffolding
- Test fixture and mock data creation
- Edge case identification
- Snapshot test generation
- Property-based test suggestions

## Usage

Attach this skill to an agent and provide a function, class, or module. The agent will analyze the code, identify test cases, and generate a complete test suite.

## Supported Frameworks

- **JavaScript/TypeScript** - Jest, Vitest, Mocha
- **Python** - pytest, unittest
- **Go** - testing package
- **Rust** - built-in test framework
`,
  },
  {
    id: "bundled-documentation-generator",
    name: "Documentation Generator",
    description: "Creates API docs, README files, and technical guides from code.",
    author: "Anthropic",
    source: "bundled",
    category: "Development",
    content: `# Documentation Generator

A skill for creating technical documentation from codebases.

## Capabilities

- API reference documentation generation
- README file creation with badges and examples
- Tutorial and quickstart guide authoring
- Inline code comment generation
- Changelog and release notes drafting
- Architecture diagram descriptions

## Usage

Attach this skill to an agent and point it at a codebase or specific files. The agent will analyze the code structure, extract public interfaces, and produce formatted documentation.

## Output Formats

- **Markdown** - GitHub-compatible README and docs
- **OpenAPI** - Swagger/OpenAPI spec generation
- **JSDoc/TSDoc** - Inline documentation comments
- **Plain text** - Simple reference guides
`,
  },
];

/**
 * GET /api/skills
 * Returns bundled skills plus any imported/custom skills stored in SQLite,
 * real custom skills from Anthropic Skills API, and official Anthropic skills
 * from the GitHub repo.
 */
export async function GET() {
  try {
    // Load locally-tracked skills from SQLite
    let importedSkills: BundledSkill[] = [];
    try {
      const { getDb } = await import("@/lib/db");
      const db = getDb();

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

      importedSkills = db
        .prepare("SELECT * FROM imported_skills ORDER BY created_at DESC")
        .all() as BundledSkill[];
    } catch {
      // SQLite not available
    }

    // Fetch real custom skills from Anthropic Skills API
    let apiCustomSkills: BundledSkill[] = [];
    try {
      const { listSkills } = await import("@/lib/skills-api");
      const apiSkills = await listSkills();
      const importedIds = new Set(importedSkills.map((s) => s.id));

      // Only add API skills that aren't already in our local DB
      apiCustomSkills = apiSkills
        .filter((s) => s.source === "custom" && !importedIds.has(s.id))
        .map((s) => ({
          id: s.id,
          name: s.display_title,
          description: `Custom skill uploaded to Anthropic`,
          author: "Custom",
          source: "custom" as const,
          category: "Custom",
          content: "",
        }));
    } catch {
      // Skills API not available
    }

    // Fetch official Anthropic skills from github.com/anthropics/skills
    let anthropicSkills: BundledSkill[] = [];
    try {
      const listRes = await fetch(
        "https://api.github.com/repos/anthropics/skills/contents/skills",
        { headers: { Accept: "application/vnd.github.v3+json" }, next: { revalidate: 3600 } }
      );

      if (listRes.ok) {
        const skillDirs = await listRes.json();
        if (Array.isArray(skillDirs)) {
          // Fetch SKILL.md for each skill in parallel (cap to avoid rate limits)
          const skillPromises = skillDirs
            .filter((d: any) => d.type === "dir")
            .slice(0, 20)
            .map(async (dir: any) => {
              const skillName = dir.name;
              const rawUrl = `https://raw.githubusercontent.com/anthropics/skills/main/skills/${skillName}/SKILL.md`;
              try {
                const contentRes = await fetch(rawUrl, { next: { revalidate: 3600 } });
                if (!contentRes.ok) return null;
                const content = await contentRes.text();

                // Extract description from YAML frontmatter or first paragraph
                let description = "";
                const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
                if (fmMatch) {
                  const descMatch = fmMatch[1].match(/description:\s*(.+)/);
                  if (descMatch) description = descMatch[1].trim().replace(/^['"]|['"]$/g, "");
                }
                if (!description) {
                  const lines = content.split("\n").filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("---"));
                  if (lines[0]) description = lines[0].trim().substring(0, 200);
                }

                const displayName = skillName.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

                return {
                  id: `anthropic-${skillName}`,
                  name: displayName,
                  description: description || `Official Anthropic skill: ${displayName}`,
                  author: "Anthropic",
                  source: "anthropic" as const,
                  category: "Official",
                  content,
                };
              } catch {
                return null;
              }
            });

          const results = await Promise.all(skillPromises);
          anthropicSkills = results.filter((s) => s !== null) as BundledSkill[];
        }
      }
    } catch {
      // GitHub unavailable, fall back to bundled only
    }

    return NextResponse.json([
      ...BUNDLED_SKILLS,
      ...anthropicSkills,
      ...importedSkills,
      ...apiCustomSkills,
    ]);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to list skills";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/skills
 * Import a skill from a GitHub repository. Fetches SKILL.md/README.md,
 * uploads to Anthropic Skills API, and stores locally.
 * Body: { github_url: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { github_url } = body;

    if (!github_url) {
      return NextResponse.json(
        { error: "github_url is required" },
        { status: 400 }
      );
    }

    // Parse GitHub URL: accept "user/repo" or full URL
    let owner: string;
    let repo: string;

    const urlStr = github_url.trim();
    if (urlStr.includes("github.com")) {
      const match = urlStr.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) {
        return NextResponse.json(
          { error: "Invalid GitHub URL format" },
          { status: 400 }
        );
      }
      owner = match[1];
      repo = match[2].replace(/\.git$/, "");
    } else if (urlStr.includes("/")) {
      const parts = urlStr.split("/");
      owner = parts[0];
      repo = parts[1];
    } else {
      return NextResponse.json(
        { error: "Provide a GitHub URL or user/repo format" },
        { status: 400 }
      );
    }

    // Fetch SKILL.md or README.md
    const candidates = [
      `https://raw.githubusercontent.com/${owner}/${repo}/main/SKILL.md`,
      `https://raw.githubusercontent.com/${owner}/${repo}/master/SKILL.md`,
      `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`,
      `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`,
    ];

    let skillContent = "";
    for (const url of candidates) {
      const res = await fetch(url);
      if (res.ok) {
        skillContent = await res.text();
        break;
      }
    }
    if (!skillContent) {
      return NextResponse.json(
        { error: "Could not find SKILL.md or README.md in the repository." },
        { status: 404 }
      );
    }

    // Extract name from first heading or use repo name
    const nameMatch = skillContent.match(/^#\s+(.+)$/m);
    const skillName = nameMatch ? nameMatch[1].trim() : repo;

    // Extract description
    const lines = skillContent.split("\n").filter((l) => l.trim());
    let description = `Imported from ${owner}/${repo}`;
    for (const line of lines) {
      if (!line.startsWith("#") && line.trim().length > 10) {
        description = line.trim().substring(0, 200);
        break;
      }
    }

    const dirName = repo
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Ensure proper SKILL.md frontmatter
    let finalContent = skillContent;
    if (!skillContent.startsWith("---")) {
      finalContent = `---\nname: ${dirName}\ndescription: ${description}\n---\n\n${skillContent}`;
    }

    // Upload to Anthropic Skills API
    let anthropicId: string | null = null;
    try {
      const { uploadSkill } = await import("@/lib/skills-api");
      const uploaded = await uploadSkill({
        displayTitle: skillName,
        skillMdContent: finalContent,
        dirName,
      });
      anthropicId = uploaded.id;
    } catch (err) {
      console.error("Skills API upload failed:", err);
    }

    const id = anthropicId || `github-${owner}-${repo}-${Date.now()}`;

    const skill: BundledSkill & { anthropic_skill_id?: string } = {
      id,
      name: skillName,
      description,
      author: owner,
      source: anthropicId ? "custom" as any : "github",
      category: "Community",
      content: finalContent,
      anthropic_skill_id: anthropicId || undefined,
    };

    // Store in SQLite
    try {
      const { getDb } = await import("@/lib/db");
      const db = getDb();
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
      db.prepare(
        `INSERT OR REPLACE INTO imported_skills (id, name, description, author, source, category, content, github_url)
         VALUES (@id, @name, @description, @author, @source, @category, @content, @github_url)`
      ).run({ ...skill, github_url: `https://github.com/${owner}/${repo}` });
    } catch {
      // best effort
    }

    return NextResponse.json(skill, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to import skill";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
