import type { MetadataRoute } from "next";

// Web App Manifest — served at /manifest.webmanifest. Faz 4.4.
// Single English locale (US target). Theme colors mirror layout viewport.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PromtExpress — AI Prompt Engineering",
    short_name: "PromtExpress",
    description:
      "Hybrid AI prompt engine. Turn intent into engine-tuned prompts for 60+ AI models.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "en-US",
    dir: "ltr",
    categories: ["productivity", "developer", "utilities"],
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
