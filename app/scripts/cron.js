/**
 * Hourly maintenance cron — runs in PM2 cron mode.
 *
 * Tasks:
 *   1. Delete ApiCallLog rows older than 7 days
 *   2. Delete PageView rows older than 90 days
 *   3. Delete AnalyticsEvent rows older than 365 days
 *   4. Delete AuditLog rows older than 365 days
 *   5. Delete Session rows past expires (NextAuth doesn't auto-purge)
 *   6. Delete VerificationToken rows past expires
 *   7. Delete GenerationTrace rows older than 90 days (UI shows last 50, stats use last 30d)
 *   8. (2026-05-04) Backup retention — .claude-backups/ snap-pre-* ve db-pre-*.sql.gz dosyalarını
 *      en yenisi en üstte sırala, son N kayıdı koru, kalanını sil. Manuel temizlik
 *      ihtiyacını ortadan kaldırır.
 *
 * Idempotent: safe to run multiple times. PM2 schedules via cron_restart.
 * Each run logs to stdout (PM2 logs).
 *
 * Required env: DATABASE_URL (read from .env.production at /var/www/promtexpress).
 */

const fs = require("node:fs");
const path = require("node:path");

// Manually load .env.production (no dotenv dep — keep cron tiny).
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv(path.join(__dirname, "..", ".env.production"));

// Backup retention helper — .claude-backups/ dizininde belirli prefix'li
// dosyaları/dizinleri "en yeni en üstte" sırala, son `keep` adedi koru, kalanı sil.
// Geri dönüş: { kept, deleted } sayıları.
function pruneBackups(dir, prefix, keep) {
  if (!fs.existsSync(dir)) return { kept: 0, deleted: 0, error: "no dir" };
  let entries;
  try {
    entries = fs
      .readdirSync(dir)
      .filter((name) => name.startsWith(prefix))
      .map((name) => {
        const full = path.join(dir, name);
        try {
          return { name, full, mtime: fs.statSync(full).mtimeMs };
        } catch {
          return null;
        }
      })
      .filter((e) => e !== null)
      .sort((a, b) => b.mtime - a.mtime); // newest first
  } catch (err) {
    return { kept: 0, deleted: 0, error: err.message };
  }
  const toDelete = entries.slice(keep);
  let deleted = 0;
  for (const entry of toDelete) {
    try {
      fs.rmSync(entry.full, { recursive: true, force: true });
      deleted++;
    } catch (err) {
      console.warn(`[cron.backups] delete failed ${entry.name}: ${err.message}`);
    }
  }
  return { kept: Math.min(keep, entries.length), deleted };
}

// Standalone bundle'daki taze (schema ile senkron) Prisma client'ına yönlendir.
// Root /var/www/promtexpress/node_modules/@prisma/client ilk deploy'dan kalan
// eski client'tır (12 model) ve standalone-only deploy akışında yenilenmez —
// sadece .next/standalone/ yenilenir. Cron oradan da fresh client (37 model) okur.
const { PrismaClient } = require(
  path.join(__dirname, "..", ".next", "standalone", "node_modules", "@prisma", "client")
);

(async () => {
  const start = Date.now();
  const db = new PrismaClient();

  const MS_DAY = 86400000;
  const now = new Date();
  const cutoffApi = new Date(Date.now() - 7 * MS_DAY);
  const cutoffPageView = new Date(Date.now() - 90 * MS_DAY);
  const cutoffEvent = new Date(Date.now() - 365 * MS_DAY);
  const cutoffAudit = new Date(Date.now() - 365 * MS_DAY);
  const cutoffTrace = new Date(Date.now() - 90 * MS_DAY);

  try {
    const [api, pv, ev, au, sess, vt, gt] = await Promise.all([
      db.apiCallLog.deleteMany({ where: { createdAt: { lt: cutoffApi } } }),
      db.pageView.deleteMany({ where: { createdAt: { lt: cutoffPageView } } }),
      db.analyticsEvent.deleteMany({ where: { createdAt: { lt: cutoffEvent } } }),
      db.auditLog.deleteMany({ where: { createdAt: { lt: cutoffAudit } } }),
      db.session.deleteMany({ where: { expires: { lt: now } } }),
      db.verificationToken.deleteMany({ where: { expires: { lt: now } } }),
      db.generationTrace.deleteMany({ where: { createdAt: { lt: cutoffTrace } } }),
    ]);
    const ms = Date.now() - start;
    console.log(
      `[cron] cleanup OK in ${ms}ms — apiCallLog=${api.count} pageView=${pv.count} analyticsEvent=${ev.count} auditLog=${au.count} session=${sess.count} verificationToken=${vt.count} generationTrace=${gt.count}`
    );

    // Task 8 — backup retention (filesystem). DB cleanup'tan bağımsız; hata
    // toleranslı (cron'u durdurmaz). Pruning kuralları:
    //   - snap-pre-*  → son 3 koru (rollback için fazlasıyla yeter)
    //   - db-pre-*.sql.gz → son 5 koru (gz, küçük; tarihsel kıyas için tut)
    //   - env*.bak-*  → son 10 koru (her biri ~3KB, kapsamlı tut)
    const backupDir = path.join(__dirname, "..", ".claude-backups");
    const snap = pruneBackups(backupDir, "snap-pre-", 3);
    const dbBak = pruneBackups(backupDir, "db-pre-", 5);
    const envBak1 = pruneBackups(backupDir, "env.bak-", 10);
    const envBak2 = pruneBackups(backupDir, "env.production.bak-", 10);
    const envBak3 = pruneBackups(backupDir, "env.standalone.bak-", 10);
    const envBak4 = pruneBackups(backupDir, "env.production.standalone.bak-", 10);
    console.log(
      `[cron.backups] snap kept=${snap.kept} deleted=${snap.deleted} | db kept=${dbBak.kept} deleted=${dbBak.deleted} | env deleted=${envBak1.deleted + envBak2.deleted + envBak3.deleted + envBak4.deleted}`
    );
  } catch (err) {
    console.error("[cron] cleanup FAILED:", err);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
    process.exit(process.exitCode ?? 0);
  }
})();
