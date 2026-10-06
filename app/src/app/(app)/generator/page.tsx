import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/feature/layout/app-sidebar";
import { AppTopBar } from "@/components/feature/layout/app-top-bar";
import { GeneratorClient } from "@/components/feature/generator/generator-client";
import { getUserCredits } from "@/server/queries/credits";
import { getRecentPrompts } from "@/server/queries/prompts";
import { getRequireEmailVerification } from "@/server/queries/app-settings";
import { getPopularTargets } from "@/server/queries/popular-targets";
import { db } from "@/db/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MODALITIES = [
  "text",
  "image",
  "video",
  "audio",
  "code",
  "music",
  "math",
  "slides",
  "diagram",
  "3d",
  "document",
] as const;
type ModalityKey = (typeof MODALITIES)[number];

interface Props {
  searchParams: Promise<{ intent?: string; verified?: string }>;
}

export default async function GeneratorPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const params = await searchParams;
  let initialIntent: string | undefined;
  try {
    initialIntent = params.intent ? decodeURIComponent(params.intent).slice(0, 4000) : undefined;
  } catch {
    initialIntent = undefined;
  }
  const justVerified = params.verified === "1";
  const requireEmailVerification = await getRequireEmailVerification();
  const emailVerified = !requireEmailVerification || !!session.user?.emailVerified;
  const userEmail = session.user?.email ?? "";

  const [credits, recentPromptRows, targetEngines, ...popularLists] = await Promise.all([
    getUserCredits(session.user.id),
    getRecentPrompts(session.user.id, 3),
    db.targetEngine.findMany({
      where: { isActive: true },
      orderBy: [{ modality: "asc" }, { provider: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        provider: true,
        modality: true,
        sortOrder: true,
        iconUrl: true,
        createdAt: true,
        tier: true,
        capabilities: true,
        releasedAt: true,
        brandColor: true,
      },
    }),
    ...MODALITIES.map((m) => getPopularTargets(m)),
  ]);

  const popularByModality: Partial<Record<ModalityKey, typeof targetEngines>> = {};
  MODALITIES.forEach((m, i) => {
    const ids = new Set(popularLists[i].map((t) => t.id));
    popularByModality[m] = targetEngines.filter((t) => ids.has(t.id));
  });

  const recentPrompts = recentPromptRows.map((p) => ({
    id: p.id,
    mod: p.mod,
    title: p.title,
    userInput: p.userInput,
    date: p.date,
  }));

  return (
    <div className="flex min-h-screen bg-bg">
      <AppSidebar credits={credits} />
      <main className="flex-1 min-w-0 flex flex-col">
        <AppTopBar userEmail={session.user?.email} />
        <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1280px] w-full mx-auto pb-16">
          <GeneratorClient
            creditsRemaining={Math.max(0, credits.total - credits.used)}
            recentPrompts={recentPrompts}
            initialIntent={initialIntent}
            targetEngines={targetEngines}
            popularByModality={popularByModality}
            emailVerified={emailVerified}
            userEmail={userEmail}
            justVerified={justVerified}
          />
        </div>
      </main>
    </div>
  );
}
