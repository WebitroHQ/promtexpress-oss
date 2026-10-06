"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setFeedbackStatus } from "@/server/actions/feedback";

const NEXT: Record<string, { status: string; label: string }[]> = {
  NEW: [
    { status: "READ", label: "Mark read" },
    { status: "DONE", label: "Done" },
  ],
  READ: [
    { status: "DONE", label: "Done" },
    { status: "NEW", label: "Mark unread" },
  ],
  DONE: [{ status: "READ", label: "Reopen" }],
};

export function FeedbackStatusButtons({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const change = async (next: string) => {
    setBusy(true);
    try {
      const res = await setFeedbackStatus(id, next);
      if (res.ok) router.refresh();
      else toast.error(res.error);
    } catch {
      toast.error("Could not update the status");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {(NEXT[status] ?? NEXT.NEW).map((n) => (
        <Button key={n.status} size="sm" variant="secondary" disabled={busy} onClick={() => change(n.status)}>
          {n.label}
        </Button>
      ))}
    </div>
  );
}
