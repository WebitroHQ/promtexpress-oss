"use client";

import * as React from "react";
import { Copy, Trash2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createApiKey, revokeApiKey, rotateApiKey } from "@/server/actions/api-keys";

const SCOPES = ["read", "generate", "admin"] as const;
type Scope = typeof SCOPES[number];

type PresetExpiration = "never" | "30" | "90" | "365" | "custom";

export interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  lastUsed: string;
  created: string;
  expiresAt: string | null;
}

interface Props {
  keys: ApiKeyRow[];
  pageLimit: number;
}

export function ApiKeysClient({ keys, pageLimit }: Props) {
  const t = useTranslations("apiKeys");
  const router = useRouter();
  const [showCreate, setShowCreate] = React.useState(false);
  const [confirmRevoke, setConfirmRevoke] = React.useState<ApiKeyRow | null>(null);
  const [confirmRotate, setConfirmRotate] = React.useState<ApiKeyRow | null>(null);
  const [revealedKey, setRevealedKey] = React.useState<{ name: string; plainKey: string } | null>(null);
  const [keyName, setKeyName] = React.useState("");
  const [scopes, setScopes] = React.useState<Record<Scope, boolean>>({
    read: true,
    generate: true,
    admin: false,
  });
  const [expiration, setExpiration] = React.useState<PresetExpiration>("never");
  const [customDays, setCustomDays] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);

  const expirationDays = (v: PresetExpiration, custom: string): number | undefined => {
    if (v === "never") return undefined;
    if (v === "custom") {
      const n = Number.parseInt(custom, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 3650) return n;
      return undefined;
    }
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : undefined;
  };

  const selectedScopes: Scope[] = SCOPES.filter((s) => scopes[s]);

  const handleCreate = async () => {
    if (selectedScopes.length === 0) {
      toast.error(t("toast.createFailed"));
      return;
    }
    setIsPending(true);
    try {
      const result = await createApiKey({
        name: keyName || "API key",
        scopes: selectedScopes,
        expiresInDays: expirationDays(expiration, customDays),
      });
      setShowCreate(false);
      setRevealedKey({ name: result.name, plainKey: result.plainKey });
      setKeyName("");
      setScopes({ read: true, generate: true, admin: false });
      setExpiration("never");
      setCustomDays("");
      toast.success(t("toast.created"));
      // NOTE: router.refresh() çağrısı reveal dialog kapanırken yapılıyor
      // (Dialog onOpenChange handler). Burada çağırmak server component
      // refetch'ini tetikler ve reveal dialog state'i kaybolup dialog
      // beklenmedik şekilde kapanabilir. Plain key bir kez gösterildiği için
      // user dismiss etmeden refresh tetiklenmez.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.createFailed"));
    } finally {
      setIsPending(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeApiKey(id);
      toast.success(t("toast.revoked"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.revokeFailed"));
    }
  };

  const handleRotate = async (row: ApiKeyRow) => {
    try {
      const result = await rotateApiKey(row.id);
      setRevealedKey({ name: result.name, plainKey: result.plainKey });
      toast.success(t("toast.rotated"));
      // router.refresh() reveal dialog kapanırken çağrılıyor (handleCreate
      // ile aynı sebep — state'i koru, dialog kullanıcı dismiss edene kadar açık kalsın).
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.rotateFailed"));
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t("toast.copied"));
  };

  const scopeDescription: Record<Scope, string> = {
    read: t("create.scopeRead"),
    generate: t("create.scopeGenerate"),
    admin: t("create.scopeAdmin"),
  };

  const showLimitNote = keys.length >= pageLimit;

  return (
    <>
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex justify-between items-center gap-3">
          <span className="text-sm font-medium text-text-muted">{t("list.count", { count: keys.length })}</span>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" /> {t("actions.newKey")}
          </Button>
        </div>
        {keys.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-text-muted">
            {t("list.empty")}
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="sm:hidden">
              {keys.map((k, i) => (
                <div key={k.id} className={`px-4 py-3.5 ${i > 0 ? "border-t border-border" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{k.name}</p>
                      <code className="text-xs font-mono text-text-muted block mt-0.5 truncate">{k.prefix}…</code>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setConfirmRotate(k)}
                        className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] p-1.5 rounded hover:bg-surface-2 text-text-muted transition-colors"
                        aria-label={t("actions.rotateLabel", { name: k.name })}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmRevoke(k)}
                        className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] p-1.5 rounded hover:bg-error/10 text-error transition-colors"
                        aria-label={t("actions.revokeLabel", { name: k.name })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2.5 text-xs text-text-muted">
                    <div className="flex flex-col">
                      <dt className="text-[10px] uppercase tracking-wide text-text-faint">{t("list.labelLastUsed")}</dt>
                      <dd>{k.lastUsed}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-[10px] uppercase tracking-wide text-text-faint">{t("list.labelCreated")}</dt>
                      <dd>{k.created}</dd>
                    </div>
                    <div className="flex flex-col col-span-2">
                      <dt className="text-[10px] uppercase tracking-wide text-text-faint">{t("list.labelExpires")}</dt>
                      <dd>{k.expiresAt ?? t("list.never")}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-surface-2">
                    <th className="px-5 py-3 text-left font-medium text-text-muted">{t("list.headerName")}</th>
                    <th className="px-5 py-3 text-left font-medium text-text-muted">{t("list.headerPrefix")}</th>
                    <th className="px-5 py-3 text-left font-medium text-text-muted">{t("list.headerLastUsed")}</th>
                    <th className="px-5 py-3 text-left font-medium text-text-muted">{t("list.headerCreated")}</th>
                    <th className="px-5 py-3 text-left font-medium text-text-muted">{t("list.headerExpires")}</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} className="border-t border-border hover:bg-surface-2 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium">{k.name}</div>
                      </td>
                      <td className="px-5 py-3">
                        <code className="text-xs font-mono text-text-muted">{k.prefix}…</code>
                      </td>
                      <td className="px-5 py-3 text-text-muted">{k.lastUsed}</td>
                      <td className="px-5 py-3 text-text-muted">{k.created}</td>
                      <td className="px-5 py-3 text-text-muted">{k.expiresAt ?? t("list.never")}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setConfirmRotate(k)}
                            className="inline-flex items-center justify-center p-1.5 rounded hover:bg-surface-2 text-text-muted transition-colors"
                            aria-label={t("actions.rotateLabel", { name: k.name })}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmRevoke(k)}
                            className="inline-flex items-center justify-center p-1.5 rounded hover:bg-error/10 text-error transition-colors"
                            aria-label={t("actions.revokeLabel", { name: k.name })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {showLimitNote && (
              <div className="px-5 py-3 border-t border-border text-xs text-text-muted">
                {t("list.showingFirst", { count: pageLimit })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-[420px] p-0">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle>{t("create.title")}</DialogTitle>
          </DialogHeader>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="key-name">{t("create.nameLabel")}</Label>
              <Input
                id="key-name"
                placeholder={t("create.namePlaceholder")}
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label>{t("create.scopesLabel")}</Label>
              <div className="flex flex-col gap-2 mt-2">
                {SCOPES.map((scope) => (
                  <label
                    key={scope}
                    className="flex gap-2.5 items-center p-3 border border-border rounded-lg text-sm cursor-pointer hover:bg-surface-2 transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={scopes[scope]}
                      onChange={(e) => setScopes((s) => ({ ...s, [scope]: e.target.checked }))}
                    />
                    <span className="font-medium">{scope}</span>
                    <span className="text-text-muted">· {scopeDescription[scope]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="key-expiration">{t("create.expirationLabel")}</Label>
              <select
                id="key-expiration"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value as PresetExpiration)}
                className="h-9 rounded-md border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="never">{t("create.expirationNever")}</option>
                <option value="30">{t("create.expiration30")}</option>
                <option value="90">{t("create.expiration90")}</option>
                <option value="365">{t("create.expiration365")}</option>
                <option value="custom">{t("create.expirationCustom")}</option>
              </select>
              {expiration === "custom" && (
                <Input
                  type="number"
                  min={1}
                  max={3650}
                  placeholder={t("create.expirationCustomPlaceholder")}
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className="mt-1.5"
                />
              )}
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border">
            <Button variant="ghost" onClick={() => setShowCreate(false)} disabled={isPending}>
              {t("create.cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                isPending ||
                !keyName.trim() ||
                selectedScopes.length === 0 ||
                (expiration === "custom" && expirationDays(expiration, customDays) === undefined)
              }
            >
              {isPending ? t("create.submitting") : t("create.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reveal-once dialog */}
      <Dialog
        open={revealedKey !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRevealedKey(null);
            // Refresh server data only AFTER user dismisses the reveal dialog,
            // so the plain key stays visible until they confirm.
            router.refresh();
          }
        }}
      >
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{t("reveal.title")}</DialogTitle>
            <DialogDescription>
              {t("reveal.description", { name: revealedKey?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          {revealedKey && (
            <div className="rounded-md bg-surface-2 border border-border p-3 flex items-center gap-2">
              <code className="flex-1 text-xs font-mono break-all">{revealedKey.plainKey}</code>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleCopy(revealedKey.plainKey)}
                aria-label={t("reveal.copy")}
              >
                <Copy className="h-3.5 w-3.5" /> {t("reveal.copy")}
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                setRevealedKey(null);
                router.refresh();
              }}
            >
              {t("reveal.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmRevoke !== null}
        onOpenChange={(open) => !open && setConfirmRevoke(null)}
        title={t("revokeConfirm.title", { name: confirmRevoke?.name ?? "" })}
        description={t("revokeConfirm.description")}
        confirmLabel={t("revokeConfirm.confirm")}
        destructive
        onConfirm={async () => {
          if (confirmRevoke) await handleRevoke(confirmRevoke.id);
        }}
      />

      <ConfirmDialog
        open={confirmRotate !== null}
        onOpenChange={(open) => !open && setConfirmRotate(null)}
        title={t("rotateConfirm.title", { name: confirmRotate?.name ?? "" })}
        description={t("rotateConfirm.description")}
        confirmLabel={t("rotateConfirm.confirm")}
        onConfirm={async () => {
          if (confirmRotate) await handleRotate(confirmRotate);
        }}
      />
    </>
  );
}
