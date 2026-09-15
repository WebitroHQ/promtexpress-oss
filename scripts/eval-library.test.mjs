// Proves the eval runner scores what it claims, keeps scores per sample, and rejects every broken fixture.
//   node --test scripts/eval-library.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { checkProblems, scoreCheck, scoreRun, tableColumn } from "./eval-lib.mjs";

const RUNNER = fileURLToPath(new URL("./eval-library.mjs", import.meta.url));
const FIXTURES = fileURLToPath(new URL("./fixtures/evals", import.meta.url));
const SUITE = join("text", "greeting", "suite.json");
const SCORES = join("text", "greeting", "recorded", "2026-09-15-fixture.scores.json");

function run(args) {
  const result = spawnSync(process.execPath, [RUNNER, ...args], { encoding: "utf8" });
  return { code: result.status, output: `${result.stdout}${result.stderr}` };
}
const runFixture = (evals, templates = join(FIXTURES, "templates"), ...extra) => run(["--evals", evals, "--templates", templates, ...extra]);

// Runs `fn` against a scratch copy of the valid fixture and its templates, so tests can break things safely.
function withCopy(fn) {
  const dir = mkdtempSync(join(tmpdir(), "evals-"));
  try {
    cpSync(join(FIXTURES, "valid"), join(dir, "evals"), { recursive: true });
    cpSync(join(FIXTURES, "templates"), join(dir, "templates"), { recursive: true });
    fn(join(dir, "evals"), join(dir, "templates"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Every directory under fixtures/evals/invalid needs an entry here, so a new broken fixture cannot go unchecked.
const INVALID = {
  "duplicate-case-id": "duplicate case id",
  "duplicate-check-name": "duplicate check name in this case",
  "renamed-case": 'case "greets-ada" is not in the suite; case ids must stay the same',
  "stale-scores": "stored scores are out of date",
  "undeclared-variable": 'variable "audience" is not declared by the template',
  "outputs-not-per-sample": "one per sample",
  "stateful-regex-flag": "flags may only contain",
};

describe("eval checks", () => {
  it("reads one column of the first table that has it", () => {
    const markdown = 'Intro | not a table\n\n| Action | Source quote |\n|---|---|\n| Ship it | "ship on Friday" |\n| Fix it |  |\n\nAfter the table';
    assert.deepEqual(tableColumn(markdown, "source quote"), ['"ship on Friday"']);
  });

  it("scores quotes against the input, ignoring quote marks, case and spacing", () => {
    const check = { name: "quotes", type: "table-column-in-variable", column: "Source quote", variable: "notes" };
    const output = '| Action | Source quote |\n|---|---|\n| a | “Ship   ON friday” |\n| b | "made up" |';
    assert.deepEqual(scoreCheck(check, output, { notes: "We ship on Friday." }), { name: "quotes", score: 0.5, precision: 2, pass: false });
  });

  it("decides pass from the unrounded score, not the rounded one", () => {
    const values = Array.from({ length: 1000 }, (_, i) => `<v${i}>`);
    const result = scoreCheck({ name: "almost", type: "contains-all", values }, values.slice(0, 999).join(" "), {});
    assert.equal(result.score, 1);
    assert.equal(result.precision, 2);
    assert.equal(result.pass, false);
  });

  it("keeps one score per sample", () => {
    const suite = { cases: [{ id: "c", variables: {}, checks: [{ name: "says-hi", type: "matches", pattern: "hi" }] }] };
    const scores = scoreRun(suite, { id: "r", cases: [{ id: "c", samples: [{ output: "hi" }, { output: "bye" }] }] });
    assert.deepEqual(
      scores.cases[0].samples.map((sample) => sample.checks[0].score),
      [1, 0],
    );
  });

  it("rejects stateful regex flags, unknown fields and missing variables", () => {
    assert.match(checkProblems({ name: "x", type: "matches", pattern: "a", flags: "g" }, {}).join(), /flags may only contain/);
    assert.match(checkProblems({ name: "x", type: "matches", pattern: "a", threshold: 1 }, {}).join(), /unknown field "threshold"/);
    assert.match(checkProblems({ name: "x", type: "table-column-in-variable", column: "A", variable: "notes" }, {}).join(), /variable "notes" is not set/);
    assert.deepEqual(checkProblems({ name: "x", type: "not-matches", pattern: "SELECT\\s+\\*", flags: "i" }, {}), []);
  });
});

describe("eval-library runner", () => {
  it("accepts the real library with up-to-date scores", () => {
    const { code, output } = run([]);
    assert.equal(code, 0, output);
    assert.match(output, /✔ [1-9]\d* suites, [1-9]\d* recorded runs, scores up to date/);
  });

  it("accepts the valid fixture and reports configuration before any score", () => {
    const { code, output } = runFixture(join(FIXTURES, "valid"));
    assert.equal(code, 0, output);
    const config = output.indexOf("template  unchanged since recording");
    assert.ok(config !== -1 && config < output.indexOf("check results passed"), output);
    assert.match(output, /✖ sample 2 mentions-name: 0\.00/);
  });

  it("says so when the template text changed since the recording", () =>
    withCopy((evals, templates) => {
      const path = join(templates, "text", "greeting.json");
      const template = JSON.parse(readFileSync(path, "utf8"));
      writeFileSync(path, JSON.stringify({ ...template, version: "1.1.0", template: `${template.template} Keep it warm.` }));
      const { code, output } = runFixture(evals, templates);
      assert.equal(code, 0, output);
      assert.match(output, /template {2}CHANGED since recording: recorded 1\.0\.0 \([0-9a-f]{12}\), now 1\.1\.0/);
    }));

  it("fails when a scores file is missing, and --write creates it", () =>
    withCopy((evals, templates) => {
      rmSync(join(evals, SCORES));
      assert.match(runFixture(evals, templates).output, /missing 2026-09-15-fixture\.scores\.json/);
      assert.equal(runFixture(evals, templates, "--write").code, 0);
      const { code, output } = runFixture(evals, templates);
      assert.equal(code, 0, output);
    }));

  it("shows a threshold change as a change in the stored scores", () =>
    withCopy((evals, templates) => {
      const path = join(evals, SUITE);
      const suite = JSON.parse(readFileSync(path, "utf8"));
      suite.cases[0].checks[0].minScore = 0;
      writeFileSync(path, JSON.stringify(suite, null, 2));
      const { code, output } = runFixture(evals, templates);
      assert.equal(code, 1, output);
      assert.match(output, /case "greets-ada" sample 2 check "mentions-name" pass: stored false, recomputed true/);
    }));

  it("fails when no suites are found", () => {
    const empty = mkdtempSync(join(tmpdir(), "evals-empty-"));
    try {
      mkdirSync(join(empty, "text"));
      const { code, output } = runFixture(empty);
      assert.equal(code, 1, output);
      assert.match(output, /no eval suites found/);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it("fails when the evals directory does not exist", () => {
    const { code, output } = runFixture(join(FIXTURES, "does-not-exist"));
    assert.equal(code, 1, output);
    assert.match(output, /evals directory not found/);
  });

  it("has an expectation for every invalid fixture", () => {
    assert.deepEqual(readdirSync(join(FIXTURES, "invalid")).sort(), Object.keys(INVALID).sort());
  });

  for (const [name, message] of Object.entries(INVALID)) {
    it(`rejects ${name}`, () => {
      const { code, output } = runFixture(join(FIXTURES, "invalid", name));
      assert.equal(code, 1, output);
      assert.ok(output.includes(message), output);
    });
  }
});
