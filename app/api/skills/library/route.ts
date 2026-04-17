import { NextResponse } from "next/server";

/**
 * Community skills library integration.
 *
 * Fetches a scraped registry of 34,000+ skills from 2,800+ GitHub repos,
 * caches it for an hour, and performs search / filter / pagination in memory.
 */

const REGISTRY_URL =
  "https://raw.githubusercontent.com/mastra-ai/skills-api/main/src/registry/scraped-skills.json";

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

interface Registry {
  scrapedAt?: string;
  totalSkills?: number;
  totalSources?: number;
  totalOwners?: number;
  skills: LibrarySkill[];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("query") ?? "").trim().toLowerCase();
    const owner = (searchParams.get("owner") ?? "").trim().toLowerCase();
    const sortBy = searchParams.get("sortBy") === "name" ? "name" : "installs";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize") ?? "20"))
    );

    const registryRes = await fetch(REGISTRY_URL, {
      next: { revalidate: 3600 },
    });
    if (!registryRes.ok) {
      return NextResponse.json(
        { error: "Could not reach skills registry" },
        { status: 502 }
      );
    }
    const registry: Registry = await registryRes.json();
    const all = Array.isArray(registry.skills) ? registry.skills : [];

    let filtered = all;
    if (query) {
      filtered = filtered.filter((s) => {
        const hay = `${s.displayName ?? ""} ${s.name} ${s.owner}/${s.repo}`.toLowerCase();
        return hay.includes(query);
      });
    }
    if (owner) {
      filtered = filtered.filter((s) => s.owner.toLowerCase() === owner);
    }

    filtered.sort((a, b) => {
      if (sortBy === "name") {
        const an = (a.displayName ?? a.name).toLowerCase();
        const bn = (b.displayName ?? b.name).toLowerCase();
        return sortOrder === "asc" ? an.localeCompare(bn) : bn.localeCompare(an);
      }
      const ai = a.installs ?? 0;
      const bi = b.installs ?? 0;
      return sortOrder === "asc" ? ai - bi : bi - ai;
    });

    const total = filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const results = filtered.slice(start, start + pageSize);

    return NextResponse.json({
      scrapedAt: registry.scrapedAt,
      totalInRegistry: registry.totalSkills ?? all.length,
      total,
      page,
      pageSize,
      pageCount,
      results,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Library request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
