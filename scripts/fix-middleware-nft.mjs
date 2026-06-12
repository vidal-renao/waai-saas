// Turbopack (Next.js 16) doesn't emit middleware.js.nft.json — Vercel CLI 54 expects it.
// Runs as prebuild (before next build) and postbuild (after). next.config.ts also polls
// during the build to cover the window where Vercel reads the file mid-finalization.
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const serverDir = join(process.cwd(), '.next', 'server')
const nftPath = join(serverDir, 'middleware.js.nft.json')
if (!existsSync(serverDir)) mkdirSync(serverDir, { recursive: true })
if (!existsSync(nftPath)) {
  writeFileSync(nftPath, JSON.stringify({ version: 2, files: [] }))
  console.log('[nft-stub] Created middleware.js.nft.json')
}
