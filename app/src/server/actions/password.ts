"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth-cookie";

/**
 * İlk kez şifre belirleme — yalnızca passwordHash=NULL olan user'lar için (OAuth-only).
 * Mevcut şifre istemez. Çift güvenlik:
 *   1. Session zorunlu
 *   2. passwordHash zaten varsa REDDEDİLİR (mevcut şifre bypass'lanamaz)
 * Mevcut session'ı kesmez (changePassword'tan farkı: ilk belirlemede session reset gereksiz).
 */
export async function setPassword(input: {
  newPassword: string;
}): Promise<{ ok: true }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (input.newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (user?.passwordHash) {
    throw new Error("Password already set — use change password instead");
  }

  const hash = await bcrypt.hash(input.newPassword, 12);
  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash: hash },
  });

  return { ok: true };
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (input.newPassword.length < 8) throw new Error("New password must be at least 8 characters");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    throw new Error("No password set — this account uses social login only");
  }

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) throw new Error("Current password is incorrect");

  const hash = await bcrypt.hash(input.newPassword, 12);
  await db.user.update({ where: { id: session.user.id }, data: { passwordHash: hash } });

  // Invalidate all OTHER sessions on other devices/browsers — keep only the caller's
  const c = await cookies();
  const currentToken = c.get(SESSION_COOKIE_NAME)?.value;
  await db.session.deleteMany({
    where: {
      userId: session.user.id,
      ...(currentToken ? { sessionToken: { not: currentToken } } : {}),
    },
  });

  return { ok: true };
}
