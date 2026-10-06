"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import {
  Home,
  Zap,
  History,
  Star,
  CreditCard,
  Key,
  Settings,
} from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import { CreditMeter } from "@/components/feature/generator/credit-meter";
import { RestartTourSidebarButton } from "./restart-tour-sidebar-button";

interface SideLink {
  href: string;
  label: string;
  icon: React.ElementType;
}

const MAIN_LINKS: SideLink[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/generator", label: "Generator", icon: Zap },
  { href: "/history", label: "History", icon: History },
  { href: "/favorites", label: "Favorites", icon: Star },
];

const ACCOUNT_LINKS: SideLink[] = [
  { href: "/api-keys", label: "API Keys", icon: Key },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface AppSidebarProps {
  credits?: { used: number; total: number; renewDate?: Date };
  className?: string;
}

export function AppSidebar({ credits, className }: AppSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col gap-1 border-r border-border bg-bg px-3.5 py-5 w-60 shrink-0",
        className
      )}
    >
      <div className="px-3 mb-4">
        <Logo />
      </div>

      {/* Main links */}
      <div className="flex flex-col gap-0.5">
        {MAIN_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            data-tour={
              href === "/generator"
                ? "nav-generator"
                : href === "/history"
                ? "nav-history"
                : undefined
            }
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-[var(--pe-r-md)] text-sm transition-all duration-150",
              isActive(href)
                ? "bg-surface text-text shadow-sm border border-border"
                : "text-text-muted hover:bg-surface-2 hover:text-text"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </div>

      <div className="mt-2 mb-1 px-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-faint">Account</p>
      </div>
      <div className="flex flex-col gap-0.5">
        {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-[var(--pe-r-md)] text-sm transition-all duration-150",
              isActive(href)
                ? "bg-surface text-text shadow-sm border border-border"
                : "text-text-muted hover:bg-surface-2 hover:text-text"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
        <RestartTourSidebarButton />
      </div>

    </aside>
  );
}
