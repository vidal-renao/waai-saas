import type { NextConfig } from "next";
import { existsSync, writeFileSync } from "fs";
import { join } from "path";

// Turbopack (Next.js 16) doesn't emit middleware.js.nft.json.
// Vercel CLI 54 reads it during build finalization — before postbuild can run.
// Poll as soon as this config loads and create the stub once .next/server/ exists.
{
  const serverDir = join(process.cwd(), ".next", "server");
  const nftPath = join(serverDir, "middleware.js.nft.json");
  const interval = setInterval(() => {
    if (existsSync(serverDir) && !existsSync(nftPath)) {
      try {
        writeFileSync(nftPath, JSON.stringify({ version: 2, files: [] }));
        console.log("[next.config] Created middleware.js.nft.json stub");
      } catch {
        // ignore — prebuild/postbuild are fallbacks
      }
    }
    if (existsSync(nftPath)) clearInterval(interval);
  }, 50);
  interval.unref();
}

const nextConfig: NextConfig = {};

export default nextConfig;
