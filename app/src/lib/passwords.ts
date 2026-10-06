/**
 * Password hashing + reset token utilities.
 *
 * - Passwords: bcrypt cost=12 (OWASP recommendation, ~250ms on modern CPU)
 * - Reset tokens: 32-byte random hex; DB stores SHA-256 hash so a DB leak
 *   doesn't grant the attacker a usable token.
 */
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Returns plain token (sent in URL) and hash (stored in DB). */
export function generateResetToken(): { plain: string; hash: string } {
  const plain = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(plain).digest("hex");
  return { plain, hash };
}

export function hashResetToken(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}
