import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AppSidebar } from "@/components/feature/layout/app-sidebar";
import { AppTopBar } from "@/components/feature/layout/app-top-bar";
import { ApiKeysClient } from "@/components/feature/api-keys/api-keys-client";
import { getUserCredits } from "@/server/queries/credits";
import { db } from "@/db/client";

const PAGE_LIMIT = 50;

function relativeTime(
  d: Date | null,
  locale: string,
  t: Awaited<ReturnType<typeof getTranslations>>,
): string {
  if (!d) return t("list.never");
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return t("list.justNow");
  if (min < 60) return t("list.minutesAgo", { count: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t("list.hoursAgo", { count: h });
  const days = Math.floor(h / 24);
  if (days === 1) return t("list.yesterday");
  if (days < 7) return t("list.daysAgo", { count: days });
  return d.toLocaleDateString(locale);
}

export default async function ApiKeysPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const t = await getTranslations("apiKeys");

  const [credits, keyRows, dbUser] = await Promise.all([
    getUserCredits(session.user.id),
    db.apiKey.findMany({
      where: { userId: session.user.id, revokedAt: null, isActive: true },
      orderBy: { createdAt: "desc" },
      take: PAGE_LIMIT,
    }),
    db.user.findUnique({ where: { id: session.user.id }, select: { locale: true } }),
  ]);

  const userLocale = dbUser?.locale ?? "en";

  const keys = keyRows.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.keyPrefix,
    lastUsed: relativeTime(k.lastUsedAt, userLocale, t),
    created: k.createdAt.toLocaleDateString(userLocale, { year: "numeric", month: "short", day: "numeric" }),
    expiresAt: k.expiresAt
      ? k.expiresAt.toLocaleDateString(userLocale, { year: "numeric", month: "short", day: "numeric" })
      : null,
  }));

  return (
    <div className="flex min-h-screen bg-bg">
      <AppSidebar credits={credits} />

      <main className="flex-1 min-w-0 flex flex-col">
        <AppTopBar userEmail={session.user?.email} />

        <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1280px] w-full mx-auto pb-16">
          <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
            <div>
              <h1 className="text-[28px] font-semibold tracking-[-0.025em]">{t("pageTitle")}</h1>
              <p className="text-sm text-text-muted mt-1">{t("pageDescription")}</p>
            </div>
          </div>

          {/* Security banner */}
          <div className="flex gap-3 items-start rounded-xl border border-warning/40 bg-warning/5 p-4 mb-5">
            <div className="w-8 h-8 rounded-lg bg-warning/20 text-warning inline-flex items-center justify-center shrink-0">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="text-sm text-text-muted">
              <span className="font-medium text-text">{t("banner.headline")}</span>{" "}
              {t("banner.body")}
            </div>
          </div>

          <ApiKeysClient keys={keys} pageLimit={PAGE_LIMIT} />

          {/* Quick start */}
          <div className="rounded-xl border border-border bg-surface p-5 mt-5">
            <h3 className="font-semibold text-[15px] mb-3">{t("quickStart.title")}</h3>
            <pre className="rounded-lg bg-surface-2 border border-border px-5 py-4 text-xs md:text-sm font-mono overflow-x-auto text-text">{`curl https://promtexpress.com/api/v1/generate \\
  -H "Authorization: Bearer $PROMTEXPRESS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "intent": "LinkedIn launch post for series B",
    "modality": "text"
  }'`}</pre>
            <p className="text-sm text-text-muted mt-4 mb-2">{t("quickStart.sdkNote")}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs font-medium text-text-muted mb-1.5">TypeScript</div>
                <pre className="rounded-lg bg-surface-2 border border-border px-5 py-4 text-xs md:text-sm font-mono overflow-x-auto text-text">{`npm install promtexpress

import { PromtExpress } from "promtexpress";

const client = new PromtExpress(); // reads PROMTEXPRESS_API_KEY
const { output } = await client.generate({
  intent: "LinkedIn launch post for series B",
  modality: "text",
});`}</pre>
              </div>
              <div>
                <div className="text-xs font-medium text-text-muted mb-1.5">Python</div>
                <pre className="rounded-lg bg-surface-2 border border-border px-5 py-4 text-xs md:text-sm font-mono overflow-x-auto text-text">{`pip install promtexpress

from promtexpress import PromtExpress

client = PromtExpress()  # reads PROMTEXPRESS_API_KEY
result = client.generate(
    "LinkedIn launch post for series B", "text"
)
print(result["output"])`}</pre>
              </div>
            </div>
            <a
              href="https://github.com/WebitroHQ/promtexpress-oss"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-sm text-primary hover:underline"
            >
              {t("quickStart.github")}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
