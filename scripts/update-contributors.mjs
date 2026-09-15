#!/usr/bin/env node
// Rewrites the contributors block in README.md and in the package READMEs (the pages shown on npm and
// PyPI, refreshed on each release) from two sources: GitHub commit contributors and the
// `authors` field of every template, so people credited only in a template still get an avatar.
//   GITHUB_TOKEN=... node scripts/update-contributors.mjs
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = process.env.GITHUB_REPOSITORY ?? "WebitroHQ/promtexpress-oss";
const READMES = ["README.md", "packages/sdk/README.md", "packages/cli/README.md", "python/README.md"];
const TEMPLATES = fileURLToPath(new URL("../library/templates", import.meta.url));
const START = "<!-- contributors:start -->";
const END = "<!-- contributors:end -->";
const PER_ROW = 7;

async function commitContributors() {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "promtexpress-oss-contributors" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const people = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contributors?per_page=100&page=${page}`, { headers });
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    const batch = await res.json();
    people.push(...batch);
    if (batch.length < 100) return people;
  }
}

function templateAuthors(dir) {
  const counts = new Map();
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const path = join(d, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith(".json")) {
        for (const author of JSON.parse(readFileSync(path, "utf8")).authors ?? []) {
          counts.set(author.toLowerCase(), { login: author, templates: (counts.get(author.toLowerCase())?.templates ?? 0) + 1 });
        }
      }
    }
  };
  walk(dir);
  return counts;
}

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const byLogin = new Map();
for (const c of await commitContributors()) {
  if (c.type !== "User") continue; // skip bots and anonymous entries
  byLogin.set(c.login.toLowerCase(), { login: c.login, commits: c.contributions, templates: 0 });
}
for (const [key, { login, templates }] of templateAuthors(TEMPLATES)) {
  const entry = byLogin.get(key) ?? { login, commits: 0, templates: 0 };
  entry.templates = templates;
  byLogin.set(key, entry);
}

const people = [...byLogin.values()].sort((a, b) => b.commits + b.templates - (a.commits + a.templates) || a.login.localeCompare(b.login));
const cell = (p) => {
  const parts = [];
  if (p.commits) parts.push(`${p.commits} commit${p.commits === 1 ? "" : "s"}`);
  if (p.templates) parts.push(`${p.templates} template${p.templates === 1 ? "" : "s"}`);
  const login = escape(p.login);
  return `    <td align="center" valign="top" width="14%"><a href="https://github.com/${login}"><img src="https://github.com/${login}.png?size=100" width="64" height="64" alt="${login}"/><br/><sub><b>${login}</b></sub></a><br/><sub>${parts.join(" · ")}</sub></td>`;
};
const rows = [];
for (let i = 0; i < people.length; i += PER_ROW) rows.push(`  <tr>\n${people.slice(i, i + PER_ROW).map(cell).join("\n")}\n  </tr>`);
const block = `${START}\n<table>\n${rows.join("\n")}\n</table>\n${END}`;

for (const file of READMES) {
  const path = fileURLToPath(new URL(`../${file}`, import.meta.url));
  const readme = readFileSync(path, "utf8");
  const from = readme.indexOf(START);
  const to = readme.indexOf(END, from);
  if (from === -1 || to === -1) throw new Error(`${file} has no ${START} ... ${END} block`);
  const next = readme.slice(0, from) + block + readme.slice(to + END.length);
  if (next === readme) {
    console.log(`${file}: contributors unchanged (${people.length})`);
  } else {
    writeFileSync(path, next);
    console.log(`${file}: contributors updated (${people.length}): ${people.map((p) => p.login).join(", ")}`);
  }
}
