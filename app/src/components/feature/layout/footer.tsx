import { Link } from "@/i18n/navigation";
import Image from "next/image";

// Global site footer. Plan §6.4 — replaces the landing-only raw-HTML footer.
// All links resolve to real routes (Plan §J2 — 21 dead `href="#"` anchors
// were the prior state; we drop the columns whose targets don't yet exist
// rather than ship broken links).

const PRODUCT_LINKS = [
  { label: "Templates", href: "/#templates" },
  { label: "Model coverage", href: "/#models" },
  { label: "Playground", href: "/#playground" },
];

const COMPANY_LINKS = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

const LEGAL_LINKS = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Legal hub", href: "/legal" },
];

const RESOURCE_LINKS = [
  { label: "Sitemap", href: "/sitemap.xml" },
  { label: "RSS feed", href: "/feed.xml" },
  { label: "Open source", href: "https://github.com/WebitroHQ/promtexpress-oss" },
];

const YEAR = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-bg mt-24">
      <div className="max-w-[1200px] mx-auto px-6 py-12 md:px-8 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 font-semibold">
              <Image
                src="/brand/logo-mark.png"
                alt="PromtExpress"
                width={28}
                height={28}
                className="rounded-md"
              />
              <span className="text-base">PromtExpress</span>
            </Link>
            <p className="mt-3 text-sm text-text-muted max-w-[300px] leading-[1.6]">
              The hybrid prompt engine. Turn intent into engine-tuned prompts for
              60+ AI models.
            </p>
          </div>

          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="Legal" links={LEGAL_LINKS} />
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col-reverse gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-text-faint">© {YEAR} PromtExpress. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-faint">
            {RESOURCE_LINKS.map((l) => (
              <li key={l.href}>
                {l.href.startsWith("https://") ? (
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="hover:text-text transition-colors">
                    {l.label}
                  </a>
                ) : (
                  <Link href={l.href} className="hover:text-text transition-colors">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h5 className="text-[13px] font-semibold mb-3">{title}</h5>
      <ul className="flex flex-col gap-2 text-sm text-text-muted">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hover:text-text transition-colors">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
