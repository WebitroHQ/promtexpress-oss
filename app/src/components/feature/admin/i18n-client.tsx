"use client";

import * as React from "react";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addLocale, deleteLocale, importPoFile } from "@/server/actions/admin-i18n";

type LocaleRow = {
  code: string;
  name: string;
  coverage: number;
  strings: number;
  baseStrings: number;
  rtl: boolean;
};

export function I18nClient({ locales }: { locales: LocaleRow[] }) {
  const [busy, setBusy] = React.useState(false);

  async function handleAdd() {
    const code = window.prompt("New locale code (e.g. 'es', 'de', 'fr'):", "");
    if (!code) return;
    setBusy(true);
    try {
      await addLocale({ code: code.trim() });
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(code: string) {
    if (!window.confirm(`Delete locale "${code}" entirely?`)) return;
    setBusy(true);
    try {
      await deleteLocale(code);
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleImportPo(code: string) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".po,text/x-gettext-translation";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();

      // Dry run first
      setBusy(true);
      try {
        const dry = await importPoFile({ locale: code, poContent: text, dryRun: true });
        const ok = window.confirm(
          `Dry run result:\n\n` +
          `+ ${dry.added} new keys\n` +
          `↻ ${dry.updated} to update\n` +
          `= ${dry.skipped} to skip (already identical)\n` +
          `total ${dry.totalEntries} entries\n\n` +
          `Apply?`
        );
        if (!ok) return;
        const real = await importPoFile({ locale: code, poContent: text, dryRun: false });
        window.alert(`Import complete: +${real.added} ↻${real.updated} =${real.skipped}`);
      } catch (e) {
        window.alert((e as Error).message);
      } finally {
        setBusy(false);
      }
    };
    input.click();
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={handleAdd} disabled={busy}>
          <Plus className="h-3.5 w-3.5" /> Add language
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {locales.map((l) => (
          <div key={l.code} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  {l.name}
                  {l.rtl && <Badge className="text-[9px]">RTL</Badge>}
                </p>
                <p className="text-xs text-text-faint">{l.code} · {l.strings} / {l.baseStrings}</p>
              </div>
              <span className={`font-semibold text-sm ${
                l.coverage === 100 ? "text-success" : l.coverage >= 90 ? "text-text" : "text-warning"
              }`}>{l.coverage}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden mb-3">
              <div
                className={`h-full rounded-full ${l.coverage === 100 ? "bg-success" : "bg-primary"}`}
                style={{ width: `${l.coverage}%` }}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleImportPo(l.code)}
                disabled={busy}
                className="text-[11px] text-primary hover:underline disabled:opacity-50 flex items-center gap-1"
              >
                <Upload className="h-3 w-3" /> Import .po
              </button>
              {l.code !== "en" && (
                <button
                  onClick={() => handleDelete(l.code)}
                  disabled={busy}
                  className="text-[11px] text-error hover:underline disabled:opacity-50"
                >
                  Delete locale
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
