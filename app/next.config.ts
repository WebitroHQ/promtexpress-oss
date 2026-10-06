import type { NextConfig } from "next";

// Reconstructed from the live build's routes-manifest.json and required-server-files.json (build of 2026-06-05).
// /api/v1 is the public API-key endpoint; its Deprecation/Sunset headers were removed on 2026-09-14 because
// the suggested successor (/api/generate) only accepts browser sessions.
// typescript.ignoreBuildErrors stays true: the recovered source still contains a few stale files that are not
// part of the runtime bundle, and type errors must not block a faithful rebuild.

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.paddle.com https://static.cloudflareinsights.com https://challenges.cloudflare.com https://www.googletagmanager.com https://*.profitwell.com https://public.profitwell.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.paddle.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https: blob:",
  "media-src 'self' data: blob:",
  "connect-src 'self' https://api.deepseek.com https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.cohere.com https://api.voyageai.com https://openrouter.ai https://*.paddle.com https://*.paddlecdn.com https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.profitwell.com https://public.profitwell.com",
  "frame-src 'self' https://*.paddle.com https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

// PromtExpress is free (bring your own AI key): the old commercial pages redirect.
const RETIRED_COMMERCIAL_PAGES = [
  { source: "/pricing", destination: "/", permanent: false },
  { source: "/billing", destination: "/settings#ai-keys", permanent: false },
  { source: "/checkout-success", destination: "/dashboard", permanent: false },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["bcryptjs", "nodemailer"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  experimental: {
    optimizeCss: true,
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  turbopack: {
    resolveAlias: {
      "next-intl/config": "./src/i18n/request.ts",
    },
  },
  async redirects() {
    return [
      { source: "/auth/signin", destination: "/auth/login", permanent: true },
      { source: "/signin", destination: "/auth/login", permanent: true },
      { source: "/login", destination: "/auth/login", permanent: true },
      ...RETIRED_COMMERCIAL_PAGES,
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
        ],
      },
    ];
  },
};

export default nextConfig;
