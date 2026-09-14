# Changelog

All notable changes to the SDKs and CLI. Template changes are tracked in each template's `version` field.

## 0.2.0 (2026-09-14)

JavaScript/TypeScript SDK (`promtexpress`), CLI (`promtexpress-cli`) and Python SDK (`promtexpress`).

### Added
- `PermissionDeniedError` for 403 responses when an API key lacks a scope, with the missing scope exposed as `missingScope` (TypeScript) / `missing_scope` (Python).
- The CLI explains which scope to add when a key is missing one.
- README sections documenting API key scopes (`read`, `generate`, `admin`) and per-key rate limits.

### Changed
- Python client sends `promtexpress-python/0.2.0` as its User-Agent.

## 0.1.0 (2026-09-13)

Initial release of the TypeScript SDK, CLI, Python SDK and community prompt library.
