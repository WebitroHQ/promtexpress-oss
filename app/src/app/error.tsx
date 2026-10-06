"use client";

// Defensive imports only: error.tsx renders when something upstream threw.
// We MUST NOT depend on the next-intl provider here (no useLocale, no
// next-intl Link), otherwise this page itself can throw when the provider
// is unmounted/remounting during a reload — producing a "Something broke
// on our side" flash on every language switch (2026-05-12 incident).
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="px-8 py-5">
        <Link href="/" className="flex items-center gap-2 font-semibold w-fit">
          <span className="w-7 h-7 rounded-[7px] bg-primary text-primary-text inline-flex items-center justify-center text-sm font-semibold">p</span>
          PromtExpress
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-8">
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-8 md:gap-16 items-center max-w-[960px] w-full">
          <div>
            <p className="text-[88px] font-bold tracking-[-0.04em] leading-none text-primary">500</p>
            <h1 className="text-[32px] font-semibold tracking-[-0.025em] mt-3">
              Something broke on our side
            </h1>
            <p className="text-base text-text-muted mt-3 max-w-[460px] leading-relaxed">
              We&apos;ve been notified and are looking into it. Try refreshing in a moment, or
              check our status page if it persists.
            </p>
            {error.digest && (
              <p className="text-xs text-text-faint mt-2 font-mono">Error ID: {error.digest}</p>
            )}
            <div className="flex gap-2 mt-6">
              <Button onClick={reset}>Try again</Button>
              <Button variant="secondary" asChild>
                <a href="https://status.promtexpress.com" target="_blank" rel="noopener noreferrer">
                  View status
                </a>
              </Button>
            </div>
          </div>

          <div className="hidden md:block">
            <svg viewBox="0 0 320 320" className="w-full max-w-[320px] mx-auto">
              <circle cx="160" cy="160" r="140" fill="var(--pe-primary-soft)" />
              <g transform="translate(160 160)">
                <circle r="80" fill="var(--pe-surface)" stroke="var(--pe-border-strong)" strokeWidth="2" />
                <path d="M-32 -20 L32 -20 L24 40 L-24 40 Z" fill="none" stroke="var(--pe-warning)" strokeWidth="3" />
                <line x1="-12" y1="-8" x2="12" y2="28" stroke="var(--pe-error)" strokeWidth="3" />
                <line x1="12" y1="-8" x2="-12" y2="28" stroke="var(--pe-error)" strokeWidth="3" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
