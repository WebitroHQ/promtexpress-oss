/**
 * Adapter sözleşmesi sadece text döner. Soru/kategori/validation gibi
 * structured output isteyen iç çağrılar için bu helper, modelin döndüğü
 * metinden JSON'u çıkarır. Sıra:
 *   1. Doğrudan parse (provider JSON modu kullandıysa text saf JSON'dur)
 *   2. ```json fenced block
 *   3. ``` fenced block
 *   4. İlk { veya [ karakterinden DEPTH-AWARE eşleşen kapanışa kadar
 *      (string literalleri ve escape'leri sayar; nested brace'leri korur)
 *   5. Hiçbiri başaramazsa null
 */
export function extractJson<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // 1) Saf JSON denemesi — provider yerel JSON modunda olduğunda ilk hit budur
  const direct = tryParse<T>(trimmed);
  if (direct !== null) return direct;

  // 2) ```json fenced
  const fencedJson = /```json\s*([\s\S]*?)```/i.exec(trimmed);
  if (fencedJson?.[1]) {
    const parsed = tryParse<T>(fencedJson[1]);
    if (parsed !== null) return parsed;
  }

  // 3) ``` fenced (dil etiketsiz)
  const fenced = /```\s*([\s\S]*?)```/.exec(trimmed);
  if (fenced?.[1]) {
    const parsed = tryParse<T>(fenced[1]);
    if (parsed !== null) return parsed;
  }

  // 4) Depth-aware tarama: her aday `{`/`[` pozisyonunu sırayla dene.
  // İlk parse edilebilir dengeli substring kazanır. Bu sayede metnin başında
  // string literal içinde sahte `{` olsa bile gerçek JSON bulunur.
  let cursor = 0;
  while (cursor < trimmed.length) {
    const offset = trimmed.slice(cursor).search(/[{[]/);
    if (offset < 0) break;
    const startGlobal = cursor + offset;
    const sliced = sliceBalancedFrom(trimmed, startGlobal);
    if (sliced) {
      const parsed = tryParse<T>(sliced);
      if (parsed !== null) return parsed;
    }
    cursor = startGlobal + 1;
  }

  return null;
}

/**
 * Verilen pozisyondan başlayarak dengeli kapanışa kadar olan substring'i
 * döndürür. String literali ve escape karakterlerini bilen tarayıcı;
 * nested brace içeren JSON'u (örn. lyrics içinde "{melody}") korur.
 * Dengelenmezse null.
 */
function sliceBalancedFrom(s: string, start: number): string | null {
  const open = s[start];
  if (open !== "{" && open !== "[") return null;
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];

    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === open) {
      depth++;
    } else if (ch === close) {
      depth--;
      if (depth === 0) {
        return s.slice(start, i + 1);
      }
    }
  }
  return null;
}

function tryParse<T>(s: string): T | null {
  try {
    return JSON.parse(s.trim()) as T;
  } catch {
    return null;
  }
}
