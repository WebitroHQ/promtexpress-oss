/**
 * AES-256-GCM helpers for AiEngine.encryptedKey
 *
 * Storage format (single string, ":"-delimited, base64 chunks):
 *   <iv>:<authTag>:<ciphertext>
 *
 * Key source:
 *   process.env.AI_KEYS_ENCRYPTION_KEY (64 hex chars = 32 bytes)
 *   Generate with: openssl rand -hex 32
 *
 * Throws on missing/wrong key length so misconfiguration fails fast.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCMTypes,
} from "node:crypto";

const ALGORITHM: CipherGCMTypes = "aes-256-gcm";
const IV_LENGTH = 12; // standard for GCM

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const hex = process.env.AI_KEYS_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error("AI_KEYS_ENCRYPTION_KEY not set");
  }
  if (hex.length !== 64) {
    throw new Error(
      `AI_KEYS_ENCRYPTION_KEY must be 64 hex chars (32 bytes); got ${hex.length}`,
    );
  }
  const buf = Buffer.from(hex, "hex");
  if (buf.length !== 32) {
    throw new Error(
      `AI_KEYS_ENCRYPTION_KEY decoded to ${buf.length} bytes (expected 32). Likely contains non-hex chars.`,
    );
  }
  cachedKey = buf;
  return cachedKey;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(":");
}

export function decrypt(encoded: string): string {
  const key = getKey();
  const parts = encoded.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format (expected iv:authTag:ciphertext)");
  }
  const [ivB64, authTagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
