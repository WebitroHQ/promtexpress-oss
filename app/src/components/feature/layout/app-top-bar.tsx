import { getLocale } from "next-intl/server";
import { UserMenu } from "./user-menu";
import { AppSidebarDrawer } from "./app-sidebar-drawer";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";

interface AppTopBarProps {
  /** Optional user email — shown next to the avatar on wider screens */
  userEmail?: string | null;
}

export async function AppTopBar({ userEmail }: AppTopBarProps) {
  // Locale source is the cookie via next-intl resolution (NEXT_LOCALE →
  // resolveLocale → middleware). User.locale is intentionally NOT read here:
  // it is a write-target for cross-device hydration on login, never a
  // read-source for rendering. Single source of truth (CLAUDE.md §0.1).
  const locale = await getLocale();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 md:px-8 border-b border-border bg-bg/80 backdrop-blur-sm">
      <AppSidebarDrawer />
      <div className="md:hidden absolute left-1/2 -translate-x-1/2">
        <Logo size="sm" />
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        {userEmail && (
          <span className="hidden md:inline text-sm text-text-muted">{userEmail}</span>
        )}
        <LanguageSwitcher currentLocale={locale} />
        <UserMenu compact />
      </div>
    </header>
  );
}
