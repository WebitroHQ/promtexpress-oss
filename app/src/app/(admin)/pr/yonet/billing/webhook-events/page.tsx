import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { WebhookEventsClient } from "@/components/feature/admin/webhook-events-client";

export const dynamic = "force-dynamic";

export default async function AdminWebhookEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const filter = params.filter ?? "all";

  const where =
    filter === "errors"
      ? { error: { not: null } }
      : filter === "unprocessed"
        ? { processedAt: null }
        : {};

  const events = await db.webhookEvent.findMany({
    where,
    orderBy: { receivedAt: "desc" },
    take: 100,
    select: {
      id: true,
      paddleEventId: true,
      eventType: true,
      receivedAt: true,
      processedAt: true,
      error: true,
    },
  });

  return (
    <AdminShell current="billing-webhook-events" userEmail={session?.user?.email}>
      <AdminPageHeader
        title="Webhook Events"
        sub="Paddle webhook history — replay any that failed"
      />
      <WebhookEventsClient events={events} currentFilter={filter} />
    </AdminShell>
  );
}
