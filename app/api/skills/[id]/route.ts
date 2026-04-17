import { NextResponse } from "next/server";
import { deleteSkill } from "@/lib/skills-api";

/**
 * GET /api/skills/:id
 * Returns a single skill by ID.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch all skills and find the one with the matching ID
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/skills`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch skills" },
        { status: 500 }
      );
    }

    const skills = await res.json();
    const skill = skills.find(
      (s: { id: string }) => s.id === id
    );

    if (!skill) {
      return NextResponse.json(
        { error: "Skill not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(skill);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve skill";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/skills/:id
 * Delete a skill - from Anthropic API if it's a custom skill, or from local DB.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (id.startsWith("bundled-") || id.startsWith("anthropic-")) {
      return NextResponse.json(
        { error: "Cannot delete bundled or Anthropic official skills" },
        { status: 400 }
      );
    }

    // If it's a locally imported skill (github-*), just delete from DB
    if (id.startsWith("github-")) {
      const { getDb } = await import("@/lib/db");
      const db = getDb();
      db.prepare("DELETE FROM imported_skills WHERE id = ?").run(id);
      return NextResponse.json({ success: true });
    }

    // Otherwise it's a real Anthropic custom skill (skill_*) - delete via API
    await deleteSkill(id);

    // Also clean up from local DB if tracked there
    try {
      const { getDb } = await import("@/lib/db");
      const db = getDb();
      db.prepare("DELETE FROM imported_skills WHERE id = ?").run(id);
    } catch {
      // best effort
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete skill";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
