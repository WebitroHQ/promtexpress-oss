"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, Settings, LayoutDashboard, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Props {
  /** Fallback rendered when no session — used in public pages */
  fallback?: React.ReactNode;
  /** Compact mode (no email line, smaller avatar) for dense top bars */
  compact?: boolean;
}

function initials(nameOrEmail: string) {
  const source = nameOrEmail.includes(" ") ? nameOrEmail : nameOrEmail.split("@")[0];
  return source
    .split(/\s|\./)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserMenu({ fallback, compact }: Props) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div
        className={`rounded-full bg-surface-2 animate-pulse ${compact ? "w-8 h-8" : "w-9 h-9"}`}
        aria-hidden
      />
    );
  }

  if (!session?.user) {
    return <>{fallback}</>;
  }

  const label = session.user.name ?? session.user.email ?? "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Open account menu"
          className={`flex items-center gap-2 rounded-full bg-gradient-to-br from-primary to-accent text-primary-text font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            compact ? "w-8 h-8 text-xs" : "w-9 h-9 text-sm"
          }`}
        >
          {initials(label)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{session.user.name ?? "Account"}</p>
          <p className="text-xs text-text-muted">{session.user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        {session.user.role === "ADMIN" && (
          <DropdownMenuItem asChild>
            <Link href="/pr/yonet" className="flex items-center gap-2 cursor-pointer">
              <User className="h-4 w-4" /> Admin panel
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => signOut({ callbackUrl: "/" })}
          className="text-error cursor-pointer"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Convenience: default fallback for public TopNav (Sign in / Get started buttons) */
export function PublicAuthFallback() {
  return (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/auth/signup">Get started free</Link>
      </Button>
    </>
  );
}
