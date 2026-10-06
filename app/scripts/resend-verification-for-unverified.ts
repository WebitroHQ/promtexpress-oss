/**
 * Tek seferlik script — emailVerified=null olan password-signup kullanıcılarına
 * doğrulama mailini yeniden gönderir.
 *
 * Çalıştırma (lokal'de):
 *   pnpm exec tsx scripts/resend-verification-for-unverified.ts
 *
 * Çalıştırma (sunucuda):
 *   cd /var/www/promtexpress
 *   node -r esbuild-register scripts/resend-verification-for-unverified.ts
 *   # veya tsx kuruluysa: pnpm exec tsx scripts/resend-verification-for-unverified.ts
 */
import { db } from "@/db/client";
import { createEmailVerifyToken } from "@/server/email/email-verify-token";
import { sendTemplateEmail } from "@/server/email/template-send";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const users = await db.user.findMany({
    where: { emailVerified: null, passwordHash: { not: null } },
    select: { id: true, email: true, firstName: true, name: true, locale: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Hedef: ${users.length} kullanıcı`);
  let sent = 0;
  let failed = 0;
  let rateLimited = 0;

  for (const u of users) {
    const tok = await createEmailVerifyToken(u.email);
    if (!tok.ok) {
      rateLimited++;
      console.log(`  • ${u.email} → SKIP (rate limited, retryAfter=${tok.retryAfterMs}ms)`);
      continue;
    }
    const displayName = u.firstName ?? u.name?.split(" ")[0] ?? u.email.split("@")[0] ?? "there";
    const r = await sendTemplateEmail({
      slug: "verification",
      locale: u.locale ?? "en",
      to: u.email,
      vars: { name: displayName, verifyUrl: tok.url },
    });
    if (r.ok) {
      sent++;
      console.log(`  ✓ ${u.email}`);
    } else {
      failed++;
      console.log(`  ✗ ${u.email} → ${r.reason}`);
    }
    await sleep(250);
  }

  console.log(`\nÖzet: gönderildi=${sent}, başarısız=${failed}, rate_limited=${rateLimited}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
