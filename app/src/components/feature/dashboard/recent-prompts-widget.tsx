"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { Copy, Bookmark, BookmarkCheck, Video, Code2, Image, Type, Music, Mic } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toggleFavorite } from "@/server/actions/prompts";
import type { RecentPrompt } from "@/server/queries/prompts";

const MODALITY_ICONS: Record<string, React.ElementType> = {
  video: Video,
  code: Code2,
  image: Image,
  text: Type,
  music: Music,
  audio: Mic,
};

interface Props {
  prompts: RecentPrompt[];
}

export function RecentPromptsWidget({ prompts }: Props) {
  const router = useRouter();
  const [favoriteStates, setFavoriteStates] = React.useState<Record<string, boolean>>({});

  const handleCopy = async (prompt: RecentPrompt) => {
    const text = prompt.result ?? prompt.title;
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleToggleFavorite = async (prompt: RecentPrompt) => {
    const optimistic = !(favoriteStates[prompt.id] ?? false);
    setFavoriteStates((prev) => ({ ...prev, [prompt.id]: optimistic }));
    try {
      const result = await toggleFavorite(prompt.id);
      setFavoriteStates((prev) => ({ ...prev, [prompt.id]: result.isFavorited }));
      toast.success(result.isFavorited ? "Saved to favorites" : "Removed from favorites");
      router.refresh();
    } catch (err) {
      setFavoriteStates((prev) => ({ ...prev, [prompt.id]: !optimistic }));
      toast.error(err instanceof Error ? err.message : "Failed to update favorite");
    }
  };

  if (prompts.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between py-4 px-6 border-b border-border">
          <p className="text-sm font-medium">Recent prompts</p>
          <Link href="/history" className="text-sm text-primary hover:underline">
            View history →
          </Link>
        </CardHeader>
        <div className="px-6 py-10 text-center text-sm text-text-muted">
          No prompts yet.{" "}
          <Link href="/generator" className="text-primary hover:underline">
            Generate your first →
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between py-4 px-6 border-b border-border">
        <p className="text-sm font-medium">Recent prompts</p>
        <Link href="/history" className="text-sm text-primary hover:underline">
          View history →
        </Link>
      </CardHeader>
      <div>
        {prompts.map((p, i) => {
          const ModalityIcon = MODALITY_ICONS[p.mod] ?? Type;
          const isFav = favoriteStates[p.id] ?? false;
          return (
            <div
              key={p.id}
              className={
                "grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-3 sm:gap-3.5 px-4 sm:px-6 py-3.5 " +
                (i > 0 ? "border-t border-border" : "")
              }
            >
              <div className="w-8 h-8 rounded-lg bg-surface-2 text-text-muted inline-flex items-center justify-center shrink-0">
                <ModalityIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{p.title}</p>
                <p className="text-xs text-text-muted sm:hidden mt-0.5">{p.date} · {p.cost}cr</p>
              </div>
              <Badge variant="default" className="hidden sm:inline-flex">{p.cost}cr</Badge>
              <span className="text-xs text-text-muted min-w-[80px] hidden sm:block">{p.date}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Copy prompt"
                onClick={() => handleCopy(p)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
                onClick={() => handleToggleFavorite(p)}
              >
                {isFav ? (
                  <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
