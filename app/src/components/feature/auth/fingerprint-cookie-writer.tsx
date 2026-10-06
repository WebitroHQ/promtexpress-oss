"use client";

import * as React from "react";
import { computeClientFingerprint } from "@/lib/abuse/fingerprint";

const FP_COOKIE_NAME = "pe.fp";
const FP_COOKIE_MAX_AGE_SEC = 60 * 30; // 30 minutes — yeni signup süreci için yeterli

/**
 * Auth/signup sayfalarına monte edildiğinde tarayıcı fingerprint'ini
 * geçici bir cookie'ye yazar. Yeni hesap oluşturma anında server-side
 * `events.createUser` bu cookie'yi okuyup `SignupSignal` tablosuna kaydeder.
 * Cookie kısa ömürlüdür ve yalnızca anti-abuse soft-block için kullanılır.
 */
export function FingerprintCookieWriter() {
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const fp = await computeClientFingerprint();
      if (cancelled || !fp) return;
      const secure = window.location.protocol === "https:";
      document.cookie = `${FP_COOKIE_NAME}=${fp}; Path=/; Max-Age=${FP_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure ? "; Secure" : ""}`;
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
