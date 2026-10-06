import * as React from "react";
import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Logo } from "./logo";
import { UserMenu, PublicAuthFallback } from "./user-menu";
import { MobileNavToggle } from "./mobile-nav-toggle";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
}

interface TopNavProps {
  links?: NavLink[];
  cta?: React.ReactNode;
  className?: string;
}

export async function TopNav({
  links,
  cta,
  className,
}: TopNavProps) {
  const locale = await getLocale();
  const t = await getTranslations("nav");
  const resolvedLinks: NavLink[] =
    links ?? [
      { href: "/blog", label: t("blog") },
      { href: "/about", label: t("about") },
      { href: "/contact", label: t("contact") },
    ];
  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex items-center justify-between px-4 py-3 md:px-8 md:py-3.5",
        "bg-bg/80 backdrop-blur-[12px] saturate-150 border-b border-border",
        className
      )}
    >
      <Logo />

      <nav className="hidden md:flex items-center gap-1">
        {resolvedLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-3 py-1.5 rounded-[var(--pe-r-md)] text-sm text-text-muted transition-colors hover:text-text hover:bg-surface-2"
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <LanguageSwitcher currentLocale={locale} />
        <ThemeToggle />
        {cta ?? <UserMenu fallback={<PublicAuthFallback />} />}
        <MobileNavToggle links={resolvedLinks} />
      </div>
    </header>
  );
}
