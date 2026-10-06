"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { saveEngineApiKey } from "@/server/actions/admin-engines";

export function EngineConfigureDialog({
  engineId,
  engineName,
  hasKey,
}: {
  engineId: string;
  engineName: string;
  hasKey: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await saveEngineApiKey(engineId, key);
        setKey("");
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="text-sm text-primary hover:underline">
          {hasKey ? "Update key" : "Add key"}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-overlay z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] rounded-xl border border-border bg-surface p-6 shadow-lg focus:outline-none">
          <Dialog.Title className="text-base font-semibold mb-1">
            Configure — {engineName}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-text-muted mb-5">
            {hasKey
              ? "Replace the current API key."
              : "Enter the provider API key. It is encrypted with AES-256-GCM before storage."}
          </Dialog.Description>
          <div className="flex flex-col gap-3">
            <Label htmlFor={`api-key-${engineId}`}>API Key</Label>
            <PasswordInput
              id={`api-key-${engineId}`}
              placeholder="sk-…"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="off"
              autoFocus
            />
            {error && <p className="text-sm text-error">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              size="sm"
              disabled={!key.trim() || pending}
              onClick={handleSave}
            >
              {pending ? "Saving…" : "Save key"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
