// Scoring for library evals, kept free of file I/O so the tests can call it directly.
import { createHash } from "node:crypto";

export const FORMAT = 1;
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Decimal places each check type reports its score with, stored next to every score so no reader has to guess.
// The rule for a new type: 0 when the score can only be 0 or 1, 2 when the score is a share. See library/evals/README.md.
export const PRECISION = {
  "contains-all": 2,
  matches: 0,
  "not-matches": 0,
  "table-column-in-variable": 2,
};

const PARAMS = {
  "contains-all": ["values", "ignoreCase"],
  matches: ["pattern", "flags"],
  "not-matches": ["pattern", "flags"],
  "table-column-in-variable": ["column", "variable"],
};

export function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** Problems with one check definition; empty when the check is valid. */
export function checkProblems(check, variables) {
  if (typeof check !== "object" || check === null) return ["must be an object"];
  if (!Object.hasOwn(PRECISION, check.type)) return [`unknown type "${check.type}"; use one of ${Object.keys(PRECISION).join(", ")}`];

  const problems = [];
  const allowed = new Set(["name", "type", "minScore", ...PARAMS[check.type]]);
  for (const key of Object.keys(check)) if (!allowed.has(key)) problems.push(`unknown field "${key}" for type ${check.type}`);
  if (check.minScore !== undefined && !(typeof check.minScore === "number" && check.minScore >= 0 && check.minScore <= 1)) {
    problems.push("minScore must be a number from 0 to 1");
  }

  switch (check.type) {
    case "contains-all":
      if (!Array.isArray(check.values) || check.values.length === 0 || !check.values.every((v) => typeof v === "string" && v.length > 0)) {
        problems.push("values must be a non-empty list of strings");
      }
      if (check.ignoreCase !== undefined && typeof check.ignoreCase !== "boolean") problems.push("ignoreCase must be true or false");
      break;
    case "matches":
    case "not-matches":
      // "g" and "y" make RegExp#test stateful, so the same output could score differently on a second read.
      if (check.flags !== undefined && !(typeof check.flags === "string" && /^[imsu]*$/.test(check.flags))) {
        problems.push('flags may only contain "i", "m", "s" and "u"');
      } else if (typeof check.pattern !== "string" || check.pattern.length === 0) {
        problems.push("pattern must be a non-empty regular expression");
      } else {
        try {
          new RegExp(check.pattern, check.flags ?? "");
        } catch (err) {
          problems.push(`pattern is not a valid regular expression (${err.message})`);
        }
      }
      break;
    case "table-column-in-variable":
      if (typeof check.column !== "string" || check.column.length === 0) problems.push("column must be a non-empty string");
      if (typeof check.variable !== "string" || !Object.hasOwn(variables ?? {}, check.variable)) {
        problems.push(`variable "${check.variable}" is not set in this case`);
      }
      break;
  }
  return problems;
}

/** Non-empty cells of one column in the first Markdown table that has that column. */
export function tableColumn(markdown, column) {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim());
  const cellsOf = (line) => line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].startsWith("|")) continue;
    const index = cellsOf(lines[i]).findIndex((cell) => cell.toLowerCase() === column.toLowerCase());
    if (index === -1 || !/^\|?[\s:|-]*-[\s:|-]*\|?$/.test(lines[i + 1])) continue;
    const values = [];
    for (let j = i + 2; j < lines.length && lines[j].startsWith("|"); j++) {
      const cell = cellsOf(lines[j])[index];
      if (cell) values.push(cell);
    }
    return values;
  }
  return [];
}

const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/[“”‘’"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function rawScore(check, output, variables) {
  switch (check.type) {
    case "contains-all": {
      const haystack = check.ignoreCase ? output.toLowerCase() : output;
      const found = check.values.filter((value) => haystack.includes(check.ignoreCase ? value.toLowerCase() : value));
      return found.length / check.values.length;
    }
    case "matches":
      return new RegExp(check.pattern, check.flags ?? "").test(output) ? 1 : 0;
    case "not-matches":
      return new RegExp(check.pattern, check.flags ?? "").test(output) ? 0 : 1;
    case "table-column-in-variable": {
      const cells = tableColumn(output, check.column);
      if (cells.length === 0) return 0;
      const source = normalize(variables[check.variable] ?? "");
      return cells.filter((cell) => source.includes(normalize(cell))).length / cells.length;
    }
  }
  throw new Error(`unknown check type "${check.type}"`);
}

/**
 * One check against one sample. `pass` is decided here from the unrounded score and stored, so readers never
 * re-derive it from the rounded `score` and disagree at the boundary. The threshold itself is not stored.
 */
export function scoreCheck(check, output, variables) {
  const raw = rawScore(check, output, variables);
  const precision = PRECISION[check.type];
  const factor = 10 ** precision;
  return { name: check.name, score: Math.round(raw * factor) / factor, precision, pass: raw >= (check.minScore ?? 1) };
}

/** Scores every recorded sample of a run with the suite's checks, one entry per sample. */
export function scoreRun(suite, run) {
  const casesById = new Map(suite.cases.map((c) => [c.id, c]));
  return {
    format: FORMAT,
    run: run.id,
    // Retired cases stay in old recordings but are not scored; their absence from the scores is the visible change.
    cases: run.cases.filter((recorded) => casesById.has(recorded.id)).map((recorded) => {
      const suiteCase = casesById.get(recorded.id);
      return {
        id: recorded.id,
        samples: recorded.samples.map((sample) => ({
          checks: suiteCase.checks.map((check) => scoreCheck(check, sample.output, suiteCase.variables)),
        })),
      };
    }),
  };
}

/** The first place two JSON values differ, or null when they are equal. */
export function firstDifference(stored, recomputed, path = "") {
  if (Object.is(stored, recomputed)) return null;
  const bothObjects =
    typeof stored === "object" && stored !== null && typeof recomputed === "object" && recomputed !== null && Array.isArray(stored) === Array.isArray(recomputed);
  if (!bothObjects) return { path: path || "(root)", stored, recomputed };
  for (const key of new Set([...Object.keys(stored), ...Object.keys(recomputed)])) {
    const next = Array.isArray(stored) ? `${path}[${key}]` : path ? `${path}.${key}` : key;
    const difference = firstDifference(stored[key], recomputed[key], next);
    if (difference) return difference;
  }
  return null;
}
