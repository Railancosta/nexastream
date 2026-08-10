# NexaStream Global i18n

NexaStream uses a locale-independent, data-driven translation layer.

## Goals

- Detect the user's preferred locale from `Accept-Language`.
- Allow an explicit locale selector to override detection.
- Keep the application functional when a translation is missing.
- Avoid paid translation services at runtime.
- Support right-to-left layouts for Arabic, Hebrew, Persian and Urdu.
- Keep translation generation separate from production serving.

## Ollama workflow

A local Ollama/open-source agent can generate candidate translation dictionaries from the canonical Portuguese/English source strings. Generated translations must be reviewed and committed as versioned locale data before being treated as production copy.

The application must never fabricate a translation or silently present an untranslated claim as verified.

## Scope

The locale registry contains a broad set of major language/region tags. "All languages in the world" cannot literally be guaranteed by a finite hard-coded list: language coverage is an evolving data problem involving language codes, scripts, regional variants and translation quality. New locales can be added without changing UI components.
