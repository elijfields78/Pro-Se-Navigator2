import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Replit's proxy fronts the dev server; allow its origins in dev.
  allowedDevOrigins: ['*.replit.dev', '*.repl.co'],
};

export default nextConfig;
