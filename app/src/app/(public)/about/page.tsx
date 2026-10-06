import { TopNav } from "@/components/feature/layout/top-nav";
import { buildMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schemas";

export const metadata = buildMetadata({
  pathname: "/about",
  title: "About",
  description:
    "Built for the people who'd rather make things. Meet the PromtExpress team and the mission behind the hybrid prompt engine.",
});

const TEAM = [
  { name: "Hakan Güven", role: "CEO & Co-founder" },
  { name: "Elif Mert", role: "CPO & Co-founder" },
  { name: "Sofia Demir", role: "Head of Engineering" },
  { name: "Tom Becker", role: "Head of Design" },
  { name: "Ana Costa", role: "Head of AI Research" },
  { name: "Liam O'Brien", role: "Head of Growth" },
];

const VALUES = [
  {
    title: "Quality over magic",
    body: "We don't promise miracles — we promise consistent, reliable output.",
  },
  {
    title: "Users own their work",
    body: "Your prompts, your data. Export anytime. Delete anytime.",
  },
  {
    title: "Global by default",
    body: "21 languages, locale-aware formatting, RTL-ready from day one.",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .join("");
}

export default function AboutPage() {
  return (
    <div>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "About", url: "/about" },
        ])}
      />
      <TopNav />

      {/* Hero */}
      <section className="pe-section pt-20">
        <div className="text-center max-w-[720px] mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-faint mb-3">
            Our story
          </p>
          <h1 className="text-[52px] font-semibold tracking-[-0.03em] leading-[1.05]">
            Built for the people who&apos;d rather make things
          </h1>
          <p className="text-lg text-text-muted mt-5">
            We started PromtExpress because prompt engineering was eating the work. Three years
            later, we&apos;re still pulling that weed out for tens of thousands of creators,
            developers, and teams.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="pe-section pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-surface p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-faint mb-2">
              Mission
            </p>
            <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
              Make AI feel like a tool, not a craft
            </h2>
            <p className="text-text-muted mt-3">
              You shouldn&apos;t need to learn XML tags, role-play conventions, or model-specific
              quirks to get good output. We do that part.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-faint mb-2">
              Vision
            </p>
            <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
              Intent in, quality out — no matter the engine
            </h2>
            <p className="text-text-muted mt-3">
              The best models change every six months. The skill of describing intent
              doesn&apos;t. We bet on the durable side.
            </p>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="pe-section pt-6">
        <h2 className="text-3xl font-semibold tracking-[-0.02em] text-center mb-8">The team</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {TEAM.map((p) => (
            <div
              key={p.name}
              className="rounded-xl border border-border bg-surface p-5 text-center"
            >
              <div
                className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center font-semibold text-lg text-primary"
                style={{ background: "linear-gradient(135deg, var(--pe-primary-soft), var(--pe-accent-soft))" }}
              >
                {initials(p.name)}
              </div>
              <p className="font-medium text-sm">{p.name}</p>
              <p className="text-xs text-text-muted mt-0.5">{p.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="pe-section pt-6 pb-24">
        <h2 className="text-3xl font-semibold tracking-[-0.02em] text-center mb-8">
          What we believe
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-xl border border-border bg-surface p-6">
              <div className="w-9 h-9 rounded-[10px] bg-primary-soft text-primary inline-flex items-center justify-center mb-4">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-semibold">{v.title}</h3>
              <p className="text-sm text-text-muted mt-1.5 leading-relaxed">{v.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
