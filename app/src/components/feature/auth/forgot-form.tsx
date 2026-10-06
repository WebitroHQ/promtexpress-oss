"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/server/actions/password-reset";

export function ForgotForm() {
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await requestPasswordReset({ email });
      // Always show success — email enumeration protection
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div>
        <Link href="/auth/login" className="text-sm text-text-muted hover:text-text transition-colors">
          ← Back to sign in
        </Link>
        <div className="mt-8 text-center">
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] mb-2">Check your inbox</h1>
          <p className="text-sm text-text-muted mb-6">
            We sent a reset link to <strong className="text-text">{email}</strong>
          </p>
          <p className="text-xs text-text-faint">
            Didn&apos;t get it?{" "}
            <button onClick={() => setSent(false)} className="text-primary font-medium hover:underline">
              Try again
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Link href="/auth/login" className="text-sm text-text-muted hover:text-text transition-colors">
        ← Back to sign in
      </Link>
      <h1 className="text-[28px] font-semibold tracking-[-0.025em] mt-4 mb-1.5">Forgot password?</h1>
      <p className="text-sm text-text-muted mb-7">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </>
  );
}
