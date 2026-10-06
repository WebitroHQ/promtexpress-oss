"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { reprocessWebhookEvent } from "@/server/actions/admin-credits";

type Event = {
  id: string;
  paddleEventId: string;
  eventType: string;
  receivedAt: Date;
  processedAt: Date | null;
  error: string | null;
};

export function WebhookEventsClient({
  events,
  currentFilter,
}: {
  events: Event[];
  currentFilter: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleReprocess = (id: string) => {
    setBusyId(id);
    setMessage(null);
    startTransition(async () => {
      const r = await reprocessWebhookEvent(id);
      if (r.ok) {
        setMessage(`Reprocessed ${id}`);
        router.refresh();
      } else {
        setMessage(`Error: ${r.error}`);
      }
      setBusyId(null);
    });
  };

  const filters = [
    { key: "all", label: "All" },
    { key: "errors", label: "Errors only" },
    { key: "unprocessed", label: "Unprocessed" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={`?filter=${f.key}`}
            className={`px-3 py-1 text-sm rounded border ${
              currentFilter === f.key
                ? "bg-primary text-bg border-primary"
                : "border-border text-text-muted hover:text-text"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {message && (
        <div className="px-3 py-2 rounded border border-border text-sm">{message}</div>
      )}

      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-elev text-text-muted">
            <tr>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Paddle Event ID</th>
              <th className="px-3 py-2 text-left">Received</th>
              <th className="px-3 py-2 text-left">Processed</th>
              <th className="px-3 py-2 text-left">Error</th>
              <th className="px-3 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-text-muted">
                  No events.
                </td>
              </tr>
            )}
            {events.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{e.eventType}</td>
                <td className="px-3 py-2 font-mono text-xs text-text-muted">
                  {e.paddleEventId}
                </td>
                <td className="px-3 py-2 text-xs">{new Date(e.receivedAt).toISOString()}</td>
                <td className="px-3 py-2 text-xs">
                  {e.processedAt ? new Date(e.processedAt).toISOString() : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-error max-w-[300px] truncate">
                  {e.error ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleReprocess(e.id)}
                    disabled={pending && busyId === e.id}
                    className="px-2 py-1 text-xs rounded border border-border hover:bg-bg-elev disabled:opacity-50"
                  >
                    {pending && busyId === e.id ? "..." : "Reprocess"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
