import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FolderPlus, Type, Image, Code2, Mic, Video, Music } from "lucide-react";
import { AppSidebar } from "@/components/feature/layout/app-sidebar";
import { AppTopBar } from "@/components/feature/layout/app-top-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { FavoriteCard } from "@/components/feature/favorites/favorite-card";
import { getUserCredits } from "@/server/queries/credits";
import { getFavoritePrompts } from "@/server/queries/prompts";

const MODALITY_ICON: Record<string, React.ElementType> = {
  Text: Type,
  Image,
  Code: Code2,
  Audio: Mic,
  Video,
  Music,
};

export default async function FavoritesPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const [credits, ITEMS] = await Promise.all([
    getUserCredits(session.user.id),
    getFavoritePrompts(session.user.id),
  ]);

  return (
    <div className="flex min-h-screen bg-bg">
      <AppSidebar credits={credits} />

      <main className="flex-1 min-w-0 flex flex-col">
        <AppTopBar userEmail={session.user?.email} />

        <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1280px] w-full mx-auto pb-16">
          {/* Header */}
          <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
            <div>
              <h1 className="text-[28px] font-semibold tracking-[-0.025em]">Favorites</h1>
              <p className="text-sm text-text-muted mt-1">{ITEMS.length} saved prompts</p>
            </div>
          </div>

          {/* Grid */}
          {ITEMS.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface">
              <EmptyState
                icon={FolderPlus}
                title="No favorites yet"
                description="Bookmark prompts you'll want to reuse and they'll appear here."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ITEMS.map((item) => {
                const Icon = MODALITY_ICON[item.modality] ?? Type;
                return <FavoriteCard key={item.id} item={item} Icon={Icon} />;
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
