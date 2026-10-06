import { LandingV3 } from "@/components/feature/landing-v3/landing";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  pathname: "/",
  title: "PromtExpress — Intent in. Perfect Prompt out.",
  description:
    "Hybrid AI prompt engine. Turn intent into engine-tuned prompts for 60+ AI models including ChatGPT, Claude, Gemini, Midjourney and more.",
});

// GEO-4 (TITLE-DUP): the root layout's title template ("%s · PromtExpress")
// appends the brand to every plain-string page title. The homepage title
// already contains the brand ("PromtExpress — …"), so the template would emit
// "PromtExpress — … · PromtExpress" (brand doubled). Make ONLY the homepage
// title absolute so the suffix is skipped here; other pages keep the suffix.
metadata.title = {
  absolute: "PromtExpress — Intent in. Perfect Prompt out.",
};

export default function LandingPage() {
  return <LandingV3 />;
}
