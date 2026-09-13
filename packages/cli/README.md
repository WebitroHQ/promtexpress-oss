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

## License

MIT
