/**
 * Persona system-prompt section renderer.
 *
 * Pipeline (3-context-assembly.ts) ve Admin UI preview tab'i AYNI string'i üretmeli.
 * DRY: tek kaynak, davranış garantisi.
 */

export interface PersonaRenderInput {
  name: string;
  body: string;
  jargon: string[];
  frameworks: string[];
  antiPatterns: string[];
}

/**
 * 3-context-assembly.ts:165-172'deki blok ile birebir aynı çıktı.
 */
export function renderPersonaSection(p: PersonaRenderInput): string {
  const jargonStr = p.jargon.length > 0 ? `\nJargon you may use: ${p.jargon.join(", ")}` : "";
  const fwStr = p.frameworks.length > 0 ? `\nFrameworks: ${p.frameworks.join(", ")}` : "";
  const apStr = p.antiPatterns.length > 0 ? `\nDomain anti-patterns: ${p.antiPatterns.join(", ")}` : "";
  return `# === EXPERT PERSONA: ${p.name} ===\n${p.body}${jargonStr}${fwStr}${apStr}`;
}
