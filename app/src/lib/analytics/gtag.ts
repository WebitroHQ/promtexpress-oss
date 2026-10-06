/**
 * Google Ads conversion tracking helper (client-side).
 * Pushes events to gtag (loaded by GoogleAdsTag in <head>).
 *
 * Enhanced Conversions: caller may pass `user_data.email_address` which Google
 * hashes server-side; we accept either plain email (Google hashes it) or a
 * pre-hashed SHA-256 hex.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const SUBSCRIPTION_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_PE_SUBSCRIPTION_LABEL;
const TRIAL_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_PE_TRIAL_LABEL;
const SIGNUP_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_PE_SIGNUP_LABEL;

type ConversionInput = {
  value?: number;
  currency?: string;
  transactionId?: string;
  email?: string | null;
};

function fire(label: string | undefined, input: ConversionInput = {}): void {
  if (typeof window === "undefined") return;
  if (!window.gtag || !ID || !label) return;

  const sendTo = `${ID}/${label}`;
  const payload: Record<string, unknown> = { send_to: sendTo };

  if (typeof input.value === "number") payload.value = input.value;
  if (input.currency) payload.currency = input.currency;
  if (input.transactionId) payload.transaction_id = input.transactionId;
  if (input.email) {
    payload.user_data = { email_address: input.email.trim().toLowerCase() };
  }

  window.gtag("event", "conversion", payload);
}

export function trackPeSignup(email?: string | null): void {
  fire(SIGNUP_LABEL, { email });
}

export function trackPeTrialStarted(input: {
  planSlug: string;
  cycle: "monthly" | "yearly";
  priceMonthly: number;
  priceYearly: number;
  email?: string | null;
}): void {
  // Conversion value = actual purchase amount Google should optimize toward.
  // Yearly plans send the full annual amount → Max Conversion Value bidding
  // routes more budget to keywords/audiences that convert yearly subscribers.
  const value = input.cycle === "yearly" ? input.priceYearly : input.priceMonthly;
  fire(TRIAL_LABEL, {
    value,
    currency: "USD",
    email: input.email,
  });
}

export function trackPeSubscriptionStarted(input: {
  value: number;
  currency: string;
  transactionId?: string;
  email?: string | null;
}): void {
  fire(SUBSCRIPTION_LABEL, input);
}
