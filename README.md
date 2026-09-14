<div align="center">

# PromtExpress Open Source

**Official SDKs, CLI and a community prompt library for [PromtExpress](https://promtexpress.com).**

Describe what you want in plain language, get a production-ready prompt for ChatGPT, Claude, Gemini, Midjourney, Veo and 60+ other AI tools.

[![CI](https://github.com/WebitroHQ/promtexpress-oss/actions/workflows/ci.yml/badge.svg)](https://github.com/WebitroHQ/promtexpress-oss/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## What's in this repo

| Path | Package | What it is |
|---|---|---|
| [`library/`](library) | none | Community prompt templates as plain JSON, usable with any AI tool, no account needed |
| [`packages/sdk`](packages/sdk) | [`promtexpress`](https://www.npmjs.com/package/promtexpress) | JavaScript / TypeScript client, zero dependencies |
| [`packages/cli`](packages/cli) | [`promtexpress-cli`](https://www.npmjs.com/package/promtexpress-cli) | `promtexpress` command for your terminal and scripts |
| [`python`](python) | [`promtexpress`](https://pypi.org/project/promtexpress/) | Python client, standard library only |

The PromtExpress service itself is a hosted product. This repository contains everything that talks to it, plus a prompt library that stands on its own.

## Quick start

Create an API key in the PromtExpress dashboard under **API Keys**, then:

```bash
export PROMTEXPRESS_API_KEY=pe_live_...
```

**CLI**

```bash
npx promtexpress-cli generate "launch email for my note-taking app, friendly tone"
npx promtexpress-cli generate -m image "hero image for a specialty coffee brand" | pbcopy
```

**TypeScript / JavaScript**

```ts
import { PromtExpress } from "promtexpress";

const client = new PromtExpress();
const { output, creditsRemaining } = await client.generate({
  intent: "launch email for my note-taking app, friendly tone",
  modality: "text",
});
```

**Python**

```python
from promtexpress import PromtExpress

client = PromtExpress()
result = client.generate("launch email for my note-taking app, friendly tone", "text")
print(result["output"])
```

## Prompt library

[`library/templates`](library/templates) holds hand-written templates for text, code, image, video, audio and music, each with variables and a worked example. Copy one into any AI tool, or add your own. See the [library guide](library/README.md).

## Contributing

New templates, translations, bug fixes, examples and new language SDKs are all welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and look for issues labeled [`good first issue`](https://github.com/WebitroHQ/promtexpress-oss/labels/good%20first%20issue).

### Contributors

Everyone who has shipped a commit or authored a template. Updated automatically on every merge.

<!-- contributors:start -->
<table>
  <tr>
    <td align="center" valign="top" width="14%"><a href="https://github.com/SpicesFire"><img src="https://github.com/SpicesFire.png?size=100" width="64" height="64" alt="SpicesFire"/><br/><sub><b>SpicesFire</b></sub></a><br/><sub>6 commits · 10 templates</sub></td>
    <td align="center" valign="top" width="14%"><a href="https://github.com/resularabaci"><img src="https://github.com/resularabaci.png?size=100" width="64" height="64" alt="resularabaci"/><br/><sub><b>resularabaci</b></sub></a><br/><sub>2 commits · 2 templates</sub></td>
  </tr>
</table>
<!-- contributors:end -->

## License

[MIT](LICENSE) © Webitro
