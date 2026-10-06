"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Separator } from "@/components/ui/separator";
import { SocialAuth } from "./social-auth";
import { TurnstileWidget } from "./turnstile-widget";
import { signUpWithPassword } from "@/server/actions/signup";
import { trackPeSignup } from "@/lib/analytics/gtag";

function passwordStrength(pw: string) {
  if (pw.length < 8) return 1;
  if (pw.length < 12) return 2;
  return 3;
}

const STRENGTH_LABEL = ["Too short", "Getting there", "Strong"];
const STRENGTH_COLOR = ["bg-error", "bg-warning", "bg-success"];

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [agreedTerms, setAgreedTerms] = React.useState(false);
  const [agreedKvkk, setAgreedKvkk] = React.useState(false);
  const [turnstileToken, setTurnstileToken] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const strength = passwordStrength(password);
  const passwordsMatch = password.length > 0 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordsMatch) {
      setError("Passwords don't match");
      return;
    }
    if (!turnstileToken) {
      setError("Please complete the captcha challenge.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUpWithPassword({
        email,
        firstName,
        lastName,
        password,
        agreedToTerms: agreedTerms,
        kvkkConsent: agreedKvkk,
        turnstileToken,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      trackPeSignup(email);
      router.push(`/auth/verify?email=${encodeURIComponent(email)}&from=signup`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-[-0.025em] mb-1.5">Create your account</h1>
      <p className="text-sm text-text-muted mb-7">50 free credits to start. No card required.</p>

      <SocialAuth />

      <div className="flex items-center gap-3 my-5 text-xs text-text-faint">
        <Separator className="flex-1" />
        OR
        <Separator className="flex-1" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              maxLength={60}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              maxLength={60}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {password.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className={`h-0.5 flex-1 rounded-full transition-colors ${
                      n <= strength ? STRENGTH_COLOR[strength - 1] : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-text-faint">{STRENGTH_LABEL[strength - 1]}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <PasswordInput
            id="confirm"
            placeholder="Same password again"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            aria-invalid={confirm.length > 0 && !passwordsMatch}
          />
          {confirm.length > 0 && !passwordsMatch && (
            <p className="text-[11px] text-error">Passwords don&apos;t match</p>
          )}
        </div>

        <label className="flex items-start gap-2 text-xs text-text-muted leading-relaxed cursor-pointer mt-1">
          <input
            type="checkbox"
            className="mt-0.5 accent-primary"
            checked={agreedTerms}
            onChange={(e) => setAgreedTerms(e.target.checked)}
            required
          />
          <span>
            I agree to the{" "}
            <Link href="/legal" className="text-primary hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/legal?tab=privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <label className="flex items-start gap-2 text-xs text-text-muted leading-relaxed cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 accent-primary"
            checked={agreedKvkk}
            onChange={(e) => setAgreedKvkk(e.target.checked)}
            required
          />
          <span>
            I explicitly consent to the processing of my personal data as described in
            the{" "}
            <Link href="/legal?tab=kvkk" className="text-primary hover:underline">
              KVKK Notice
            </Link>{" "}
            (KVKK Art. 5).
          </span>
        </label>

        <div className="mt-2">
          <TurnstileWidget onToken={setTurnstileToken} />
        </div>

        {error && (
          <div className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full mt-1"
          disabled={
            isLoading ||
            !agreedTerms ||
            !agreedKvkk ||
            !turnstileToken ||
            !passwordsMatch
          }
        >
          {isLoading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center mt-5 text-sm text-text-muted">
        Have an account?{" "}
        <Link href="/auth/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
