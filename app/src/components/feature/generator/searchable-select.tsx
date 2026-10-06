"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface SearchableSelectItem {
  value: string;
  label: string;
  keywords?: string[];
  hint?: string;
}

export interface SearchableSelectGroup {
  label?: string;
  items: SearchableSelectItem[];
}

export interface SearchableSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  groups: SearchableSelectGroup[];
  placeholder: string;
  searchPlaceholder: string;
  ariaLabel: string;
  emptyMessage?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

const TRIGGER_CLASS = [
  "flex w-full items-center justify-between",
  "rounded-[var(--pe-r-md)] border border-border-strong bg-surface",
  "pl-3.5 pr-3 py-2.5 text-[14px] text-text",
  "cursor-pointer text-left",
  "focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20",
  "transition-all disabled:opacity-50 disabled:cursor-not-allowed",
  "data-[state=open]:border-primary data-[state=open]:ring-[3px] data-[state=open]:ring-primary/20",
].join(" ");

export function SearchableSelect({
  value,
  onChange,
  groups,
  placeholder,
  searchPlaceholder,
  ariaLabel,
  emptyMessage = "No results",
  triggerClassName,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedLabel = React.useMemo(() => {
    if (value == null || value === "") return null;
    for (const g of groups) {
      for (const it of g.items) {
        if (it.value === value) return it.label;
      }
    }
    return null;
  }, [groups, value]);

  const handleSelect = (val: string) => {
    onChange(val === "" ? null : val);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(TRIGGER_CLASS, !selectedLabel && "text-text-muted", triggerClassName)}
        >
          <span className="truncate">{selectedLabel ?? placeholder}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-text-faint" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command
          filter={(itemValue, search, keywords) => {
            const haystack = `${itemValue} ${(keywords ?? []).join(" ")}`.toLowerCase();
            const needle = search.trim().toLowerCase();
            if (!needle) return 1;
            return haystack.includes(needle) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {groups.map((group, gi) => {
              if (!group.items.length) return null;
              return (
                <CommandGroup key={`g-${gi}-${group.label ?? "_"}`} heading={group.label}>
                  {group.items.map((it) => {
                    const isSelected =
                      (value ?? "") === it.value || (value == null && it.value === "");
                    const searchKey = `${it.label} ${it.value}`;
                    return (
                      <CommandItem
                        key={`${gi}-${it.value}`}
                        value={searchKey}
                        keywords={it.keywords}
                        onSelect={() => handleSelect(it.value)}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isSelected ? "opacity-100 text-primary" : "opacity-0",
                          )}
                        />
                        <span className="flex-1 truncate">{it.label}</span>
                        {it.hint && (
                          <span className="ml-2 shrink-0 text-xs text-text-faint">
                            {it.hint}
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
