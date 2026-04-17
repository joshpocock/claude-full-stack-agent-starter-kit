import { NextResponse } from "next/server";
import { getAgentSkills, updateAgentSkills } from "@/lib/skills-api";

/**
 * GET /api/skills/attach?agent_id=X
 * Get the skills attached to an agent.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agent_id");

    if (!agentId) {
      return NextResponse.json(
        { error: "agent_id is required" },
        { status: 400 }
      );
    }

    const skills = await getAgentSkills(agentId);
    return NextResponse.json(skills);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get agent skills";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/skills/attach
 * Attach a skill to an agent. Updates the agent via Anthropic API.
 * Body: { agent_id: string, skill_id: string, skill_type?: "custom" | "anthropic" }
 */
export async function POST(request: Request) {
  try {
    const { agent_id, skill_id, skill_type } = await request.json();

    if (!agent_id || !skill_id) {
      return NextResponse.json(
        { error: "agent_id and skill_id are required" },
        { status: 400 }
      );
    }

    // Determine skill type
    const type: "anthropic" | "custom" =
      skill_type ||
      (skill_id.startsWith("skill_") ? "custom" : "anthropic");

    // Get current skills on the agent
    const currentSkills = await getAgentSkills(agent_id);

    // Check if already attached
    if (currentSkills.some((s) => s.skill_id === skill_id)) {
      return NextResponse.json({ ok: true, already_attached: true });
    }

    // Add the new skill
    const updatedSkills = [
      ...currentSkills.map((s) => ({
        type: s.type as "anthropic" | "custom",
        skill_id: s.skill_id,
        version: s.version,
      })),
      { type, skill_id, version: "latest" },
    ];

    await updateAgentSkills(agent_id, updatedSkills);

    return NextResponse.json({ ok: true, skills: updatedSkills });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to attach skill";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/skills/attach
 * Detach a skill from an agent.
 * Body: { agent_id: string, skill_id: string }
 */
export async function DELETE(request: Request) {
  try {
    const { agent_id, skill_id } = await request.json();

    if (!agent_id || !skill_id) {
      return NextResponse.json(
        { error: "agent_id and skill_id are required" },
        { status: 400 }
      );
    }

    // Get current skills and remove the one being detached
    const currentSkills = await getAgentSkills(agent_id);
    const updatedSkills = currentSkills
      .filter((s) => s.skill_id !== skill_id)
      .map((s) => ({
        type: s.type as "anthropic" | "custom",
        skill_id: s.skill_id,
        version: s.version,
      }));

    await updateAgentSkills(agent_id, updatedSkills);

    return NextResponse.json({ ok: true, skills: updatedSkills });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to detach skill";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
