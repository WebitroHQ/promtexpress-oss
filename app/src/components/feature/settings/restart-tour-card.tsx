"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const COPY = {
  tr: {
    title: "Tanıtım turunu en baştan başlat",
    desc: "Paneli yeniden tanımanı ister misin? Tur sıfırdan başlayacak.",
    cta: "Turu yeniden başlat",
    saving: "Sıfırlanıyor…",
    done: "Tur sıfırlandı, panele dönünce başlayacak.",
  },
  en: {
    title: "Restart the onboarding tour",
    desc: "Want to learn the panel again? The tour will restart from scratch.",
    cta: "Restart tour",
    saving: "Resetting…",
    done: "Tour reset — it will start when you return to the dashboard.",
  },
} as const;

export function RestartTourCard({ locale }: { locale: string }) {
  const lang: keyof typeof COPY = locale === "tr" ? "tr" : "en";
  const t = COPY[lang];
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function reset() {
    setBusy(true);
    setMsg(null);
    try {
      await fetch("/api/onboarding/reset", { method: "POST" });
      setMsg(t.done);
      setTimeout(() => router.push("/dashboard"), 800);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-border bg-surface p-5 max-w-[640px]">
      <h3 className="text-sm font-semibold mb-1">{t.title}</h3>
      <p className="text-xs text-text-muted mb-4">{t.desc}</p>
      <div className="flex items-center gap-3">
        <Button onClick={reset} disabled={busy} variant="secondary">
          {busy ? t.saving : t.cta}
        </Button>
        {msg && <span className="text-xs text-text-muted">{msg}</span>}
      </div>
    </div>
  );
}
