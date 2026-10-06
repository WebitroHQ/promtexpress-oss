// Plan §8.3 — JSON-LD validation. Calls every schema generator, casts the
// output to schema-dts types, and parses each block as JSON. Fails on any
// generator that produces malformed JSON-LD. Lightweight — runs without a
// live server.

import type { Thing, WithContext } from "schema-dts";
import {
  organizationSchema,
  websiteSchema,
  softwareApplicationSchema,
  breadcrumbSchema,
  faqPageSchema,
  blogPostingSchema,
  productOfferSchema,
  contactPointSchema,
} from "@/lib/seo/schemas";

const failures: string[] = [];

function validate(label: string, data: unknown) {
  try {
    const json = JSON.stringify(data);
    const round = JSON.parse(json) as WithContext<Thing>;
    if (typeof round !== "object" || round === null) {
      failures.push(`${label}: did not round-trip to object`);
      return;
    }
    if (!("@context" in round)) {
      failures.push(`${label}: missing @context`);
      return;
    }
    if (!("@type" in round)) {
      failures.push(`${label}: missing @type`);
      return;
    }
    console.log(`✓ ${label}`);
  } catch (e) {
    failures.push(`${label}: ${(e as Error).message}`);
  }
}

validate("organizationSchema", organizationSchema());
validate("websiteSchema", websiteSchema());
validate("softwareApplicationSchema", softwareApplicationSchema());
validate(
  "breadcrumbSchema",
  breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Pricing", url: "/pricing" },
  ]),
);
validate(
  "faqPageSchema",
  faqPageSchema([
    { q: "Question?", a: "Answer." },
    { q: "Another?", a: "Yes." },
  ]),
);
validate(
  "blogPostingSchema",
  blogPostingSchema({
    slug: "test",
    title: "Test Post",
    excerpt: "Excerpt",
    authorName: "Author",
    publishedAt: new Date("2026-05-01T00:00:00Z"),
    updatedAt: new Date("2026-05-08T00:00:00Z"),
  }),
);
validate(
  "productOfferSchema",
  productOfferSchema({
    name: "Plus",
    slug: "plus",
    priceMonthly: 39.99,
    priceYearly: 399,
    monthlyCredits: 1000,
  }),
);
validate("contactPointSchema", contactPointSchema());

console.log("");
if (failures.length > 0) {
  console.error(`FAIL — ${failures.length} schema(s) invalid`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("OK — all schemas valid");
