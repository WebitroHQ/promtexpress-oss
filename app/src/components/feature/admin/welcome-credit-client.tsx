"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveWelcomeCreditAmount } from "@/server/actions/admin-welcome-credit";

export function WelcomeCreditClient({ initialAmount }: { initialAmount: number }) {
  const [amount, setAmount] = React.useState<number>(initialAmount);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const saved = await saveWelcomeCreditAmount(amount);
      setAmount(saved);
      setMsg("Saved.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save error");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  return (
    <div className="max-w-[520px] rounded-xl border border-border bg-surface p-6">
      <p className="text-sm text-text-muted mb-5">
        Credit amount automatically granted to every newly registered user. Set to <strong>0</strong> to disable.
      </p>

      <div className="space-y-2 mb-5">
        <Label htmlFor="welcome-credit-amount">Credit amount</Label>
        <Input
          id="welcome-credit-amount"
          type="number"
          min={0}
          max={10000}
          step={1}
          value={amount}
          onChange={(e) => setAmount(Math.max(0, Math.min(10000, parseInt(e.target.value || "0", 10))))}
        />
        <p className="text-xs text-text-muted">Current value: {amount}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {msg && <span className="text-sm text-text-muted">{msg}</span>}
      </div>
    </div>
  );
}
