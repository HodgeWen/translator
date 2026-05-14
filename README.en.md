# Translator

<div align="center">[中文](./README.md) · English</div>

A browser translation extension powered by OpenAI-compatible LLMs. Supports multiple providers, four display styles for page translation, and quick popup translation.

## Features

### Implemented

- [x] **Multi-Provider Support** — Works with any OpenAI-compatible API. Configure multiple providers with automatic model queue fallback.
- [x] **Four Display Styles** — Original / Bilingual / Underline (hover to see original) / Clean
- [x] **Live Page Translation** — Viewport-based translation via IntersectionObserver, with batched aggregate requests for efficiency.
- [x] **Popup Translation** — Quick translate via toolbar popup with auto language detection.
- [x] **Input Box Translation** — Type three consecutive shortcut keys (Alt/Command by default) to translate the current input.
- [x] **Hover Translation** — Hold Ctrl and hover over a paragraph to highlight and translate.
- [x] **Language Detection** — Built-in franc-min with optional Google / custom API detectors as fallback.
- [x] **SPA Route Awareness** — Detects pushState/replaceState navigation and retranslates new page content.
- [x] **Translation Cache** — IndexedDB caching with daily automatic cleanup.
- [x] **Settings Import/Export** — JSON export with optional AES-GCM encryption for API key protection.
- [x] **Keyboard Shortcut** — `Alt+W` to toggle page translation.
- [x] **i18n** — Chinese / English UI language switching.

### Planned

- [ ] **Translation Service Layer** — Introduce a service layer with two types: Provider (manual model selection with fallback) and Translation Pool (multi-provider weighted load balancing). Remove global load balancing settings; providers and models no longer serve as direct translation service switches.
- [ ] **Translation Prompt Management** — Move prompts from provider level to service level. Support prompt presets (name, description, content) with a quick-fill button in service config and global default prompt settings.
- [ ] **Default Style & Display Config** — Configure default translation style and display mode at the service layer. Allow personal overrides (e.g., "Use service default" and "Use my default" options for translation style).
- [ ] **Custom Translation Style** — Support user-defined custom styles in addition to built-in presets.

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
