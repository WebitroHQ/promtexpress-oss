import type { MetadataRoute } from "next";

/**
 * Robots policy — keşfedilebilirlik maksimum.
 * Tüm arama motorları + tüm AI crawler'lar açıkça izinli.
 * Sadece auth-gate'li ve API route'ları engelli.
 */
export default function robots(): MetadataRoute.Robots {
  const base = "https://promtexpress.com";

  return {
    rules: [
      // Tüm bot'lar (arama + AI) — public sayfalara açık
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/pr/yonet/",
          "/dashboard",
          "/generator",
          "/history",
          "/favorites",
          "/billing",
          "/settings",
          "/api-keys",
          "/auth/",
        ],
      },
      // AI crawlers — explicit allow (CF default'ları override etmek için)
      ...[
        "GPTBot",
        "ChatGPT-User",
        "OAI-SearchBot",
        "ClaudeBot",
        "Claude-Web",
        "Claude-SearchBot",
        "Claude-User",
        "anthropic-ai",
        "PerplexityBot",
        "Perplexity-User",
        "Google-Extended",
        "Google-CloudVertexBot",
        "Google-NotebookLM",
        "GoogleOther",
        "Bytespider",
        "Applebot-Extended",
        "CCBot",
        "Diffbot",
        "FacebookBot",
        "Meta-ExternalAgent",
        "cohere-ai",
        "Amazonbot",
        "YouBot",
        "DuckAssistBot",
        "Bingbot",
        "Googlebot",
        "Slurp",
        "DuckDuckBot",
        "Baiduspider",
        "YandexBot",
      ].map((ua) => ({
        userAgent: ua,
        allow: ["/", "/about", "/contact", "/blog", "/legal"],
        disallow: ["/api/", "/pr/yonet/", "/dashboard", "/generator", "/auth/"],
      })),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
