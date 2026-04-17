/**
 * Anthropic Skills API helpers.
 *
 * The Skills API uses multipart form upload for creating skills
 * and JSON for listing/retrieving/deleting.
 */

const SKILLS_BETA = "skills-2025-10-02";
const MANAGED_AGENTS_BETA = "managed-agents-2026-04-01";

function getApiKey(): string {
  try {
    const { getSetting } = require("@/lib/db");
    const dbKey = getSetting("anthropic_api_key");
    if (dbKey) return dbKey;
  } catch {
    // fall through
  }
  return process.env.ANTHROPIC_API_KEY || "";
}

function baseHeaders(): Record<string, string> {
  return {
    "x-api-key": getApiKey(),
    "anthropic-version": "2023-06-01",
    "anthropic-beta": `${SKILLS_BETA},${MANAGED_AGENTS_BETA}`,
  };
}

export interface AnthropicSkill {
  id: string;
  created_at: string;
  display_title: string;
  latest_version: string;
  source: "custom" | "anthropic";
  type: string;
  updated_at: string;
}

/**
 * Upload a skill to Anthropic. Content is uploaded as SKILL.md inside a
 * directory named after the skill.
 */
export async function uploadSkill(opts: {
  displayTitle: string;
  skillMdContent: string;
  dirName: string;
}): Promise<AnthropicSkill> {
  const { displayTitle, skillMdContent, dirName } = opts;

  // Build multipart form - the API expects files with directory paths
  const form = new FormData();
  form.append("display_title", displayTitle);

  const blob = new Blob([skillMdContent], { type: "text/markdown" });
  form.append("files[]", blob, `${dirName}/SKILL.md`);

  const res = await fetch("https://api.anthropic.com/v1/skills", {
    method: "POST",
    headers: baseHeaders(),
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Skills API upload failed (${res.status}): ${errText}`);
  }

  return res.json();
}

/**
 * List all skills from Anthropic (custom + anthropic).
 */
export async function listSkills(): Promise<AnthropicSkill[]> {
  const res = await fetch("https://api.anthropic.com/v1/skills", {
    headers: { ...baseHeaders(), "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Skills API list failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

/**
 * Delete a skill from Anthropic. Must delete all versions first.
 */
export async function deleteSkill(skillId: string): Promise<void> {
  const headers = { ...baseHeaders(), "Content-Type": "application/json" };

  // List versions
  const versionsRes = await fetch(
    `https://api.anthropic.com/v1/skills/${skillId}/versions`,
    { headers }
  );
  if (versionsRes.ok) {
    const versionsData = await versionsRes.json();
    const versions = Array.isArray(versionsData)
      ? versionsData
      : versionsData?.data ?? [];

    // Delete each version
    for (const v of versions) {
      const version = v.version || v.id;
      if (version) {
        await fetch(
          `https://api.anthropic.com/v1/skills/${skillId}/versions/${version}`,
          { method: "DELETE", headers }
        );
      }
    }
  }

  // Delete the skill itself
  const res = await fetch(`https://api.anthropic.com/v1/skills/${skillId}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Skills API delete failed (${res.status}): ${errText}`);
  }
}

/**
 * Update an agent's skills array via the Anthropic Agents API.
 */
export async function updateAgentSkills(
  agentId: string,
  skills: Array<{ type: "anthropic" | "custom"; skill_id: string; version?: string }>
): Promise<void> {
  const headers = { ...baseHeaders(), "Content-Type": "application/json" };

  // Get current version first (required for updates)
  const getRes = await fetch(`https://api.anthropic.com/v1/agents/${agentId}`, { headers });
  const current = getRes.ok ? await getRes.json() : {};
  const version = current.version;

  const res = await fetch(`https://api.anthropic.com/v1/agents/${agentId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ skills, ...(version != null && { version }) }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Agent skills update failed (${res.status}): ${errText}`);
  }
}

/**
 * Get an agent's current skills from the Anthropic API.
 */
export async function getAgentSkills(
  agentId: string
): Promise<Array<{ type: string; skill_id: string; version?: string }>> {
  const headers = { ...baseHeaders(), "Content-Type": "application/json" };

  const res = await fetch(`https://api.anthropic.com/v1/agents/${agentId}`, {
    headers,
  });

  if (!res.ok) return [];

  const agent = await res.json();
  return agent.skills ?? [];
}
