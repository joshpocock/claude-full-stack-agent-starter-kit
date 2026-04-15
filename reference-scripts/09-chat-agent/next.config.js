/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 is a native module that cannot run in the browser.
  // Mark it as server-only so Next.js does not try to bundle it.
  serverExternalPackages: ["better-sqlite3"],
};

module.exports = nextConfig;
