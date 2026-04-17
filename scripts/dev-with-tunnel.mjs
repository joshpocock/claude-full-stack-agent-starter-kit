#!/usr/bin/env node

/**
 * Dev startup script that:
 * 1. Starts Next.js dev server
 * 2. Starts a Cloudflare tunnel via untun
 * 3. Stores the public URL in app_settings
 * 4. Syncs MCP server URLs on agents with connected routines
 *
 * Usage: node scripts/dev-with-tunnel.mjs
 */

import { spawn } from "child_process";
import { startTunnel } from "untun";

const PORT = process.env.PORT || 3002;
const LOCAL_URL = `http://localhost:${PORT}`;

// Start Next.js dev server
console.log(`\n  Starting Next.js on port ${PORT}...\n`);
const next = spawn("npx", ["next", "dev", "-p", String(PORT)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env },
});

// Give Next.js a moment to start, then launch tunnel
setTimeout(async () => {
  console.log("\n  Starting Cloudflare tunnel...\n");

  try {
    const tunnel = await startTunnel({
      port: Number(PORT),
    });

    const tunnelUrl = await tunnel.getURL();
    console.log(`\n  ✓ Tunnel ready: ${tunnelUrl}`);
    console.log(`  ✓ MCP endpoint: ${tunnelUrl}/api/mcp/[agentId]\n`);

    // Store the URL in the database
    await syncTunnelUrl(tunnelUrl);

    // Sync MCP servers on agents
    await syncAgentMcpServers(tunnelUrl);
  } catch (err) {
    console.error("\n  ✗ Tunnel failed to start:", err.message);
    console.log("  → App still works locally, but MCP won't be reachable from Anthropic");
    console.log("  → Routines can still be fired via the UI\n");
  }
}, 3000);

async function syncTunnelUrl(url) {
  try {
    // Wait for the dev server to be ready
    let ready = false;
    for (let i = 0; i < 15; i++) {
      try {
        const res = await fetch(`${LOCAL_URL}/api/settings`);
        if (res.ok) {
          ready = true;
          break;
        }
      } catch {
        // not ready yet
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    if (!ready) {
      console.log("  ⚠ Could not reach dev server to save tunnel URL");
      return;
    }

    // Save the tunnel URL to app settings
    const res = await fetch(`${LOCAL_URL}/api/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "mcp_base_url", value: url }),
    });

    if (res.ok) {
      console.log("  ✓ Tunnel URL saved to settings");
    }
  } catch (err) {
    console.error("  ⚠ Failed to save tunnel URL:", err.message);
  }
}

async function syncAgentMcpServers(tunnelUrl) {
  try {
    // Call our sync endpoint
    const res = await fetch(`${LOCAL_URL}/api/mcp/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_url: tunnelUrl }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.synced > 0) {
        console.log(`  ✓ Updated MCP URL on ${data.synced} agent(s)`);
      } else {
        console.log("  ✓ No agents with routines to sync");
      }
    }
  } catch (err) {
    console.error("  ⚠ Failed to sync MCP servers:", err.message);
  }
}

// Cleanup on exit
process.on("SIGINT", () => {
  next.kill("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  next.kill("SIGTERM");
  process.exit(0);
});

next.on("exit", (code) => {
  process.exit(code || 0);
});
