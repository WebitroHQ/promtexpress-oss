// Defensive imports only: not-found.tsx may render outside the next-intl
// provider tree (Next.js App Router root not-found rendering). Use plain
// next/link to avoid throwing inside the failure boundary itself.
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Minimal nav */}
      <div className="px-8 py-5 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="w-7 h-7 rounded-[7px] bg-primary text-primary-text inline-flex items-center justify-center text-sm font-semibold">p</span>
          PromtExpress
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-8">
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-8 md:gap-16 items-center max-w-[960px] w-full">
          <div>
            <p className="text-[88px] font-bold tracking-[-0.04em] leading-none text-primary">404</p>
            <h1 className="text-[32px] font-semibold tracking-[-0.025em] mt-3">
              We couldn&apos;t find that prompt
            </h1>
            <p className="text-base text-text-muted mt-3 max-w-[460px] leading-relaxed">
              The page you&apos;re looking for has either moved, been renamed, or never existed.
              Try heading home, or use search to find what you need.
            </p>
            <div className="flex gap-2 mt-6">
              <Button asChild><Link href="/">Go home</Link></Button>
              <Button variant="secondary" asChild><Link href="/contact">Contact support</Link></Button>
            </div>
          </div>

          <div className="hidden md:block">
            <svg viewBox="0 0 320 320" className="w-full max-w-[320px] mx-auto">
              <defs>
                <linearGradient id="g404" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="var(--pe-primary-soft)" />
                  <stop offset="1" stopColor="var(--pe-accent-soft)" />
                </linearGradient>
              </defs>
              <circle cx="160" cy="160" r="140" fill="url(#g404)" />
              <rect x="80" y="100" width="160" height="120" rx="12" fill="var(--pe-surface)" stroke="var(--pe-border-strong)" strokeWidth="2" />
              <circle cx="105" cy="125" r="4" fill="var(--pe-error)" />
              <circle cx="120" cy="125" r="4" fill="var(--pe-warning)" />
              <circle cx="135" cy="125" r="4" fill="var(--pe-success)" />
              <line x1="100" y1="155" x2="220" y2="155" stroke="var(--pe-border-strong)" strokeWidth="2" />
              <line x1="100" y1="175" x2="180" y2="175" stroke="var(--pe-border-strong)" strokeWidth="2" />
              <line x1="100" y1="195" x2="200" y2="195" stroke="var(--pe-border-strong)" strokeWidth="2" />
              <text x="160" y="280" textAnchor="middle" fontSize="13" fill="var(--pe-text-faint)" fontFamily="monospace">
                {"// the prompt got away"}
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
