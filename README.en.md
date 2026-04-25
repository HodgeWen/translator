# Translator

[中文](./README.md)

A browser translation extension powered by OpenAI-compatible LLMs. Supports multiple providers, four display styles for page translation, and quick popup translation.

## Features

- **Multi-Provider Support** — Works with any OpenAI-compatible API. Configure multiple providers with automatic model queue fallback.
- **Four Display Styles** — Original / Bilingual / Underline (hover to see original) / Clean
- **Live Page Translation** — Viewport-based translation via IntersectionObserver, with batched aggregate requests for efficiency.
- **Popup Translation** — Quick translate via toolbar popup with auto language detection.
- **Input Box Translation** — Type three consecutive spaces to translate the current input.
- **Ctrl + Hover Translation** — Hold Ctrl and hover over a paragraph to highlight and translate.
- **Language Detection** — Built-in franc-min with optional Google / custom API detectors as fallback.
- **SPA Route Awareness** — Detects pushState/replaceState navigation and retranslates new page content.
- **Translation Cache** — IndexedDB caching with daily automatic cleanup.
- **Settings Import/Export** — JSON export with optional AES-GCM encryption for API key protection.
- **Keyboard Shortcut** — `Alt+W` to toggle page translation.
- **i18n** — Chinese / English UI language switching.

### Translation Styles

| Style | Description |
|---|---|
| Original | Replace text while preserving element structure |
| Bilingual | Show original and translation side by side |
| Underline | Underlined translation with tooltip showing original |
| Clean | Clean replacement without markers |

## Installation

### Web Store

> Coming soon

### Developer Mode

```bash
# 1. Install dependencies
bun install

# 2. Production build
bun build

# 3. Load in Chrome
#    Open chrome://extensions → Enable "Developer mode" → "Load unpacked"
#    Select .output/chrome-mv3 directory
```

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Save user settings |
| `activeTab` | Access current tab |
| `scripting` | Inject translation scripts |
| `alarms` | Scheduled cache cleanup |
| `host_permissions: <all_urls>` | Translate content on any page |

## Privacy

- Translation requests go directly to your configured provider's API. No intermediate servers.
- API keys stored locally via chrome.storage.sync, with optional AES-GCM encryption for exports.
- Local IndexedDB cache with automatic cleanup.
- No data collection or telemetry.

## License

MIT
