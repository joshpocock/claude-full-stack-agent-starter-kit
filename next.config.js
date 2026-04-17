/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Increase API route timeout for long-running agent responses
  serverRuntimeConfig: {
    maxDuration: 300,
  },
}
module.exports = nextConfig
