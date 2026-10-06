import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { PersonasClient, type PersonaRow } from "@/components/feature/admin/personas-client";
import { db } from "@/db/client";

export const dynamic = "force-dynamic";

export default async function PersonasPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const personas = await db.expertPersona.findMany({
    orderBy: { sortOrder: "asc" },
  });

  // Son 30 gün GenerationTrace üzerinden persona kullanım sayımı + ort. quality.
  // contextJson->>'personaSlug' = ExpertPersona.domainSlug
  // validationJson->>'qualityScore' (varsa) → number
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const usageRows = await db.$queryRaw<
    { slug: string; count: bigint; avgq: number | null }[]
  >`
    SELECT
      "contextJson"->>'personaSlug' AS slug,
      COUNT(*)::bigint AS count,
      AVG(
        NULLIF(("validationJson"->>'qualityScore'), '')::numeric
      )::float8 AS avgq
    FROM "GenerationTrace"
    WHERE "createdAt" >= ${since}
      AND "contextJson"->>'personaSlug' IS NOT NULL
    GROUP BY "contextJson"->>'personaSlug'
  `;

  const usageMap = new Map<string, { count: number; avgq: number | null }>();
  for (const r of usageRows) {
    if (r.slug) usageMap.set(r.slug, { count: Number(r.count), avgq: r.avgq });
  }

  // Orphan domains: intent analyzer üretmiş ama persona yok.
  const intentDomainRows = await db.$queryRaw<{ domain: string }[]>`
    SELECT DISTINCT "intentJson"->>'domain' AS domain
    FROM "GenerationTrace"
    WHERE "createdAt" >= ${since}
      AND "intentJson"->>'domain' IS NOT NULL
      AND "intentJson"->>'domain' != ''
  `;
  const personaSlugs = new Set(personas.map((p) => p.domainSlug));
  const orphanDomains = intentDomainRows
    .map((r) => r.domain)
    .filter((d): d is string => !!d && !personaSlugs.has(d))
    .slice(0, 20);

  const rows: PersonaRow[] = personas.map((p) => {
    const u = usageMap.get(p.domainSlug);
    return {
      id: p.id,
      domainSlug: p.domainSlug,
      name: p.name,
      body: p.body,
      jargon: p.jargon,
      frameworks: p.frameworks,
      antiPatterns: p.antiPatterns,
      notes: p.notes,
      isActive: p.isActive,
      sortOrder: p.sortOrder,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      updatedBy: p.updatedBy,
      usageCount: u?.count ?? 0,
      avgQuality: u?.avgq ?? null,
    };
  });

  return (
    <AdminShell current="personas" userEmail={session.user.email}>
      <AdminPageHeader
        helpKey="personas"
        title="Expert Personas"
        sub={`${personas.length} domain experts — injected into the Synthesizer's system prompt based on intent.domain.`}
      />
      <PersonasClient personas={rows} orphanDomains={orphanDomains} />
    </AdminShell>
  );
}
