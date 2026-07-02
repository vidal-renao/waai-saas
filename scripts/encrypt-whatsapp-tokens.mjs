// One-time migration: encrypt existing plaintext WhatsApp access tokens.
//
// Context: DEBT-002. Tokens were stored in
// waai_whatsapp_connections.provider_metadata.access_token as plaintext.
// This script encrypts any legacy plaintext value in place using the same
// AES-256-GCM `enc:v1:` format as src/lib/security/encryption.ts. It is
// idempotent — values already prefixed with `enc:v1:` are skipped.
//
// Run (from waai-saas/):
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   ENCRYPTION_KEY=<64-hex> node scripts/encrypt-whatsapp-tokens.mjs
//
// Dry run (no writes):
//   ... node scripts/encrypt-whatsapp-tokens.mjs --dry-run

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

const dryRun = process.argv.includes("--dry-run");

function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) throw new Error("ENCRYPTION_KEY is not configured");
  const key = Buffer.from(hex, "hex");
  if (key.length !== KEY_BYTES) {
    throw new Error(`ENCRYPTION_KEY must be ${KEY_BYTES} bytes (${KEY_BYTES * 2} hex chars)`);
  }
  return key;
}

function encryptSecret(plaintext, key) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  const key = getKey();
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: rows, error } = await db
    .from("waai_whatsapp_connections")
    .select("id, provider_metadata");
  if (error) throw new Error(`Query failed: ${error.message}`);

  let scanned = 0;
  let migrated = 0;
  let skipped = 0;

  for (const row of rows ?? []) {
    scanned++;
    const meta = row.provider_metadata ?? {};
    const token = meta.access_token;

    if (typeof token !== "string" || token.length === 0) {
      skipped++;
      continue;
    }
    if (token.startsWith(PREFIX)) {
      skipped++; // already encrypted
      continue;
    }

    const nextMeta = { ...meta, access_token: encryptSecret(token, key) };

    if (dryRun) {
      console.log(`[dry-run] would encrypt token for connection ${row.id}`);
      migrated++;
      continue;
    }

    const { error: updErr } = await db
      .from("waai_whatsapp_connections")
      .update({ provider_metadata: nextMeta })
      .eq("id", row.id);
    if (updErr) {
      console.error(`Failed to update ${row.id}: ${updErr.message}`);
      continue;
    }
    migrated++;
    console.log(`Encrypted token for connection ${row.id}`);
  }

  console.log(
    `\nDone. scanned=${scanned} migrated=${migrated} skipped=${skipped}${dryRun ? " (dry-run)" : ""}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
