import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { NewPlanButton, EditPlanButton } from "@/components/feature/admin/plan-dialog";
import { db } from "@/db/client";
import { creditCost } from "@/lib/credit-cost";

const COST_ROWS: { op: string; modality: string }[] = [
  { op: "Text / Code prompt", modality: "text" },
  { op: "Image (any resolution)", modality: "image" },
  { op: "Audio", modality: "audio" },
  { op: "Music", modality: "music" },
  { op: "Video", modality: "video" },
];

export default async function AdminPlansPage() {
  const session = await auth();

  const [planRows, activeCountRows] = await Promise.all([
    db.plan.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { subscriptions: true } } },
    }),
    db.subscription.groupBy({
      by: ["planId"],
      where: { status: { in: ["ACTIVE", "TRIALING"] } },
      _count: { _all: true },
    }),
  ]);

  const activeCountMap = Object.fromEntries(
    activeCountRows.map((r) => [r.planId, r._count._all])
  );

  const PLANS = planRows.map((p) => {
    // Plan 2026-05-08 hardcode-cleanup — Custom plan = priceMonthly + priceYearly +
    // monthlyCredits hepsi 0. Slug değerine bağımlılık yok; admin /pr/yonet/plans
    // panelinden bu üçlüyü 0 yaparsa otomatik "Custom" görünür.
    const isCustom =
      Number(p.priceMonthly) === 0 &&
      Number(p.priceYearly) === 0 &&
      p.monthlyCredits === 0;
    return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: isCustom ? null : Number(p.priceMonthly),
    credits: p.monthlyCredits || null,
    users: p._count.subscriptions,
    active: p.isActive,
    activeSubscriberCount: activeCountMap[p.id] ?? 0,
    // for EditPlanButton
    isActive: p.isActive,
    featured: p.featured,
    features: Array.isArray(p.features) ? (p.features as string[]) : [],
    priceMonthly: Number(p.priceMonthly),
    priceYearly: Number(p.priceYearly),
    monthlyCredits: p.monthlyCredits,
    sortOrder: p.sortOrder,
    };
  });
  return (
    <AdminShell current="plans" userEmail={session?.user?.email}>
      <AdminPageHeader
        helpKey="plans"
        title="Plans & Pricing"
        sub="Manage public plans, pricing, and feature flags"
        actions={<NewPlanButton />}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {PLANS.map((p) => (
          <div key={p.name} className={`rounded-xl border border-border bg-surface p-4 ${!p.active ? "opacity-60" : ""}`}>
            <div className="flex justify-between items-start mb-2">
              <p className="font-semibold">{p.name}</p>
              <Badge variant={p.active ? "success" : "default"}>{p.active ? "Live" : "Hidden"}</Badge>
            </div>
            <p className="text-[22px] font-semibold">
              {p.price === null ? "Custom" : p.price === 0 ? "Free" : `$${p.price}/mo`}
            </p>
            <p className="text-xs text-text-muted mt-1">{p.credits ? `${p.credits} credits/mo` : "Custom"}</p>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-text-faint">{p.users.toLocaleString()} users</span>
              <EditPlanButton plan={p} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="font-semibold text-[15px] mb-1">Credit cost rules</h3>
        <p className="text-xs text-text-muted mb-4">Per generation · all plans · source: <code className="text-[11px]">src/lib/credit-cost.ts</code></p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint">
              <th className="text-left pb-3">Operation</th>
              <th className="text-right pb-3">Cost</th>
            </tr>
          </thead>
          <tbody>
            {COST_ROWS.map(({ op, modality }) => (
              <tr key={modality} className="border-t border-border">
                <td className="py-2.5">{op}</td>
                <td className="py-2.5 text-right tabular-nums font-mono">{creditCost(modality)} cr</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-text-faint mt-4">
          Iteration cost = base × <code className="text-[11px]">Plan.iterationCostMultiplier</code> (currently 1.00 for every active plan).
        </p>
      </div>
    </AdminShell>
  );
}
