// Proves the library validator actually runs: it must accept good templates and reject every broken fixture.
//   node --test scripts/validate-library.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const VALIDATOR = fileURLToPath(new URL("./validate-library.mjs", import.meta.url));
const FIXTURES = fileURLToPath(new URL("./fixtures", import.meta.url));

function validate(dir) {
  const result = spawnSync(process.execPath, dir ? [VALIDATOR, dir] : [VALIDATOR], { encoding: "utf8" });
  return { code: result.status, output: `${result.stdout}${result.stderr}` };
}

// Every directory under fixtures/invalid needs an entry here, so a new broken fixture cannot go unchecked.
const INVALID = {
  "missing-authors": 'missing required field "authors"',
  "undeclared-placeholder": "placeholder {{audience}} is not declared in variables",
  "unused-variable": 'variable "tone" is declared but never used in template',
  "id-mismatch": "id must match the file path",
  "invalid-json": "invalid JSON",
};

describe("validate-library", () => {
  it("accepts the real library and finds at least one template", () => {
    const { code, output } = validate();
    assert.equal(code, 0, output);
    assert.match(output, /✔ [1-9]\d* templates valid/);
  });

  it("accepts a valid fixture", () => {
    const { code, output } = validate(join(FIXTURES, "valid"));
    assert.equal(code, 0, output);
    assert.match(output, /✔ 1 templates valid/);
  });

  it("fails when no templates are found", () => {
    const empty = mkdtempSync(join(tmpdir(), "templates-empty-"));
    try {
      const { code, output } = validate(empty);
      assert.equal(code, 1, output);
      assert.match(output, /no templates found/);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it("fails when the templates directory does not exist", () => {
    const { code, output } = validate(join(FIXTURES, "does-not-exist"));
    assert.equal(code, 1, output);
    assert.match(output, /templates directory not found/);
  });

  it("has an expectation for every invalid fixture", () => {
    assert.deepEqual(readdirSync(join(FIXTURES, "invalid")).sort(), Object.keys(INVALID).sort());
  });

  for (const [name, expected] of Object.entries(INVALID)) {
    it(`rejects ${name}`, () => {
      const { code, output } = validate(join(FIXTURES, "invalid", name));
      assert.equal(code, 1, output);
      assert.ok(output.includes(expected), `expected "${expected}" in:\n${output}`);
    });
  }
});
