/**
 * Multi-format parser for prompt library imports.
 * Accepts: .md, .json, .jsonl, .csv, .yaml, .yml, .txt
 * Returns a normalized array of RawPrompt objects.
 */

export type RawPrompt = {
  title?: string;
  prompt: string;
  expectedOutput?: string;
  modality?: string;
  subCategory?: string;
  intentTags?: string[];
  targetEngine?: string;
  source?: string;
  sourceId?: string;
};

export type ParseResult = {
  items: RawPrompt[];
  skipped: number;
  errors: string[];
};

export function parseFileContent(filename: string, content: string): ParseResult {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  try {
    switch (ext) {
      case "json":    return parseJson(content);
      case "jsonl":   return parseJsonl(content);
      case "csv":     return parseCsv(content);
      case "yaml":
      case "yml":     return parseYaml(content);
      case "md":      return parseMd(content, filename);
      case "txt":     return parseTxt(content);
      default:        return { items: [], skipped: 0, errors: [`Unsupported file extension: .${ext}`] };
    }
  } catch (e) {
    return { items: [], skipped: 0, errors: [`Parse error: ${e instanceof Error ? e.message : String(e)}`] };
  }
}

// ── JSON ──────────────────────────────────────────────────────────────────────
function parseJson(content: string): ParseResult {
  const data = JSON.parse(content);
  const arr = Array.isArray(data) ? data : [data];
  return normalizeArray(arr);
}

// ── JSONL ─────────────────────────────────────────────────────────────────────
function parseJsonl(content: string): ParseResult {
  const items: RawPrompt[] = [];
  const errors: string[] = [];
  let skipped = 0;
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const [i, line] of lines.entries()) {
    try {
      const obj = JSON.parse(line);
      const raw = normalizeObject(obj);
      if (raw) items.push(raw);
      else skipped++;
    } catch {
      errors.push(`Line ${i + 1}: invalid JSON`);
      skipped++;
    }
  }
  return { items, skipped, errors };
}

// ── CSV ───────────────────────────────────────────────────────────────────────
function parseCsv(content: string): ParseResult {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { items: [], skipped: 0, errors: ["CSV has no data rows"] };

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const items: RawPrompt[] = [];
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = values[idx] ?? ""; });
    const raw = normalizeObject(obj);
    if (raw) items.push(raw);
    else { errors.push(`Row ${i + 1}: no prompt content`); skipped++; }
  }
  return { items, skipped, errors };
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
    else if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

// ── YAML (minimal — no external dep) ─────────────────────────────────────────
function parseYaml(content: string): ParseResult {
  // Handles simple key: value and list of - items without a full YAML parser.
  // For complex YAML, falls back to treating as text blocks.
  const items: RawPrompt[] = [];
  const errors: string[] = [];
  let skipped = 0;

  // Try to detect list of items (lines starting with "- ")
  const docBlocks = content.split(/^---\s*$/m).filter((b) => b.trim());
  for (const block of docBlocks) {
    const obj = parseSimpleYamlBlock(block);
    const raw = normalizeObject(obj);
    if (raw) items.push(raw);
    else { skipped++; }
  }

  if (items.length === 0) {
    // Treat entire file as one prompt block
    const obj = parseSimpleYamlBlock(content);
    const raw = normalizeObject(obj);
    if (raw) items.push(raw);
    else errors.push("YAML: no parseable prompt content found");
  }

  return { items, skipped, errors };
}

function parseSimpleYamlBlock(block: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = block.split("\n");
  let currentKey = "";
  let multiline = "";
  let inMultiline = false;

  for (const line of lines) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)?$/);
    if (kv) {
      if (inMultiline) { result[currentKey] = multiline.trim(); multiline = ""; inMultiline = false; }
      const key = kv[1].toLowerCase();
      const val = (kv[2] ?? "").trim();
      if (val === "|" || val === ">") { currentKey = key; inMultiline = true; }
      else { result[key] = val; }
    } else if (inMultiline) {
      multiline += line.replace(/^\s{2}/, "") + "\n";
    }
  }
  if (inMultiline) result[currentKey] = multiline.trim();
  return result;
}

// ── MARKDOWN ──────────────────────────────────────────────────────────────────
function parseMd(content: string, filename: string): ParseResult {
  // Strategy 0: PromtExpress archive format — ### [P-XXXXX] sections with ```prompt blocks
  if (/^###\s+\[P-\d+\]/m.test(content)) return parsePxArchive(content, filename);

  const items: RawPrompt[] = [];
  let skipped = 0;

  // Strategy 1: Split on ## or ### headings — each section = one prompt
  const sections = content.split(/^#{1,3}\s+/m).filter((s) => s.trim());
  if (sections.length > 1) {
    for (const section of sections) {
      const lines = section.trim().split("\n");
      const title = lines[0].trim();
      const body = lines.slice(1).join("\n").trim();
      if (body.length > 20) {
        items.push({ title, prompt: stripMdFormatting(body), source: filename });
      } else skipped++;
    }
    return { items, skipped, errors: [] };
  }

  // Strategy 2: Code blocks as individual prompts
  const codeBlockRegex = /```[\s\S]*?```/g;
  const blocks = content.match(codeBlockRegex);
  if (blocks && blocks.length > 0) {
    for (const block of blocks) {
      const prompt = block.replace(/^```[^\n]*\n/, "").replace(/\n?```$/, "").trim();
      if (prompt.length > 10) items.push({ prompt, source: filename });
      else skipped++;
    }
    return { items, skipped, errors: [] };
  }

  // Strategy 3: Whole file as one prompt
  const cleaned = stripMdFormatting(content).trim();
  if (cleaned.length > 10) {
    const firstLine = cleaned.split("\n")[0].trim();
    items.push({
      title: firstLine.length < 120 ? firstLine : undefined,
      prompt: cleaned,
      source: filename,
    });
  } else skipped++;

  return { items, skipped, errors: [] };
}

// Handles the PromtExpress archive format:
//   ### [P-00012] Title
//   - **Modality:** text
//   - **Category:** Marketing & Growth
//   - **Source:** github.com/...
//   - **Target engine:** generic (ChatGPT / Claude / GPT-4)
//   ```prompt
//   Actual prompt text here.
//   ```
function parsePxArchive(content: string, filename: string): ParseResult {
  const items: RawPrompt[] = [];
  let skipped = 0;

  const headingRe = /^###\s+(\[P-\d+\][^\n]*)/gm;
  const matches = [...content.matchAll(headingRe)];
  if (matches.length === 0) return { items: [], skipped: 0, errors: [] };

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const heading = match[1].trim();
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = matches[i + 1]?.index ?? content.length;
    const body = content.slice(bodyStart, bodyEnd);

    // Extract only the code block content — skip sections without one
    const codeMatch = body.match(/```[^\n]*\n([\s\S]*?)```/);
    if (!codeMatch || codeMatch[1].trim().length < 10) { skipped++; continue; }
    const promptText = codeMatch[1].trim();

    // Parse [P-XXXXX] source ID and clean title
    const idMatch = heading.match(/^\[P-(\d+)\]\s*(.*)/);
    const sourceId = idMatch ? `P-${idMatch[1]}` : undefined;
    const title = idMatch ? idMatch[2].trim() : heading;

    items.push({
      title: title || undefined,
      prompt: promptText,
      modality: pxMetaField(body, "Modality"),
      targetEngine: pxMetaField(body, "Target engine"),
      source: pxMetaField(body, "Source") ?? filename,
      sourceId,
      subCategory: pxMetaField(body, "Category"),
    });
  }

  return { items, skipped, errors: [] };
}

function pxMetaField(body: string, field: string): string | undefined {
  const re = new RegExp(`\\*\\*${field}:\\*\\*\\s*([^\\n]+)`);
  const m = body.match(re);
  if (!m) return undefined;
  // Strip inline backtick code spans (e.g. `prompts.csv` → prompts.csv)
  return m[1].replace(/`([^`]+)`/g, "$1").trim() || undefined;
}

function stripMdFormatting(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/^```[^\n]*\n/, "").replace(/\n?```$/, ""))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^>\s+/gm, "")
    .trim();
}

// ── TXT ───────────────────────────────────────────────────────────────────────
function parseTxt(content: string): ParseResult {
  const items: RawPrompt[] = [];
  let skipped = 0;

  // Split on double newlines — each paragraph = one prompt
  const paragraphs = content.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length > 1) {
    for (const para of paragraphs) {
      if (para.length > 10) items.push({ prompt: para });
      else skipped++;
    }
    return { items, skipped, errors: [] };
  }

  // Single block
  if (content.trim().length > 10) {
    items.push({ prompt: content.trim() });
  } else skipped++;
  return { items, skipped, errors: [] };
}

// ── Normalizer ────────────────────────────────────────────────────────────────
function normalizeObject(obj: Record<string, unknown>): RawPrompt | null {
  // Field aliases: prompt | text | content | body | instruction | system
  const promptField =
    pick(obj, ["prompt", "text", "content", "body", "instruction", "system", "message"]);
  if (!promptField || typeof promptField !== "string" || promptField.trim().length < 5) {
    return null;
  }

  const tags = obj.tags ?? obj.intent_tags ?? obj.intentTags ?? obj.keywords;

  return {
    prompt: promptField.trim(),
    title: strOrUndefined(obj.title ?? obj.name),
    expectedOutput: strOrUndefined(obj.expected_output ?? obj.expectedOutput ?? obj.output ?? obj.example),
    modality: strOrUndefined(obj.modality ?? obj.type ?? obj.category),
    subCategory: strOrUndefined(obj.sub_category ?? obj.subCategory ?? obj.subcategory),
    intentTags: Array.isArray(tags) ? tags.map(String) : typeof tags === "string" ? tags.split(",").map((t) => t.trim()) : undefined,
    targetEngine: strOrUndefined(obj.target_engine ?? obj.targetEngine ?? obj.engine ?? obj.model),
    source: strOrUndefined(obj.source ?? obj.source_file ?? obj.sourceFile),
    sourceId: strOrUndefined(obj.id ?? obj.source_id ?? obj.sourceId),
  };
}

function normalizeArray(arr: unknown[]): ParseResult {
  const items: RawPrompt[] = [];
  let skipped = 0;
  const errors: string[] = [];
  for (const item of arr) {
    if (typeof item === "string") {
      if (item.trim().length > 5) items.push({ prompt: item.trim() });
      else skipped++;
    } else if (item && typeof item === "object") {
      const raw = normalizeObject(item as Record<string, unknown>);
      if (raw) items.push(raw);
      else { errors.push("Item skipped: no prompt field"); skipped++; }
    } else skipped++;
  }
  return { items, skipped, errors };
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return undefined;
}

function strOrUndefined(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}
