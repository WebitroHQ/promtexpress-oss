"use server";

/**
 * User profile / preferences / account server actions.
 */
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/db/client";
import { routing } from "@/i18n/routing";
import { LOCALE_COOKIE } from "@/lib/i18n/resolve";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setLocale(locale: string): Promise<{ ok: true }> {
  if (!routing.locales.includes(locale as never)) {
    throw new Error("Unsupported locale");
  }
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
  const session = await auth().catch(() => null);
  if (session?.user) {
    await db.user.update({ where: { id: session.user.id }, data: { locale } });
  }
  return { ok: true };
}

export async function updateProfile(input: {
  name?: string;
  locale?: string;
}): Promise<{ ok: true }> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const data: { name?: string; locale?: string } = {};
  if (typeof input.name === "string") {
    const trimmed = input.name.trim();
    if (trimmed.length > 80) throw new Error("Name too long");
    data.name = trimmed;
  }
  if (typeof input.locale === "string") {
    if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(input.locale)) throw new Error("Invalid locale");
    data.locale = input.locale;
  }

  if (Object.keys(data).length === 0) return { ok: true };

  await db.user.update({ where: { id: session.user.id }, data });
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteAccount(): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  // Cascade rules in Prisma schema delete Prompt, ApiKey, Subscription, etc.
  await db.user.delete({ where: { id: session.user.id } });
  await signOut({ redirectTo: "/" });
}
