import { db } from "@/db/client";

export interface SessionRow {
  id: string;
  expires: string;
  isCurrent: boolean;
}

/**
 * All active (non-expired) sessions for a user.
 * `currentSessionToken` is used to mark which session is the caller's.
 */
export async function getUserSessions(
  userId: string,
  currentSessionToken?: string,
): Promise<SessionRow[]> {
  const rows = await db.session.findMany({
    where: { userId, expires: { gt: new Date() } },
    orderBy: { expires: "desc" },
    select: { id: true, sessionToken: true, expires: true },
  });

  return rows.map((s) => ({
    id: s.id,
    expires: s.expires.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    isCurrent: currentSessionToken ? s.sessionToken === currentSessionToken : false,
  }));
}
