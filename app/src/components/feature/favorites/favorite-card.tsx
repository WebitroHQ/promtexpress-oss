"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { toggleFavorite } from "@/server/actions/prompts";

interface FavoriteItem {
  id: string;
  title: string;
  modality: string;
  note: string;
  userInput: string;
  date: string;
}

interface Props {
  item: FavoriteItem;
  Icon: React.ElementType;
}

export function FavoriteCard({ item, Icon }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);

  const handleRemove = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await toggleFavorite(item.id);
      toast.success("Removed from favorites");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
      setIsPending(false);
    }
  };

  const generatorHref = `/generator?intent=${encodeURIComponent(item.userInput)}`;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex justify-between items-start mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary inline-flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <button
          onClick={handleRemove}
          disabled={isPending}
          className="p-1 rounded text-text-muted hover:bg-error/10 hover:text-error transition-colors disabled:opacity-50"
          aria-label={`Remove ${item.title} from favorites`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <h3 className="font-semibold text-[15px] mb-1.5">{item.title}</h3>
      <p className="text-sm text-text-muted leading-relaxed line-clamp-3">{item.note}</p>
      <div className="flex justify-between items-center mt-4">
        <span className="text-xs text-text-faint">{item.date}</span>
        <Button variant="secondary" size="sm" asChild>
          <Link href={generatorHref}>
            Use <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
