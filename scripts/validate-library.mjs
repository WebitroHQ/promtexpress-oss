#!/usr/bin/env node
// Validates every template under library/templates. Zero dependencies so contributors can run it anywhere:
//   node scripts/validate-library.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../library/templates", import.meta.url));
const MODALITIES = ["text", "code", "image", "video", "audio", "music"];
const REQUIRED = ["id", "title", "description", "category", "modality", "language", "version", "authors", "variables", "template"];
const ALLOWED = new Set([...REQUIRED, "$schema", "engine", "tags", "example"]);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VARIABLE_NAME = /^[a-z][a-z0-9_]*$/;
const PLACEHOLDER = /\{\{\s*([^}\s]+)\s*\}\}/g;
const LANGUAGE = /^[a-z]{2}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function validate(file, seenIds) {
  const errors = [];
  const rel = relative(ROOT, file).split(sep).join("/");
  if (!rel.endsWith(".json")) return [`${rel}: only .json files belong in library/templates`];

  let t;
  try {
    t = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    return [`${rel}: invalid JSON (${err.message})`];
  }
  const fail = (message) => errors.push(`${rel}: ${message}`);

  for (const key of Object.keys(t)) if (!ALLOWED.has(key)) fail(`unknown field "${key}"`);
  const missing = REQUIRED.filter((key) => !(key in t));
  for (const key of missing) fail(`missing required field "${key}"`);
  if (missing.length) return errors;

  const [folder, fileName] = rel.split("/");
  const expectedId = `${folder}/${fileName?.replace(/\.json$/, "")}`;
  if (rel.split("/").length !== 2) fail("templates must live at library/templates/<modality>/<slug>.json");
  if (t.id !== expectedId) fail(`id must match the file path: expected "${expectedId}", got "${t.id}"`);
  if (!SLUG.test(fileName?.replace(/\.json$/, "") ?? "")) fail("file name must be a lowercase-kebab-case slug");
  if (seenIds.has(t.id)) fail(`duplicate id "${t.id}"`);
  seenIds.add(t.id);

  if (!MODALITIES.includes(t.modality)) fail(`modality must be one of ${MODALITIES.join(", ")}`);
  if (t.modality !== folder) fail(`modality "${t.modality}" does not match folder "${folder}"`);
  if (typeof t.title !== "string" || t.title.length < 3 || t.title.length > 80) fail("title must be 3-80 characters");
  if (typeof t.description !== "string" || t.description.length < 20 || t.description.length > 300) fail("description must be 20-300 characters");
  if (typeof t.category !== "string" || !SLUG.test(t.category)) fail("category must be a lowercase-kebab-case slug");
  if (!(t.engine === undefined || t.engine === null || (typeof t.engine === "string" && t.engine.length > 0))) fail("engine must be a non-empty string or null");
  if (!LANGUAGE.test(t.language)) fail('language must be an ISO 639-1 code such as "en" or "tr"');
  if (!SEMVER.test(t.version)) fail('version must be semver, e.g. "1.0.0"');
  if (!Array.isArray(t.authors) || t.authors.length === 0 || !t.authors.every((a) => typeof a === "string" && a.length > 0)) {
    fail("authors must be a non-empty list of GitHub usernames");
  }
  if (t.tags !== undefined && (!Array.isArray(t.tags) || !t.tags.every((tag) => typeof tag === "string" && SLUG.test(tag)))) {
    fail("tags must be a list of lowercase-kebab-case strings");
  }
  if (typeof t.template !== "string" || t.template.trim().length < 40) fail("template must be at least 40 characters");
  if (typeof t.template === "string" && t.template.length > 8000) fail("template must be at most 8000 characters");

  if (!Array.isArray(t.variables)) {
    fail("variables must be a list");
    return errors;
  }
  const declared = new Set();
  for (const [i, v] of t.variables.entries()) {
    if (typeof v !== "object" || v === null) {
      fail(`variables[${i}] must be an object`);
      continue;
    }
    if (!VARIABLE_NAME.test(v.name ?? "")) fail(`variables[${i}].name must be snake_case`);
    if (declared.has(v.name)) fail(`variable "${v.name}" is declared twice`);
    declared.add(v.name);
    if (typeof v.description !== "string" || v.description.length < 3) fail(`variable "${v.name}" needs a description`);
    if (typeof v.required !== "boolean") fail(`variable "${v.name}" needs required: true or false`);
    if (typeof v.example !== "string" || v.example.length === 0) fail(`variable "${v.name}" needs an example value`);
  }

  if (typeof t.template === "string") {
    const used = new Set([...t.template.matchAll(PLACEHOLDER)].map((m) => m[1]));
    for (const name of used) if (!declared.has(name)) fail(`placeholder {{${name}}} is not declared in variables`);
    for (const name of declared) if (!used.has(name)) fail(`variable "${name}" is declared but never used in template`);
  }

  if (t.example !== undefined && (typeof t.example !== "object" || t.example === null || Array.isArray(t.example))) {
    fail("example must be an object mapping variable names to values");
  }
  return errors;
}

const files = walk(ROOT);
const seenIds = new Set();
const errors = files.flatMap((file) => validate(file, seenIds));

if (errors.length) {
  console.error(`✖ ${errors.length} problem(s) in library/templates:\n`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

const byModality = Object.fromEntries(MODALITIES.map((m) => [m, 0]));
for (const id of seenIds) byModality[id.split("/")[0]]++;
const summary = MODALITIES.filter((m) => byModality[m]).map((m) => `${m}: ${byModality[m]}`).join(", ");
console.log(`✔ ${seenIds.size} templates valid (${summary})`);
