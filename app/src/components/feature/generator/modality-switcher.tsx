"use client";

import * as React from "react";
import { Type, Code2, Image, Video, Music, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

export type Modality = "text" | "code" | "image" | "video" | "audio" | "music";

// Soldan sağa: en çok kullanılandan en aza doğru
// (LLM kullanımı > image gen > code gen > video > music > tts/audio)
const MODALITIES: { value: Modality; label: string; icon: React.ElementType }[] = [
  { value: "text",  label: "Text",  icon: Type   },
  { value: "image", label: "Image", icon: Image  },
  { value: "code",  label: "Code",  icon: Code2  },
  { value: "video", label: "Video", icon: Video  },
  { value: "music", label: "Music", icon: Music  },
  { value: "audio", label: "Audio", icon: Mic    },
];

interface ModalitySwitcherProps {
  value: Modality;
  onChange: (value: Modality) => void;
  className?: string;
}

export function ModalitySwitcher({ value, onChange, className }: ModalitySwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Select modality"
      className={cn(
        "inline-flex w-full sm:w-auto items-center justify-between sm:justify-start gap-0.5 sm:gap-1 rounded-[var(--pe-r-md)] bg-surface-2 p-1",
        className
      )}
    >
      {MODALITIES.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          role="tab"
          aria-selected={value === v}
          aria-label={label}
          onClick={() => onChange(v)}
          className={cn(
            "inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-[calc(var(--pe-r-md)-2px)] px-2 sm:px-3 py-2 sm:py-1.5 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap",
            value === v
              ? "bg-surface text-text shadow-sm"
              : "text-text-muted hover:text-text"
          )}
        >
          <Icon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
