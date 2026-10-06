import { db } from "@/db/client";

export const APP_SETTING_KEYS = {
  REQUIRE_EMAIL_VERIFICATION: "require_email_verification",
} as const;

const REQUIRE_EMAIL_VERIFICATION_DEFAULT = true;

export async function getRequireEmailVerification(): Promise<boolean> {
  const raw = await readSetting(APP_SETTING_KEYS.REQUIRE_EMAIL_VERIFICATION);
  if (raw == null) return REQUIRE_EMAIL_VERIFICATION_DEFAULT;
  return raw === "true";
}

async function readSetting(key: string): Promise<string | null> {
  const row = await db.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}
