"use client";

import confetti from "canvas-confetti";

export function fireConfetti() {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  // Site palette: indigo primary + amber accent + light variants for visual variety
  const colors = ["#3b3a6e", "#7e7cc4", "#c98a3a", "#d8a35c"];
  confetti({
    particleCount: 70,
    spread: 70,
    startVelocity: 38,
    ticks: 200,
    origin: { x: 0.5, y: 0.55 },
    colors,
    scalar: 0.95,
  });
  setTimeout(() => {
    confetti({
      particleCount: 40,
      spread: 100,
      startVelocity: 30,
      origin: { x: 0.2, y: 0.6 },
      colors,
    });
    confetti({
      particleCount: 40,
      spread: 100,
      startVelocity: 30,
      origin: { x: 0.8, y: 0.6 },
      colors,
    });
  }, 200);
}
