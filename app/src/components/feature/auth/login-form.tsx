"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { signIn } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Separator } from "@/components/ui/separator";
import { SocialAuth } from "./social-auth";
import { signInWithPassword } from "@/server/actions/signin";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [magicLoading, setMagicLoading] = React.useState(false);
  const [magicSent, setMagicSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await signInWithPassword({ email, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/generator");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError("Enter your email above first");
      return;
    }
    setError(null);
    setMagicLoading(true);
    try {
      await signIn("nodemailer", { email, redirect: false, callbackUrl: "/generator" });
      setMagicSent(true);
    } finally {
      setMagicLoading(false);
    }
  };

  if (magicSent) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-[14px] bg-primary-soft text-primary inline-flex items-center justify-center mb-5">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="text-[clamp(22px,3.5vw,28px)] font-semibold tracking-[-0.025em] mb-2">Check your inbox</h1>
        <p className="text-sm text-text-muted mb-6">
          We sent a magic link to <strong className="text-text">{email}</strong>
        </p>
        <p className="text-xs text-text-faint">
          Didn&apos;t get it?{" "}
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setMagicSent(false)}
            className="px-0 h-auto"
          >
            Try again
          </Button>
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-[clamp(22px,3.5vw,28px)] font-semibold tracking-[-0.025em] mb-1.5">Welcome back</h1>
      <p className="text-sm text-text-muted mb-7">Pick up where you left off.</p>

      <SocialAuth />

      <div className="flex items-center gap-3 my-5 text-xs text-text-faint">
        <Separator className="flex-1" />
        OR
        <Separator className="flex-1" />
      </div>

      {/* Email + password */}
      <form onSubmit={handlePassword} className="flex flex-col gap-3.5">
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

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/auth/forgot"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={1}
          />
        </div>

        {error && (
          <div className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {/* Magic link alternative */}
      <div className="flex items-center gap-3 my-4 text-xs text-text-faint">
        <Separator className="flex-1" />
        OR
        <Separator className="flex-1" />
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={handleMagicLink}
        disabled={magicLoading || !email}
      >
        <Mail className="h-4 w-4" />
        {magicLoading ? "Sending…" : "Email me a magic link"}
      </Button>

      <p className="text-center mt-5 text-sm text-text-muted">
        New here?{" "}
        <Link href="/auth/signup" className="text-primary font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
