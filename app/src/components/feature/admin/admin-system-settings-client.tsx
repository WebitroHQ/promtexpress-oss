"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { setSystemSetting } from "@/server/actions/admin-app-settings";
import { APP_SETTING_KEYS } from "@/server/queries/app-settings";
const TABS = [
  { id: "general", label: "General" },
  { id: "branding", label: "Branding" },
  { id: "limits", label: "Limits" },
  { id: "webhooks", label: "Webhooks" },
];

const RATE_LIMITS = [
  ["Free", 10, 100],
  ["Starter", 30, 1000],
  ["Pro", 60, 10000],
  ["Enterprise", "Custom", "Custom"],
] as const;

const WEBHOOKS = [
  { url: "https://verbo.com/hooks/generation", events: "generation.* (3)", status: "Active" },
  { url: "https://piri.ai/hooks/billing", events: "invoice.paid (1)", status: "Active" },
];

export function AdminSystemSettingsClient({
  requireEmailVerification,
}: {
  requireEmailVerification: boolean;
}) {
  const [tab, setTab] = React.useState("general");
  const [requireVerify, setRequireVerify] = React.useState<boolean>(requireEmailVerification);
  const [savingGeneral, setSavingGeneral] = React.useState(false);
  const [generalMsg, setGeneralMsg] = React.useState<string | null>(null);

  async function saveGeneral() {
    setSavingGeneral(true);
    setGeneralMsg(null);
    try {
      await setSystemSetting(
        APP_SETTING_KEYS.REQUIRE_EMAIL_VERIFICATION,
        requireVerify ? "true" : "false",
      );
      setGeneralMsg("Saved.");
    } catch (err) {
      setGeneralMsg(err instanceof Error ? err.message : "Save error");
    } finally {
      setSavingGeneral(false);
      setTimeout(() => setGeneralMsg(null), 3000);
    }
  }

  return (
    <div>
      <div className="flex gap-1 border-b border-border mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-[760px]">
        {tab === "general" && (
          <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-[15px]">Platform</h3>
            <div className="flex flex-col gap-1.5">
              <Label>Site URL</Label>
              <Input defaultValue="https://promtexpress.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Support email</Label>
              <Input defaultValue="hello@promtexpress.com" />
            </div>
            <div className="flex gap-5 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-primary" defaultChecked /> Allow signups
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={requireVerify}
                  onChange={(e) => setRequireVerify(e.target.checked)}
                /> Require email verification
              </label>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <Button size="sm" onClick={saveGeneral} disabled={savingGeneral}>
                {savingGeneral ? "Kaydediliyor…" : "Save changes"}
              </Button>
              {generalMsg && (
                <span className="text-xs text-text-muted">{generalMsg}</span>
              )}
            </div>
          </div>
        )}

        {tab === "branding" && (
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="font-semibold text-[15px] mb-4">Branding</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Primary color</Label>
                <Input defaultValue="#3b3a6e" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Accent color</Label>
                <Input defaultValue="#c98a3a" />
              </div>
            </div>
          </div>
        )}

        {tab === "limits" && (
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="font-semibold text-[15px] mb-4">Rate limits</h3>
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint">
                  <th className="text-left pb-3">Plan</th>
                  <th className="text-left pb-3">Per minute</th>
                  <th className="text-left pb-3">Per day</th>
                </tr>
              </thead>
              <tbody>
                {RATE_LIMITS.map(([plan, perMin, perDay]) => (
                  <tr key={plan} className="border-t border-border">
                    <td className="py-2.5 font-medium pr-4">{plan}</td>
                    <td className="py-2.5 pr-4">
                      <input className="h-8 rounded-md border border-border bg-surface px-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-primary/40" defaultValue={perMin} />
                    </td>
                    <td className="py-2.5">
                      <input className="h-8 rounded-md border border-border bg-surface px-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-primary/40" defaultValue={perDay} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {tab === "webhooks" && (
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="font-semibold text-[15px] mb-4">Webhooks</h3>
            <table className="w-full text-sm min-w-[640px] mb-4">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint border-b border-border">
                  <th className="text-left pb-3">Endpoint</th>
                  <th className="text-left pb-3">Events</th>
                  <th className="text-left pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {WEBHOOKS.map((w) => (
                  <tr key={w.url} className="border-t border-border">
                    <td className="py-2.5 font-mono text-xs pr-4">{w.url}</td>
                    <td className="py-2.5 text-text-muted pr-4">{w.events}</td>
                    <td className="py-2.5"><Badge variant="success">{w.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button size="sm"><Plus className="h-3.5 w-3.5" /> Add webhook</Button>
          </div>
        )}
      </div>
    </div>
  );
}
