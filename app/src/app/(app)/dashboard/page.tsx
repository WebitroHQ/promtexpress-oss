import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { AppSidebar } from "@/components/feature/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CreditMeter } from "@/components/feature/generator/credit-meter";
import { Greeting } from "@/components/feature/dashboard/greeting";
import { AppTopBar } from "@/components/feature/layout/app-top-bar";
import { RecentPromptsWidget } from "@/components/feature/dashboard/recent-prompts-widget";
import { getUserCredits } from "@/server/queries/credits";
import { getRecentPrompts, getMonthlyPromptStats } from "@/server/queries/prompts";
import { getDailyUsage } from "@/server/queries/usage";
import { userHasActiveAiKey } from "@/server/queries/ai-keys";
import { db } from "@/db/client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const firstName = session.user?.name?.split(" ")[0] ?? "there";
  const userId = session.user.id;

  const [credits, prompts, stats, dailyUsage, subscription, hasAiKey] = await Promise.all([
    getUserCredits(userId),
    getRecentPrompts(userId, 5),
    getMonthlyPromptStats(userId),
    getDailyUsage(userId, 14),
    db.subscription.findUnique({ where: { userId }, include: { plan: true } }),
    userHasActiveAiKey(userId),
  ]);

  const planName = subscription?.plan.name ?? "Free";
  const planPrice = subscription
    ? `$${Number(subscription.plan.priceMonthly).toFixed(0)} / mo`
    : "$0 / mo";

  const trendLabel =
    stats.trend > 0
      ? `+${stats.trend} above last month`
      : stats.trend < 0
      ? `${stats.trend} vs last month`
      : "same as last month";

  return (
    <div className="flex min-h-screen bg-bg">
      <AppSidebar credits={credits} />

      <main className="flex-1 min-w-0 flex flex-col">
        <AppTopBar userEmail={session.user?.email} />

        <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1280px] w-full mx-auto pb-16">
          {/* Welcome */}
          <div className="flex flex-wrap items-end justify-between gap-3 mb-7">
            <div>
              <Greeting firstName={firstName} />
              <p className="text-sm text-text-muted mt-1">
                {stats.thisMonth > 0
                  ? `You've generated ${stats.thisMonth} prompt${stats.thisMonth !== 1 ? "s" : ""} this month — ${trendLabel}.`
                  : "No prompts yet this month — start generating!"}
              </p>
            </div>
            <Button asChild>
              <Link href="/generator">
                <Plus className="h-4 w-4" /> New prompt
              </Link>
            </Button>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {/* AI key */}
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-text-muted mb-1.5">AI key</p>
                <span className="text-3xl font-semibold tracking-[-0.02em]">{hasAiKey ? "Connected" : "Missing"}</span>
                <p className="text-xs text-text-faint mt-1">
                  {hasAiKey ? "Prompts run on your own key" : "Add a key to start generating"}
                </p>
                <Link href="/settings#ai-keys" className="text-xs text-primary mt-1.5 inline-block">
                  {hasAiKey ? "Manage keys →" : "Add a key →"}
                </Link>
              </CardContent>
            </Card>

            {/* Prompts this month */}
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-text-muted mb-1.5">Prompts this month</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tracking-[-0.02em]">
                    {stats.thisMonth}
                  </span>
                  {stats.trend !== 0 && (
                    <span
                      className={`text-sm font-medium ${stats.trend > 0 ? "text-success" : "text-error"}`}
                    >
                      {stats.trend > 0 ? "+" : ""}
                      {stats.trend}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top modality */}
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-text-muted mb-1.5">Top modality</p>
                <span className="text-3xl font-semibold tracking-[-0.02em]">
                  {stats.topModality}
                </span>
                {stats.topModalityPct > 0 && (
                  <p className="text-xs text-text-faint mt-1">
                    {stats.topModalityPct}% of generations
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Plan */}
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-text-muted mb-1.5">Cost</p>
                <span className="text-3xl font-semibold tracking-[-0.02em]">Free</span>
                <p className="text-xs text-text-faint mt-1">Runs on your own AI key</p>
                <Link href="/settings#ai-keys" className="text-xs text-primary mt-1.5 inline-block">
                  Manage keys →
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Usage chart */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-sm font-medium">Daily usage</p>
                  <p className="text-xs text-text-muted">Prompts generated · last 14 days</p>
                </div>
              </div>
              <UsageChart data={dailyUsage} />
            </CardContent>
          </Card>

          {/* Recent prompts */}
          <RecentPromptsWidget prompts={prompts} />
        </div>
      </main>
    </div>
  );
}

function UsageChart({ data }: { data: { day: string; credits: number }[] }) {
  const max = Math.max(...data.map((d) => d.credits), 1);
  return (
    <div className="h-40 flex items-end gap-1.5 pt-2">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full">
          <div className="flex-1 w-full flex items-end">
            <div
              className="w-full rounded-t-sm rounded-b-[2px] transition-all duration-300"
              style={{
                height: `${(d.credits / max) * 100}%`,
                minHeight: d.credits > 0 ? "2px" : "0",
                background:
                  i === data.length - 1 ? "var(--pe-primary)" : "var(--pe-primary-soft)",
              }}
            />
          </div>
          <span className="text-[10px] text-text-faint">{i % 2 === 0 ? d.day : ""}</span>
        </div>
      ))}
    </div>
  );
}
