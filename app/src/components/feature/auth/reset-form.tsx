"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { resetPassword } from "@/server/actions/password-reset";

export function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (!token) {
      setError("Reset link is missing or invalid.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const result = await resetPassword({ token, newPassword: password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/auth/login"), 1800);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] mb-2">Invalid link</h1>
        <p className="text-sm text-text-muted mb-6">
          This password-reset link is missing its token. Request a new one.
        </p>
        <Button asChild>
          <Link href="/auth/forgot">Request new link</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-[14px] bg-success/15 text-success inline-flex items-center justify-center mb-5">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] mb-2">Password updated</h1>
        <p className="text-sm text-text-muted">Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-[-0.025em] mb-1.5">Choose a new password</h1>
      <p className="text-sm text-text-muted mb-7">At least 8 characters.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">Confirm</Label>
          <PasswordInput
            id="confirm"
            placeholder="Same password again"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {error && (
          <div className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
            {error}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </>
  );
}
