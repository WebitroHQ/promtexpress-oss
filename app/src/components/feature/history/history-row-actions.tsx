"use client";

import * as React from "react";
import { Eye, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { HistoryRow } from "@/server/queries/prompts";

interface Props {
  row: HistoryRow;
}

export function HistoryRowActions({ row }: Props) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!row.result) {
      toast.error("No result to copy (generation failed)");
      return;
    }
    await navigator.clipboard.writeText(row.result);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="flex gap-1">
        <button
          className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 p-1.5 rounded hover:bg-surface text-text-muted transition-colors"
          aria-label="View prompt details"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        <button
          className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 p-1.5 rounded hover:bg-surface text-text-muted transition-colors disabled:opacity-40"
          aria-label="Copy prompt result"
          onClick={handleCopy}
          disabled={!row.result}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[640px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="truncate">{row.title}</SheetTitle>
            <SheetDescription className="font-mono text-xs">{row.id}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex flex-wrap gap-2">
            <Badge>{row.modality}</Badge>
            <Badge variant={row.status === "Failed" ? "error" : "success"}>{row.status}</Badge>
            <Badge variant="default">{row.credits}cr</Badge>
            <span className="text-xs text-text-faint self-center ml-auto">{row.date}</span>
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-text-faint mb-2">
              Your input
            </p>
            <pre className="rounded-md border border-border bg-surface-2 p-3 text-sm font-mono whitespace-pre-wrap break-words text-text">
              {row.userInput}
            </pre>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">
                Generated prompt
              </p>
              {row.result && (
                <Button size="sm" variant="ghost" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              )}
            </div>
            {row.result ? (
              <pre className="rounded-md border border-border bg-surface-2 p-3 text-sm font-mono whitespace-pre-wrap break-words text-text">
                {row.result}
              </pre>
            ) : (
              <div className="rounded-md border border-error/30 bg-error/5 p-3 text-sm text-error">
                Generation failed — no result was produced.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
