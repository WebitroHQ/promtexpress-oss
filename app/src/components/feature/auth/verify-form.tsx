"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { resendEmailVerification } from "@/server/actions/email-verification";

interface Props {
  email: string;
  status?: "expired" | "invalid" | "sent" | null;
}

export function VerifyForm({ email, status }: Props) {
  const t = useTranslations("auth.verify");
  const [cooldown, setCooldown] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<
    | { tone: "success" | "error" | "info"; text: string }
    | null
  >(
    status === "expired"
      ? { tone: "error", text: t("linkExpired") }
      : status === "invalid"
        ? { tone: "error", text: t("linkInvalid") }
        : null,
  );

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const r = await resendEmailVerification({ email });
      if (r.ok) {
        setMessage({ tone: "success", text: t("resentSuccessWithEmail", { email }) });
        setCooldown(60);
      } else if (r.reason === "rate_limited") {
        const sec = Math.ceil((r.retryAfterMs ?? 60_000) / 1000);
        setMessage({ tone: "info", text: t("rateLimited", { sec }) });
        setCooldown(sec);
      } else if (r.reason === "send_failed") {
        setMessage({ tone: "error", text: t("sendFailed") });
      } else {
        setMessage({ tone: "error", text: t("invalidRequest") });
      }
    } catch (err) {
      setMessage({
        tone: "error",
        text: err instanceof Error ? err.message : t("unexpected"),
      });
    } finally {
      setLoading(false);
    }
  };

  const toneClass =
    message?.tone === "success"
      ? "border-success/30 bg-success/5 text-success"
      : message?.tone === "error"
        ? "border-error/30 bg-error/5 text-error"
        : "border-border bg-surface text-text-muted";

  return (
    <div>
      <div className="w-14 h-14 rounded-[14px] bg-primary-soft text-primary inline-flex items-center justify-center mb-5">
        <Mail className="h-6 w-6" />
      </div>
      <h1 className="text-[28px] font-semibold tracking-[-0.025em] mb-1.5">{t("pageTitle")}</h1>
      <p className="text-sm text-text-muted mb-6">
        {t.rich("pageDesc", {
          email,
          strong: (chunks) => <strong className="text-text">{chunks}</strong>,
        })}
      </p>

      {message && (
        <div className={`rounded-md border px-3 py-2 text-sm flex items-start gap-2 mb-5 ${toneClass}`}>
          {message.tone === "success" ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          ) : message.tone === "error" ? (
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <Mail className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <Button
        className="w-full"
        onClick={handleResend}
        disabled={loading || cooldown > 0}
      >
        {loading
          ? t("sending")
          : cooldown > 0
            ? t("resendCooldown", { sec: cooldown })
            : t("resendVerificationCta")}
      </Button>

      <div className="text-center mt-5 text-sm text-text-muted space-y-2">
        <p>
          {t("checkSpam")}
        </p>
        <p>
          {t("wrongAddress")}{" "}
          <Link href="/auth/login" className="text-primary font-medium hover:underline">
            {t("logoutAndRetry")}
          </Link>
        </p>
      </div>
    </div>
  );
}
