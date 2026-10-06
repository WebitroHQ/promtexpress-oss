"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustUserCredits } from "@/server/actions/admin-credits";
import type { BalanceBreakdown } from "@/lib/credits/balance";

type LedgerRow = {
  id: string;
  createdAt: Date;
  reason: string;
  delta: number;
  consumed: boolean;
  consumedAmount: number;
  expiresAt: Date | null;
  meta: unknown;
};

export function UserCreditsClient({
  userId,
  balance,
  ledger,
}: {
  userId: string;
  balance: BalanceBreakdown;
  ledger: LedgerRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const n = Number(delta);
    if (!Number.isFinite(n) || n === 0) {
      setMessage("Delta must be non-zero number");
      return;
    }
    startTransition(async () => {
      const r = await adjustUserCredits({
        userId,
        delta: n,
        note,
        expiresAt: expiresAt || null,
      });
      if (r.ok) {
        setMessage(`Adjusted by ${n}`);
        setDelta("");
        setNote("");
        setExpiresAt("");
        router.refresh();
      } else {
        setMessage(`Error: ${r.error}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Available" value={balance.available} highlight />
        <Stat label="Total grants" value={balance.total} />
        <Stat label="Period used" value={balance.used} />
        <Stat
          label="Renews"
          value={new Date(balance.renewDate).toISOString().slice(0, 10)}
          isString
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {(Object.entries(balance.byBucket) as Array<[string, number]>).map(([k, v]) => (
          <Stat key={k} label={k} value={v} />
        ))}
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded border border-border p-4 space-y-3 bg-bg-elev"
      >
        <h3 className="font-semibold">Manual adjustment</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm space-y-1">
            <span className="text-text-muted">Delta (+/-)</span>
            <input
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              className="w-full px-2 py-1 rounded border border-border bg-bg"
              placeholder="e.g. 50 or -10"
              required
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-text-muted">Expires (only for + grants)</span>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-2 py-1 rounded border border-border bg-bg"
            />
          </label>
          <label className="text-sm space-y-1 md:col-span-1">
            <span className="text-text-muted">Note (required)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-2 py-1 rounded border border-border bg-bg"
              placeholder="reason for adjustment"
              required
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded bg-primary text-bg disabled:opacity-50"
        >
          {pending ? "Saving..." : "Apply adjustment"}
        </button>
        {message && <div className="text-sm">{message}</div>}
      </form>

      <div className="rounded border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-elev text-text-muted">
            <tr>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2 text-left">Reason</th>
              <th className="px-3 py-2 text-right">Δ</th>
              <th className="px-3 py-2 text-right">Consumed</th>
              <th className="px-3 py-2 text-left">Expires</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 text-xs">
                  {new Date(r.createdAt).toISOString()}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.reason}</td>
                <td
                  className={`px-3 py-2 text-right font-mono ${r.delta >= 0 ? "text-success" : "text-error"}`}
                >
                  {r.delta > 0 ? "+" : ""}
                  {r.delta}
                </td>
                <td className="px-3 py-2 text-right text-xs font-mono">
                  {r.delta > 0 ? `${r.consumedAmount}/${r.delta}` : "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.expiresAt ? new Date(r.expiresAt).toISOString().slice(0, 10) : "—"}
                </td>
                <td className="px-3 py-2 text-xs">{r.consumed ? "consumed" : "active"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  isString,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
  isString?: boolean;
}) {
  return (
    <div
      className={`rounded border ${highlight ? "border-primary" : "border-border"} px-3 py-2`}
    >
      <div className="text-xs text-text-muted">{label}</div>
      <div className={`text-lg font-mono ${highlight ? "text-primary" : ""}`}>
        {isString ? value : Number(value).toLocaleString()}
      </div>
    </div>
  );
}
