"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import {
  Menu,
  Home,
  Zap,
  History,
  Star,
  CreditCard,
  Key,
  Settings,
  MessageSquare,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import { RestartTourSidebarButton } from "./restart-tour-sidebar-button";

const MAIN_LINKS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/generator", label: "Generator", icon: Zap },
  { href: "/history", label: "History", icon: History },
  { href: "/favorites", label: "Favorites", icon: Star },
];

const ACCOUNT_LINKS = [
  { href: "/api-keys", label: "API Keys", icon: Key },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/feedback", label: "Feedback", icon: MessageSquare },
];

export function AppSidebarDrawer() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Tour event integration: drawer is opened/closed when the onboarding tour
  // navigates to/from a sidebar-anchored step. Only acts on mobile viewport
  // (≤767px); desktop AppSidebar is already visible there.
  React.useEffect(() => {
    const isMobile = () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches;
    const onOpen = () => {
      if (isMobile()) setOpen(true);
    };
    const onClose = () => setOpen(false);
    window.addEventListener("pe:tour:open-sidebar", onOpen);
    window.addEventListener("pe:tour:close-sidebar", onClose);
    return () => {
      window.removeEventListener("pe:tour:open-sidebar", onOpen);
      window.removeEventListener("pe:tour:close-sidebar", onClose);
    };
  }, []);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] max-w-[85vw] flex flex-col gap-1 p-3.5">
        <div className="px-3 mb-4 mt-2">
          <Logo />
        </div>

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
                "flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--pe-r-md)] text-sm transition-all duration-150",
                isActive(href)
                  ? "bg-surface text-text shadow-sm border border-border"
                  : "text-text-muted hover:bg-surface-2 hover:text-text",
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
                "flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--pe-r-md)] text-sm transition-all duration-150",
                isActive(href)
                  ? "bg-surface text-text shadow-sm border border-border"
                  : "text-text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
          <RestartTourSidebarButton />
        </div>
      </SheetContent>
    </Sheet>
  );
}
