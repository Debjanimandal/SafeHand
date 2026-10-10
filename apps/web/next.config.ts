import type { NextConfig } from 'next';
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

// Load .env from monorepo root so all vars (NEXT_PUBLIC_* and server-only) are available.
// override: true ensures root .env wins over any stale system env.
loadDotenv({ path: resolve(__dirname, '../../.env'), override: true });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Prevent Next.js from bundling these server-only packages — import them at runtime instead.
  // @worldcoin/idkit-server is ESM ("type":"module") and must not be bundled by webpack/turbopack.
  serverExternalPackages: ['@worldcoin/idkit-server'],
};

export default nextConfig;
