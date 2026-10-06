"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * App-wide toast root. Mount once near the root layout.
 * Use `import { toast } from "sonner"` in any component to fire toasts:
 *   toast.success("Copied to clipboard")
 *   toast.error("Something went wrong")
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      theme="system"
      toastOptions={{
        classNames: {
          toast:
            "rounded-[var(--pe-r-md)] border border-border bg-surface text-text shadow-md",
          description: "text-text-muted",
          actionButton: "bg-primary text-primary-text",
          cancelButton: "bg-surface-2 text-text",
        },
      }}
    />
  );
}
