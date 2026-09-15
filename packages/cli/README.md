# promtexpress-cli

Turn plain-language intent into production-ready prompts from your terminal, using [PromtExpress](https://promtexpress.com).

```bash
npm install -g promtexpress-cli
export PROMTEXPRESS_API_KEY=pe_live_...
```

## Commands

```bash
# Compile a prompt; the prompt goes to stdout, credits and hints go to stderr
promtexpress generate "cold outreach email to a boutique hotel about our booking widget"

# Other modalities, piping into the clipboard
promtexpress generate -m image "flat lay of a skincare set on travertine" | pbcopy

# Read the intent from a file or another command
cat brief.txt | promtexpress generate - -m video

# Published templates and your history
promtexpress templates -m image
promtexpress history --limit 50

# Raw JSON for scripting
promtexpress generate --json "release notes for v2.3" | jq .creditsRemaining
```

Run `promtexpress --help` for every option.

| Exit code | Meaning |
|---|---|
| 0 | success |
| 1 | API or network error |
| 2 | invalid usage |

## Contributors

Everyone who has shipped a commit or authored a template in [promtexpress-oss](https://github.com/WebitroHQ/promtexpress-oss). New templates, translations and fixes are welcome: see the [open issues](https://github.com/WebitroHQ/promtexpress-oss/issues).

<!-- contributors:start -->
<table>
  <tr>
    <td align="center" valign="top" width="14%"><a href="https://github.com/SpicesFire"><img src="https://github.com/SpicesFire.png?size=100" width="64" height="64" alt="SpicesFire"/><br/><sub><b>SpicesFire</b></sub></a><br/><sub>13 commits · 10 templates</sub></td>
    <td align="center" valign="top" width="14%"><a href="https://github.com/resularabaci"><img src="https://github.com/resularabaci.png?size=100" width="64" height="64" alt="resularabaci"/><br/><sub><b>resularabaci</b></sub></a><br/><sub>2 commits · 2 templates</sub></td>
  </tr>
</table>
<!-- contributors:end -->

## License

MIT
