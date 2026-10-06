import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/feature/layout/app-sidebar";
import { AppTopBar } from "@/components/feature/layout/app-top-bar";
import { Badge } from "@/components/ui/badge";
import { FeedbackForm } from "@/components/feature/feedback/feedback-form";
import { db } from "@/db/client";

const CATEGORY_LABEL: Record<string, string> = { bug: "Bug", idea: "Idea", other: "Other" };
const STATUS_LABEL: Record<string, string> = { NEW: "Sent", READ: "Read", DONE: "Done" };

export default async function FeedbackPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=%2Ffeedback");

  const mine = await db.feedback.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="flex min-h-screen bg-bg">
      <AppSidebar />

      <main className="flex-1 min-w-0 flex flex-col">
        <AppTopBar userEmail={session.user?.email} />

        <div className="px-4 py-6 md:px-8 md:py-8 max-w-[860px] w-full mx-auto pb-16">
          <div className="mb-6">
            <h1 className="text-[28px] font-semibold tracking-[-0.025em]">Feedback</h1>
            <p className="text-sm text-text-muted mt-1">
              Tell us what is broken, what is missing, or what you would change. The team reads every message.
            </p>
          </div>

          <FeedbackForm />

          {mine.length > 0 && (
            <section className="mt-8" aria-labelledby="feedback-sent">
              <h2 id="feedback-sent" className="font-semibold text-[15px] mb-3">
                What you have sent
              </h2>
              <ul className="flex flex-col gap-2">
                {mine.map((f) => (
                  <li key={f.id} className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-faint mb-1.5">
                      <Badge>{CATEGORY_LABEL[f.category] ?? "Other"}</Badge>
                      <span>{f.createdAt.toISOString().slice(0, 10)}</span>
                      <span>· {STATUS_LABEL[f.status] ?? f.status}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words">{f.message}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
