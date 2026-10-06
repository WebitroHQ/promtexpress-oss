"use server";

/**
 * Member feedback. Only signed-in users can send it; admins read it at /pr/yonet/feedback.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";

const CATEGORIES = ["bug", "idea", "other"] as const;
const STATUSES = ["NEW", "READ", "DONE"] as const;
const MIN_LENGTH = 10;
const MAX_LENGTH = 4000;
const MAX_PER_HOUR = 5;

type Result = { ok: true } | { ok: false; error: string };

export async function submitFeedback(input: { category: string; message: string }): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in to send feedback" };
  const userId = session.user.id;

  const category = (CATEGORIES as readonly string[]).includes(input.category) ? input.category : "other";
  const message = input.message.trim();
  if (message.length < MIN_LENGTH) return { ok: false, error: `Please write at least ${MIN_LENGTH} characters` };
  if (message.length > MAX_LENGTH) return { ok: false, error: `Please keep it under ${MAX_LENGTH} characters` };

  const recent = await db.feedback.count({ where: { userId, createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
  if (recent >= MAX_PER_HOUR) return { ok: false, error: "You've sent a lot of feedback in the last hour. Please try again later." };

  await db.feedback.create({ data: { userId, category, message } });
  revalidatePath("/feedback");
  return { ok: true };
}

export async function setFeedbackStatus(id: string, status: string): Promise<Result> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { ok: false, error: "Forbidden" };
  if (!(STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Unknown status" };
  await db.feedback.update({ where: { id }, data: { status } });
  revalidatePath("/pr/yonet/feedback");
  return { ok: true };
}
