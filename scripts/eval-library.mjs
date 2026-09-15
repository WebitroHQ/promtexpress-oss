#!/usr/bin/env node
// Checks the eval suites under library/evals without calling any model: validates each suite against its template and
// each recorded run against its suite, re-scores every recorded output and fails when the committed scores no longer
// match. After changing a check or a threshold on purpose, pass --write and commit the regenerated scores.
//   node scripts/eval-library.mjs [--write] [--evals <dir>] [--templates <dir>]
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { FORMAT, SLUG, checkProblems, firstDifference, scoreRun, sha256 } from "./eval-lib.mjs";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : resolve(args[index + 1] ?? "");
};
const WRITE = args.includes("--write");
// The directory options point the runner at fixtures; the tests use them.
const EVALS = option("--evals", fileURLToPath(new URL("../library/evals", import.meta.url)));
const TEMPLATES = option("--templates", fileURLToPath(new URL("../library/templates", import.meta.url)));
const SEMVER = /^\d+\.\d+\.\d+$/;
const SHA256 = /^[a-f0-9]{64}$/;

const label = (path) => relative(process.cwd(), path).split(sep).join("/") || ".";
const relToEvals = (path) => relative(EVALS, path).split(sep).join("/");
const errors = [];
const report = [];
let runCount = 0;
let written = 0;

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    errors.push(`${relToEvals(path)}: invalid JSON (${err.message})`);
    return undefined;
  }
}

function findSuites(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "recorded" ? [] : findSuites(path);
    return name === "suite.json" ? [path] : [];
  });
}

function loadSuite(path) {
  const rel = relToEvals(path);
  const fail = (message) => errors.push(`${rel}: ${message}`);
  const suite = readJson(path);
  if (suite === undefined) return null;

  const parts = rel.split("/");
  if (parts.length !== 3) {
    fail("suites must live at library/evals/<modality>/<slug>/suite.json");
    return null;
  }
  const expected = `${parts[0]}/${parts[1]}`;
  for (const key of Object.keys(suite)) if (!["format", "template", "samples", "cases"].includes(key)) fail(`unknown field "${key}"`);
  if (suite.format !== FORMAT) fail(`format must be ${FORMAT}`);
  if (suite.template !== expected) {
    fail(`template must match the folder: expected "${expected}", got "${suite.template}"`);
    return null;
  }
  const templatePath = join(TEMPLATES, `${expected}.json`);
  if (!existsSync(templatePath)) {
    fail(`template "${expected}" does not exist in ${label(TEMPLATES)}`);
    return null;
  }
  const template = readJson(templatePath);
  if (template === undefined) return null;
  if (!Number.isInteger(suite.samples) || suite.samples < 1 || suite.samples > 20) fail("samples must be a whole number from 1 to 20");
  if (!Array.isArray(suite.cases) || suite.cases.length === 0) {
    fail("cases must be a non-empty list");
    return null;
  }

  const declared = new Map((template.variables ?? []).map((v) => [v.name, v]));
  const caseIds = new Set();
  for (const [i, c] of suite.cases.entries()) {
    const where = `case ${typeof c?.id === "string" ? `"${c.id}"` : `#${i + 1}`}`;
    if (typeof c !== "object" || c === null) {
      fail(`${where} must be an object`);
      continue;
    }
    for (const key of Object.keys(c)) if (!["id", "description", "variables", "checks"].includes(key)) fail(`${where}: unknown field "${key}"`);
    if (!SLUG.test(c.id ?? "")) fail(`${where}: id must be a lowercase-kebab-case slug`);
    if (caseIds.has(c.id)) fail(`${where}: duplicate case id`);
    caseIds.add(c.id);
    if (c.description !== undefined && typeof c.description !== "string") fail(`${where}: description must be a string`);

    if (typeof c.variables !== "object" || c.variables === null || Array.isArray(c.variables)) {
      fail(`${where}: variables must be an object`);
      continue;
    }
    for (const [name, value] of Object.entries(c.variables)) {
      if (!declared.has(name)) fail(`${where}: variable "${name}" is not declared by the template`);
      if (typeof value !== "string") fail(`${where}: variable "${name}" must be a string`);
    }
    for (const [name, variable] of declared) {
      if (variable.required && !Object.hasOwn(c.variables, name)) fail(`${where}: required variable "${name}" is missing`);
    }

    if (!Array.isArray(c.checks) || c.checks.length === 0) {
      fail(`${where}: checks must be a non-empty list`);
      continue;
    }
    const names = new Set();
    for (const [j, check] of c.checks.entries()) {
      const checkWhere = `${where} check ${typeof check?.name === "string" ? `"${check.name}"` : `#${j + 1}`}`;
      if (!SLUG.test(check?.name ?? "")) fail(`${checkWhere}: name must be a lowercase-kebab-case slug`);
      if (names.has(check?.name)) fail(`${checkWhere}: duplicate check name in this case`);
      names.add(check?.name);
      for (const problem of checkProblems(check, c.variables)) fail(`${checkWhere}: ${problem}`);
    }
  }
  return { suite, template };
}

function checkRuns(suitePath, loaded) {
  const dir = join(dirname(suitePath), "recorded");
  if (!existsSync(dir)) {
    report.push(`${loaded.suite.template}: no recorded runs yet`);
    return;
  }
  const files = readdirSync(dir);
  const runs = files.filter((name) => name.endsWith(".json") && !name.endsWith(".scores.json"));
  for (const name of files) {
    const rel = relToEvals(join(dir, name));
    if (!name.endsWith(".json")) errors.push(`${rel}: only .json files belong in recorded/`);
    else if (name.endsWith(".scores.json") && !runs.includes(name.replace(/\.scores\.json$/, ".json"))) {
      errors.push(`${rel}: scores without a recorded run`);
    }
  }
  for (const name of runs) checkRun(join(dir, name), loaded);
}

function checkRun(path, { suite, template }) {
  const rel = relToEvals(path);
  const before = errors.length;
  const fail = (message) => errors.push(`${rel}: ${message}`);
  const run = readJson(path);
  if (run === undefined) return;
  runCount++;

  for (const key of Object.keys(run)) {
    if (!["format", "id", "suite", "recordedAt", "note", "config", "cases"].includes(key)) fail(`unknown field "${key}"`);
  }
  if (run.format !== FORMAT) fail(`format must be ${FORMAT}`);
  if (!SLUG.test(run.id ?? "") || run.id !== basename(path, ".json")) fail("id must be a lowercase-kebab-case slug matching the file name");
  if (run.suite !== suite.template) fail(`suite must be "${suite.template}"`);
  if (typeof run.recordedAt !== "string" || Number.isNaN(Date.parse(run.recordedAt))) fail("recordedAt must be an ISO 8601 timestamp");
  if (run.note !== undefined && typeof run.note !== "string") fail("note must be a string");

  const config = run.config;
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    fail("config must be an object");
  } else {
    for (const key of Object.keys(config)) {
      if (!["provider", "model", "temperature", "maxTokens", "templateVersion", "templateSha256"].includes(key)) fail(`config: unknown field "${key}"`);
    }
    if (typeof config.provider !== "string" || !config.provider) fail("config.provider must be a non-empty string");
    if (typeof config.model !== "string" || !config.model) fail("config.model must be the exact model snapshot, as a non-empty string");
    if (!(config.temperature === null || typeof config.temperature === "number")) fail("config.temperature must be a number, or null when it does not apply");
    if (!(config.maxTokens === null || (Number.isInteger(config.maxTokens) && config.maxTokens > 0))) {
      fail("config.maxTokens must be a positive whole number, or null when it does not apply");
    }
    if (!SEMVER.test(config.templateVersion ?? "")) fail("config.templateVersion must be semver");
    if (!SHA256.test(config.templateSha256 ?? "")) fail("config.templateSha256 must be a lowercase hex SHA-256 of the template text");
  }

  const suiteCaseIds = new Set(suite.cases.map((c) => c.id));
  if (!Array.isArray(run.cases) || run.cases.length === 0) {
    fail("cases must be a non-empty list");
  } else {
    const seen = new Set();
    for (const recorded of run.cases) {
      if (!suiteCaseIds.has(recorded?.id)) fail(`case "${recorded?.id}" is not in the suite; case ids must stay the same when a case is edited`);
      if (seen.has(recorded?.id)) fail(`case "${recorded?.id}" is recorded twice`);
      seen.add(recorded?.id);
      const perSample =
        Array.isArray(recorded?.samples) &&
        recorded.samples.length > 0 &&
        recorded.samples.every((s) => typeof s === "object" && s !== null && typeof s.output === "string" && Object.keys(s).length === 1);
      if (!perSample) fail(`case "${recorded?.id}": samples must be a non-empty list of { "output": "..." } objects, one per sample`);
    }
  }
  if (errors.length > before) return;

  // Configuration first: most of the time the answer to "did the template get worse" is that nobody changed it.
  const currentSha = sha256(template.template);
  const lines = [`${suite.template} › ${run.id}`];
  lines.push(`  config    ${config.provider} / ${config.model}, temperature ${config.temperature ?? "n/a"}, max tokens ${config.maxTokens ?? "n/a"}`);
  lines.push(
    currentSha === config.templateSha256
      ? `  template  unchanged since recording (${config.templateVersion})`
      : `  template  CHANGED since recording: recorded ${config.templateVersion} (${config.templateSha256.slice(0, 12)}), now ${template.version} (${currentSha.slice(0, 12)})`,
  );
  if (run.note) lines.push(`  note      ${run.note}`);

  const scores = scoreRun(suite, run);
  for (const scored of scores.cases) {
    const results = scored.samples.flatMap((sample) => sample.checks);
    lines.push(`  ${scored.id}: ${scored.samples.length} of ${suite.samples} samples, ${results.filter((r) => r.pass).length}/${results.length} check results passed`);
    scored.samples.forEach((sample, i) => {
      for (const result of sample.checks.filter((r) => !r.pass)) lines.push(`    ✖ sample ${i + 1} ${result.name}: ${result.score.toFixed(result.precision)}`);
    });
  }
  report.push(lines.join("\n"));

  const scoresPath = path.replace(/\.json$/, ".scores.json");
  if (WRITE) {
    writeFileSync(scoresPath, `${JSON.stringify(scores, null, 2)}\n`);
    written++;
    return;
  }
  if (!existsSync(scoresPath)) {
    fail(`missing ${basename(scoresPath)}; run with --write to create it`);
    return;
  }
  const stored = readJson(scoresPath);
  if (stored === undefined) return;
  const difference = firstDifference(stored, scores);
  if (difference) {
    fail(
      `stored scores are out of date at ${describe(difference.path, scores)}: stored ${JSON.stringify(difference.stored)}, ` +
        `recomputed ${JSON.stringify(difference.recomputed)}; if the change is intended, run with --write and commit the result`,
    );
  }
}

function describe(path, scores) {
  const match = /^cases\[(\d+)\]\.samples\[(\d+)\]\.checks\[(\d+)\]\.?(.*)$/.exec(path);
  if (!match) return path;
  const [, c, s, k, rest] = match.map((part, i) => (i > 0 && i < 4 ? Number(part) : part));
  const scored = scores.cases[c];
  const name = scored?.samples[s]?.checks[k]?.name ?? `#${k + 1}`;
  return `case "${scored?.id}" sample ${s + 1} check "${name}"${rest ? ` ${rest}` : ""}`;
}

if (!existsSync(EVALS) || !statSync(EVALS).isDirectory()) {
  console.error(`✖ evals directory not found: ${label(EVALS)}`);
  process.exit(1);
}
const suitePaths = findSuites(EVALS);
// Like the template validator: a path that matches nothing must fail instead of reporting a clean run.
if (suitePaths.length === 0) {
  console.error(`✖ no eval suites found under ${label(EVALS)}; refusing to report success`);
  process.exit(1);
}

for (const path of suitePaths) {
  const before = errors.length;
  const loaded = loadSuite(path);
  if (loaded && errors.length === before) checkRuns(path, loaded);
}

if (report.length) console.log(`${report.join("\n\n")}\n`);
if (errors.length) {
  console.error(`✖ ${errors.length} problem(s) in ${label(EVALS)}:\n`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log(
  WRITE
    ? `✔ ${suitePaths.length} suites, wrote scores for ${written} recorded runs`
    : `✔ ${suitePaths.length} suites, ${runCount} recorded runs, scores up to date`,
);
