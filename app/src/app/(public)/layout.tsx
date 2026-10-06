import { SiteFooter } from "@/components/feature/layout/footer";

/**
 * Public route group layout. NextIntlClientProvider lives in the ROOT layout
 * (src/app/layout.tsx) since 2026-05-11.
 *
 * Footer policy: SiteFooter is always rendered here. The landing page used
 * to render its own footer inside .lv3-root for brand palette inheritance,
 * but with locale-aware middleware we can no longer use x-pathname to detect
 * the landing route reliably (the request-header injection collides with
 * next-intl's middleware rewrite). Trade-off: landing footer now uses the
 * default site palette instead of the landing-v3 brand palette. Acceptable.
 */
export default function PublicGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main id="main-content">{children}</main>
      <SiteFooter />
    </>
  );
}
