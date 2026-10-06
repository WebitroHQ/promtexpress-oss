// Schema.org / JSON-LD generators. Each returns a plain object ready to be
// passed to <JsonLd data={...} />. US-only target — inLanguage is always
// ["en-US"] (BCP-47) per the SEO plan.
//
// We deliberately do NOT carry an aggregateRating until a real Review system
// exists (plan §3.3 D2 — fake "12000 reviews" was removed).

import { SEO_BASE_URL } from "../hreflang";

const ORG_NAME = "PromtExpress";
const ORG_URL = SEO_BASE_URL;
const ORG_LOGO = `${SEO_BASE_URL}/icon.png`;
const SUPPORT_EMAIL = "support@promtexpress.com";
const SAME_AS = [
  "https://x.com/promtexpress",
  "https://github.com/WebitroHQ/promtexpress-oss",
  "https://www.linkedin.com/company/promtexpress",
];

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORG_NAME,
    url: ORG_URL,
    logo: ORG_LOGO,
    sameAs: SAME_AS,
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: SUPPORT_EMAIL,
        contactType: "customer support",
        availableLanguage: ["en"],
        areaServed: "US",
      },
    ],
  } as const;
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: ORG_NAME,
    url: ORG_URL,
    inLanguage: "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SEO_BASE_URL}/blog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  } as const;
}

export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: ORG_NAME,
    url: ORG_URL,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web, iOS, Android",
    description:
      "Hybrid AI prompt engine. Turn intent into engine-tuned prompts for 60+ AI models including ChatGPT, Claude, Gemini, Midjourney and more.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    inLanguage: ["en-US"],
  } as const;
}

export interface BreadcrumbCrumb {
  name: string;
  url: string; // absolute or path; absolute preferred
}

export function breadcrumbSchema(crumbs: BreadcrumbCrumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url.startsWith("http") ? c.url : `${SEO_BASE_URL}${c.url}`,
    })),
  } as const;
}

export interface FaqEntry {
  q: string;
  a: string;
}

export function faqPageSchema(entries: FaqEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((e) => ({
      "@type": "Question",
      name: e.q,
      acceptedAnswer: { "@type": "Answer", text: e.a },
    })),
  } as const;
}

export interface BlogPostingInput {
  slug: string;
  title: string;
  excerpt: string | null;
  authorName: string;
  publishedAt: Date;
  updatedAt?: Date;
  views?: number;
  ogImage?: string;
}

export function blogPostingSchema(p: BlogPostingInput) {
  const url = `${SEO_BASE_URL}/blog/${p.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: p.title,
    description: p.excerpt ?? `Read “${p.title}” on the PromtExpress blog.`,
    image: p.ogImage ?? ORG_LOGO,
    datePublished: p.publishedAt.toISOString(),
    dateModified: (p.updatedAt ?? p.publishedAt).toISOString(),
    author: { "@type": "Person", name: p.authorName },
    publisher: {
      "@type": "Organization",
      name: ORG_NAME,
      logo: { "@type": "ImageObject", url: ORG_LOGO },
    },
    inLanguage: "en-US",
    url,
  } as const;
}

// ContactPoint — used on /contact, schema.org-recommended for clear contact
// surface signal. Distinct from the embedded contactPoint in Organization.
export function contactPointSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPoint",
    email: SUPPORT_EMAIL,
    contactType: "customer support",
    availableLanguage: ["en"],
    areaServed: "US",
    url: `${SEO_BASE_URL}/contact`,
  } as const;
}

export interface ProductPlanInput {
  name: string;
  slug: string;
  description?: string;
  priceMonthly: number; // 0 = free / contact-sales
  priceYearly: number;
  monthlyCredits: number;
}

export function productOfferSchema(plan: ProductPlanInput) {
  const url = `${SEO_BASE_URL}/pricing#${plan.slug}`;
  const offers: Array<Record<string, unknown>> = [];
  if (plan.priceMonthly > 0) {
    offers.push({
      "@type": "Offer",
      name: `${plan.name} (monthly)`,
      price: plan.priceMonthly.toFixed(2),
      priceCurrency: "USD",
      url,
      availability: "https://schema.org/InStock",
      category: "Subscription",
    });
  }
  if (plan.priceYearly > 0) {
    offers.push({
      "@type": "Offer",
      name: `${plan.name} (yearly)`,
      price: plan.priceYearly.toFixed(2),
      priceCurrency: "USD",
      url,
      availability: "https://schema.org/InStock",
      category: "Subscription",
    });
  }
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${ORG_NAME} ${plan.name}`,
    description:
      plan.description ??
      `${plan.name} plan — ${plan.monthlyCredits.toLocaleString("en-US")} monthly credits for prompt generation across 60+ AI engines.`,
    brand: { "@type": "Brand", name: ORG_NAME },
    url,
    ...(offers.length === 1
      ? { offers: offers[0] }
      : offers.length > 1
        ? {
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "USD",
              lowPrice: Math.min(...offers.map((o) => Number(o.price))).toFixed(2),
              highPrice: Math.max(...offers.map((o) => Number(o.price))).toFixed(2),
              offerCount: offers.length,
              offers,
            },
          }
        : {}),
  } as const;
}
