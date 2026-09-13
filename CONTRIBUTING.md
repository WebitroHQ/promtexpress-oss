# Contributing

Thanks for helping out! Contributions of every size count, and first-timers are genuinely welcome.

## Ways to contribute

| You want to... | Where | Setup needed |
|---|---|---|
| Add a prompt template | `library/templates/<modality>/` | Node.js only |
| Translate a template | `library/templates/<modality>/` | Node.js only |
| Improve an existing template | `library/templates/` | Node.js only |
| Fix a bug or add a feature to the JS SDK or CLI | `packages/` | Node.js 22.18+ |
| Fix a bug or add a feature to the Python SDK | `python/` | Python 3.9+ |
| Build a client in a new language (Go, Rust, PHP...) | new top-level folder, discuss in an issue first | Your language's toolchain |
| Improve docs or examples | anywhere | none |

You do **not** need a PromtExpress account or API key to contribute. All tests run against mocks.

## Getting started

```bash
git clone https://github.com/<you>/promtexpress-oss.git
cd promtexpress-oss
npm install
npm test
```

Python:

```bash
pip install -e ./python
python -m unittest discover -s python/tests
```

Library only:

```bash
node scripts/validate-library.mjs
```

## Adding a template

1. Pick the folder matching the output type: `text`, `code`, `image`, `video`, `audio` or `music`.
2. Copy an existing template, rename it to a kebab-case slug, and update `id` to match the path.
3. Put your GitHub username in `authors`.
4. Fill in a realistic `example` and try the filled-in prompt in at least one AI tool.
5. Run `node scripts/validate-library.mjs` and open a pull request.

See the [library guide](library/README.md) for the full format and what makes a template good.

## Pull requests

- Keep each pull request to one focused change. Five small PRs are easier to review than one big one.
- Add or update tests when you change SDK or CLI behavior.
- Make sure `npm test` passes; CI runs it on every PR.
- Describe *why* in the PR description, not just *what*.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) where practical: `feat(sdk): ...`, `fix(cli): ...`, `docs: ...`, `template: add image/flat-lay-product`.

## Finding something to work on

- [`good first issue`](https://github.com/WebitroHQ/promtexpress-oss/labels/good%20first%20issue): small and well-scoped
- [`help wanted`](https://github.com/WebitroHQ/promtexpress-oss/labels/help%20wanted): bigger pieces we would love help with
- [`template request`](https://github.com/WebitroHQ/promtexpress-oss/labels/template%20request): templates people have asked for

Comment on an issue before starting so nobody duplicates work. If you have not opened a PR within a week, someone else may pick it up.

## Questions about your PromtExpress account

Billing, credits and account issues are handled by PromtExpress support at [promtexpress.com](https://promtexpress.com), not in this repository.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
