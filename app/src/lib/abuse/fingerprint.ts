/**
 * Hafif istemci-yan fingerprint.
 *
 * FingerprintJS'e bağımlılık eklemeden, canvas + UA + ekran + zaman dilimi
 * sinyallerini birleştirip SHA-256 hash'i üretir. Mükemmel bir fingerprint değil
 * (incognito + farklı tarayıcı bypass eder), ama "aynı kişinin 5 hesabı"
 * senaryosunu yakalamak için yeterli sinyaldir.
 *
 * Output: 16 karakterlik hex (SHA-256 ilk 64 bit). PII içermez.
 */
export async function computeClientFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "";
  try {
    const parts: string[] = [];
    parts.push(navigator.userAgent || "");
    parts.push(navigator.language || "");
    parts.push(String(navigator.hardwareConcurrency ?? 0));
    parts.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
    parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    parts.push(canvasSignal());

    const text = parts.join("|");
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    const hex = Array.from(new Uint8Array(hash).slice(0, 8))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex;
  } catch {
    return "";
  }
}

function canvasSignal(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = "#069";
    ctx.fillText("promtexpress-fp", 2, 2);
    ctx.fillStyle = "rgba(102,204,0,0.7)";
    ctx.fillText("promtexpress-fp", 4, 4);
    return canvas.toDataURL().slice(-64);
  } catch {
    return "";
  }
}
