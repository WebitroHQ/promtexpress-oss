import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AppSidebar } from "@/components/feature/layout/app-sidebar";
import { AppTopBar } from "@/components/feature/layout/app-top-bar";
import { SettingsClient } from "@/components/feature/settings/settings-client";
import { getUserCredits } from "@/server/queries/credits";
import { getUserSessions } from "@/server/queries/sessions";
import { db } from "@/db/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth-cookie";
import { listAiKeys } from "@/server/queries/ai-keys";
import { USER_KEY_PROVIDERS } from "@/lib/engines/user-key";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const c = await cookies();
  const currentToken = c.get(SESSION_COOKIE_NAME)?.value;

  const [credits, sessions, dbUser, aiKeys] = await Promise.all([
    getUserCredits(session.user.id),
    getUserSessions(session.user.id, currentToken),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { locale: true, passwordHash: true },
    }),
    listAiKeys(session.user.id),
  ]);
  const aiKeyProviders = Object.entries(USER_KEY_PROVIDERS).map(([value, p]) => ({
    value,
    label: p.label,
    defaultModel: p.defaultModel,
  }));

  // Sadece boolean — raw hash client'a asla geçmez.
  const hasPassword = !!dbUser?.passwordHash;

  return (
    <div className="flex min-h-screen bg-bg">
      <AppSidebar credits={credits} />

      <main className="flex-1 min-w-0 flex flex-col">
        <AppTopBar userEmail={session.user?.email} />

        <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1280px] w-full mx-auto pb-16">
          <div className="mb-6">
            <h1 className="text-[28px] font-semibold tracking-[-0.025em]">Settings</h1>
            <p className="text-sm text-text-muted mt-1">
              Manage your account, preferences, and security
            </p>
          </div>
          <SettingsClient
            userName={session.user?.name ?? ""}
            userEmail={session.user?.email ?? ""}
            userLocale={dbUser?.locale ?? "en"}
            hasPassword={hasPassword}
            sessions={sessions}
            aiKeys={aiKeys}
            aiKeyProviders={aiKeyProviders}
          />
        </div>
      </main>
    </div>
  );
}
