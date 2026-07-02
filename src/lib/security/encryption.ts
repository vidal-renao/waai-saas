import crypto from "node:crypto";

/**
 * Authenticated symmetric encryption for secrets at rest (DEBT-002).
 *
 * Uses AES-256-GCM with the 32-byte `ENCRYPTION_KEY` (64 hex chars). Every
 * ciphertext is self-describing:
 *
 *   enc:v1:<base64 iv>:<base64 authTag>:<base64 ciphertext>
 *
 * The `enc:v1:` prefix lets us (a) detect already-encrypted values so the
 * migration is idempotent, and (b) evolve the scheme later without ambiguity.
 */

const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // GCM standard nonce size
const KEY_BYTES = 32; // AES-256

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error("ENCRYPTION_KEY is not configured");
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_BYTES} bytes (${KEY_BYTES * 2} hex chars)`
    );
  }
  return key;
}

/** True when the value is already an enc:v1 ciphertext produced by encryptSecret. */
export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

/** Encrypt a UTF-8 secret. Returns the self-describing enc:v1 string. */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${authTag.toString(
    "base64"
  )}:${ciphertext.toString("base64")}`;
}

/**
 * Decrypt an enc:v1 secret. For backward compatibility during migration, a
 * value that is not enc:v1 (legacy plaintext) is returned unchanged so reads
 * never break before every row has been migrated.
 */
export function decryptSecret(payload: string): string {
  if (!isEncrypted(payload)) {
    return payload;
  }
  const key = getKey();
  const parts = payload.slice(PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted payload");
  }
  const [ivB64, tagB64, ctB64] = parts;
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
