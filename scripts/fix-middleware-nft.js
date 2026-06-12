// Turbopack (Next.js 16) doesn't emit middleware.js.nft.json — Vercel CLI 54 expects it.
// This postbuild script creates a minimal stub so the deployment succeeds.
const fs = require('fs')
const path = require('path')

const nftPath = path.join(process.cwd(), '.next', 'server', 'middleware.js.nft.json')
if (!fs.existsSync(nftPath)) {
  fs.writeFileSync(nftPath, JSON.stringify({ version: 2, files: [] }))
  console.log('[postbuild] Created missing middleware.js.nft.json')
}
