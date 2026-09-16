# Prompt library

Community-maintained prompt templates that work with any AI tool, with or without PromtExpress.
Every template is a single JSON file, validated in CI, and credited to the people who wrote it.

```
library/templates/
├── text/      writing, summarizing, analysis
├── code/      programming and code review
├── image/     Midjourney, DALL·E, Imagen, Flux, SDXL...
├── video/     Veo, Sora, Runway, Kling...
├── audio/     voice-over, podcasts, sound design
└── music/     Suno, Udio and music briefs
```

## Template format

```json
{
  "$schema": "../../schema/template.schema.json",
  "id": "image/studio-product-photo",
  "title": "Studio product photo",
  "description": "Clean e-commerce hero shot of a single product on a seamless background.",
  "category": "ecommerce",
  "modality": "image",
  "engine": null,
  "language": "en",
  "version": "1.0.0",
  "authors": ["your-github-username"],
  "tags": ["product", "photography"],
  "variables": [
    { "name": "product", "description": "What is being photographed", "required": true, "example": "matte black ceramic coffee mug" }
  ],
  "template": "Studio product photograph of {{product}} ...",
  "example": { "product": "matte black ceramic coffee mug" }
}
```

| Field | Rules |
|---|---|
| `id` | `<modality>/<slug>`, exactly the file path without `.json` |
| `modality` | `text`, `code`, `image`, `video`, `audio` or `music`, same as the folder |
| `engine` | `null` if the template works everywhere, otherwise the tool it is tuned for, e.g. `"midjourney"` |
| `language` | ISO 639-1 code of the template text (`en`, `tr`, `de`...) |
| `version` | Semver. Bump the minor version when you improve an existing template |
| `authors` | GitHub usernames. Add yourself when you make a substantial improvement |
| `variables` | Every `{{placeholder}}` must be declared, and every declared variable must be used |

## Check your template locally

```bash
node scripts/validate-library.mjs
```

No install needed; it only uses Node.js.

## Evals

A template can also have an eval suite under [`evals/`](evals/README.md): fixed inputs with deterministic checks, re-scored in CI from recorded outputs without any API keys.

## What makes a template good

- **It solves one job well.** "Studio product photo", not "any product image".
- **It encodes real expertise.** Lighting setups, review checklists, structure a professional would use.
- **It is tool-agnostic unless it can't be.** Use `engine` only for syntax that only one tool understands.
- **It has a realistic example.** Reviewers try it before merging.

Translations of existing templates are very welcome. Use a new slug in the target language and set `language`.
