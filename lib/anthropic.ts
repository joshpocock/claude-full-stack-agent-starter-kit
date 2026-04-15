import Anthropic from "@anthropic-ai/sdk";

// Singleton client. SDK automatically sets managed-agents-2026-04-01 beta header.
let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}
