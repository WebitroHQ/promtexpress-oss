"use client";

import * as React from "react";
import { Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { resendEmailVerification } from "@/server/actions/email-verification";

interface Props {
  email: string;
}

export function EmailVerifyBanner({ email }: Props) {
  const t = useTranslations("auth.verify");
  const [cooldown, setCooldown] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<
    | { tone: "success" | "error" | "info"; text: string }
    | null
  >(null);

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
        setMessage({ tone: "success", text: t("resentSuccess") });
        setCooldown(60);
      } else if (r.reason === "rate_limited") {
        const sec = Math.ceil((r.retryAfterMs ?? 60_000) / 1000);
        setMessage({ tone: "info", text: t("rateLimited", { sec }) });
        setCooldown(sec);
      } else {
        setMessage({ tone: "error", text: t("sendFailed") });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3.5 mb-5 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text">
          {t("bannerTitle")}
        </p>
        <p className="text-sm text-text-muted mt-0.5">
          {t.rich("bannerDesc", {
            email,
            strong: (chunks) => <strong className="text-text">{chunks}</strong>,
          })}
        </p>
        {message && (
          <p
            className={`text-xs mt-2 inline-flex items-center gap-1.5 ${
              message.tone === "success"
                ? "text-success"
                : message.tone === "error"
                  ? "text-error"
                  : "text-text-muted"
            }`}
          >
            {message.tone === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            {message.text}
          </p>
        )}
        <div className="flex items-center gap-3 mt-3">
          <Button
            size="sm"
            onClick={handleResend}
            disabled={loading || cooldown > 0}
          >
            {loading
              ? t("sending")
              : cooldown > 0
                ? t("resendCooldown", { sec: cooldown })
                : t("resendCta")}
          </Button>
        </div>
      </div>
    </div>
  );
}
