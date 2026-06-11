# Translator

<div align="center"><a href="./README.md">中文</a> · English</div>

A browser translation extension powered by LLMs, supporting any OpenAI-compatible API provider. Four translation modes and flexible translation service configuration.

## Features

- **Full-page translation** — Alt+W one-click page translation, auto-detects SPA route changes
- **Hover translation** — Hold a key (default Ctrl) and point at any paragraph to highlight and translate
- **Input box translation** — Triple-press a shortcut key in any input field to translate, triple-press again to restore
- **Popup translation** — Manual input translation with polysemy display and tone switching
- **Translation services** — Single (one provider + model fallback) or Pool (multi-provider weighted load balancing)
- **Four display styles** — Original / Bilingual / Underline (hover to see original) / Clean
- **Cascading config** — Display style and tone: service default → personal default → global override
- **Inline HTML preservation** — Code, links, emphasis preserved after translation
- **Batch aggregation** — Multiple paragraphs combined into one request, auto-fallback on failure
- **Translation cache** — Local cache, 7-day TTL, auto-invalidated on prompt changes, duplicate request merging
- **Language detection** — Built-in local detection, optional Google or custom API detectors
- **Custom tones & prompt presets** — User-defined translation styles and reusable prompt templates
- **Loading animations** — 4 themes + customizable input animation
- **Encrypted export** — Settings export as JSON with optional password encryption
- **i18n** — Chinese / English UI
- **Site rules** — Translation exclusions for GitHub and other sites

## Architecture

```
src/
├── entrypoints/
│   ├── background.ts          # Background: message routing, cache management, shortcuts
│   ├── content/               # Content script: paragraph detection→lang detection→encoding→request→apply
│   ├── popup/main.tsx         # Popup translation UI
│   └── options/main.tsx       # Settings page (8 tabs)
├── lib/                       # Core libraries
│   ├── api/                   # API calls, service queue, streaming
│   ├── storage.ts, cache.ts   # Config storage & translation cache
│   ├── schema.ts, prompts.ts  # Validation & prompt templates
│   ├── lang-detect, block-detect, inline-placeholder, batch-protocol
│   └── messaging, crypto, site-rules
├── components/                # React components
└── types/                     # Type definitions
```

## Installation

```bash
bun install && bun build
# chrome://extensions → Developer mode → Load unpacked → select .output/chrome-mv3
```

## Settings Overview

| Tab         | Description                                      |
| ----------- | ------------------------------------------------ |
| Providers   | API provider management (URL, Key, models)       |
| Services    | Single (+fallback) or Pool (weighted) config     |
| Presets     | Custom prompt presets, translation tone styles   |
| Language    | Native/source/UI language, language detectors    |
| Display     | Display style, tone, loading animations          |
| General     | Global prompt, timeout, aggregation, shortcuts   |
| Backup      | Settings export/import (encryption supported)    |
| Manual      | Full documentation                               |

## Permissions

`storage` `activeTab` `scripting` `alarms` `host_permissions: <all_urls>`

## Privacy

Requests go directly to your configured provider — no intermediate servers. API keys stored only in browser storage. Encryption supported for exports. No data collection.

## License

MIT
