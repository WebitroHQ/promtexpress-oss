import { ImageResponse } from "next/og";

// SEO finding DSK-1 (cluster C): the previous OG/Twitter card pointed at
// /icon.png (a 32x32 favicon) while falsely declaring width:512/height:512,
// and twitter card = summary_large_image needs ~1200x630. This route generates
// a correctly-sized 1200x630 branded card from REAL brand elements only
// (brand name + a real on-site tagline). next/og's ImageResponse is built into
// Next 16 — no new dependency. Served at /opengraph-image and auto-resolved
// against metadataBase by buildMetadata (DEFAULT_OG_IMAGE = "/opengraph-image").

export const runtime = "nodejs";

// Route segment config consumed by Next's metadata file convention.
export const alt = "PromtExpress — AI Prompt Engineering";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Real tagline already present on the live site (landing H1 + OG description).
const TAGLINE = "Intent in. Perfect Prompt out.";
const SUBLINE = "Precision-targeted prompts for 50+ AI engines.";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background:
            "linear-gradient(135deg, #0a0a0a 0%, #14141c 55%, #1d1b2e 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #7c5cff 0%, #4f46e5 100%)",
              fontSize: "44px",
              fontWeight: 800,
            }}
          >
            P
          </div>
          <div
            style={{
              fontSize: "44px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            PromtExpress
          </div>
        </div>
        <div
          style={{
            fontSize: "76px",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            marginBottom: "28px",
          }}
        >
          {TAGLINE}
        </div>
        <div
          style={{
            fontSize: "34px",
            fontWeight: 500,
            color: "#b8b5c8",
          }}
        >
          {SUBLINE}
        </div>
      </div>
    ),
    { ...size }
  );
}
