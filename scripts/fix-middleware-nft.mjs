// Turbopack (Next.js 16) doesn't emit middleware.js.nft.json — Vercel CLI 54 expects it.
import { existsSync, writeFileSync } from 'fs'
import { join } from 'path'

const nftPath = join(process.cwd(), '.next', 'server', 'middleware.js.nft.json')
if (!existsSync(nftPath)) {
  writeFileSync(nftPath, JSON.stringify({ version: 2, files: [] }))
  console.log('[postbuild] Created missing middleware.js.nft.json')
}
