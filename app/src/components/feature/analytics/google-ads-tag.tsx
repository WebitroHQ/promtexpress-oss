import Script from "next/script";

/**
 * Google Ads conversion tag with Consent Mode v2 (Advanced).
 * - Default state: all signals 'denied' (privacy-first, EEA-compliant)
 * - Cookie banner accept → window dispatches consent update via dataLayer
 * - Cookieless pings continue (Advanced mode) → +%15-25 attribution recovery
 *
 * Note: this component is rendered inside <ConsentGate category="marketing">
 * but the consent default itself is set BEFORE the gtag library loads, so
 * the script always sees a `denied` baseline until the cookie banner updates it.
 */
export function GoogleAdsTag() {
  const id = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  if (!id || !id.startsWith("AW-")) return null;

  return (
    <>
      {/* Consent Mode v2 default — must run BEFORE gtag loads */}
      <Script id="pe-gads-consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            wait_for_update: 500
          });
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="pe-gads-init" strategy="afterInteractive">
        {`
          gtag('js', new Date());
          gtag('config', '${id}', { allow_enhanced_conversions: true });
        `}
      </Script>
    </>
  );
}
