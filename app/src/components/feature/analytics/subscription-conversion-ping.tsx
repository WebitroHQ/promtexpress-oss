"use client";

import * as React from "react";
import { trackPeSubscriptionStarted } from "@/lib/analytics/gtag";

type Props = {
  value: number;
  currency: string;
  transactionId?: string;
  email?: string | null;
};

export function SubscriptionConversionPing({
  value,
  currency,
  transactionId,
  email,
}: Props) {
  const firedRef = React.useRef(false);

  React.useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    trackPeSubscriptionStarted({
      value,
      currency,
      transactionId,
      email,
    });
  }, [value, currency, transactionId, email]);

  return null;
}
