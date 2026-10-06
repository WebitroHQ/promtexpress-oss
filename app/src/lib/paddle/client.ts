/**
 * Paddle Billing SDK wrapper (server-side only).
 *
 * Reads:
 *   - PADDLE_API_KEY            (server, secret)
 *   - PADDLE_ENV                ("sandbox" | "production")  default "sandbox"
 *   - NEXT_PUBLIC_PADDLE_CLIENT_TOKEN  (client, exposed)
 *   - NEXT_PUBLIC_PADDLE_ENV    ("sandbox" | "production")  default same as PADDLE_ENV
 *   - PADDLE_WEBHOOK_SECRET     (server, secret) — Paddle Notification → Webhook signing secret
 *
 * Per CLAUDE.md §8: Paddle is payment infrastructure, NOT an AI engine.
 * API keys live in .env (not the admin AI engines panel). This is the explicit exception.
 */

import "server-only";
import { Environment, Paddle } from "@paddle/paddle-node-sdk";

let paddleClient: Paddle | null = null;

export function getPaddle(): Paddle {
  if (paddleClient) return paddleClient;

  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "PADDLE_API_KEY is not set. Add it to .env.production (server-side, never NEXT_PUBLIC_)."
    );
  }

  const env = process.env.PADDLE_ENV === "production"
    ? Environment.production
    : Environment.sandbox;

  paddleClient = new Paddle(apiKey, { environment: env });
  return paddleClient;
}

export function getPaddleEnv(): "sandbox" | "production" {
  return process.env.PADDLE_ENV === "production" ? "production" : "sandbox";
}

export function getWebhookSecret(): string {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("PADDLE_WEBHOOK_SECRET is not set.");
  }
  return secret;
}
