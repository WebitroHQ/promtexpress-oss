"use client";

import * as React from "react";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface HelpSection {
  heading: string;
  body?: string;
  bullets?: string[];
}

export interface HelpContent {
  title: string;
  purpose: string;
  sections: HelpSection[];
}

interface Props {
  content: HelpContent;
  triggerLabel: string;
}

export function HelpDialogButton({ content, triggerLabel }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" type="button">
          <Info className="h-3.5 w-3.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.purpose}</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto pr-2 -mr-2 mt-2 space-y-5 text-sm leading-relaxed">
          {content.sections.map((s, i) => (
            <section key={i}>
              <h3 className="font-semibold text-text mb-1.5 text-[13px] uppercase tracking-wide text-text-muted">
                {s.heading}
              </h3>
              {s.body && <p className="text-text whitespace-pre-line">{s.body}</p>}
              {s.bullets && (
                <ul className="list-disc pl-5 space-y-1 text-text mt-1">
                  {s.bullets.map((b, j) => (
                    <li key={j} className="whitespace-pre-line">{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
