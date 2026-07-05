<div align="center">

# ⚡ Fleavi

### Summarize Any Page. In One Click.

A powerful browser extension that uses AI to instantly distill web pages into concise, actionable summaries — with interactive chat, source citations, and seamless exports.

[![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore/detail/fleavi)
[![Edge](https://img.shields.io/badge/Edge-Extension-0078D4?logo=microsoft-edge&logoColor=white)](https://microsoftedge.microsoft.com/addons/detail/fleavi)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)
[![Stars](https://img.shields.io/github/stars/Garvittt-API/Fleavi-extension?style=social)](https://github.com/Garvittt-API/Fleavi-extension)

<img src="screenshots/preview.png" alt="Fleavi Preview" width="600" />

</div>

---

## Why Fleavi?

Reading long articles, research papers, or documentation takes time. Fleavi cuts through the noise — one click gives you the key insights, and you can ask follow-up questions without ever leaving the page.

**Free to use.** No API key required for the free tier (20 summaries/day). Bring your own key for unlimited access.

---

## Features

| Feature | Description |
|---------|-------------|
| **One-Click Summarize** | Hit `Ctrl+Shift+S` or click the icon — get a summary in seconds |
| **4 Output Formats** | Bullets, Prose, Structured, or Mind Map — pick what works for you |
| **Adjustable Length** | Short (1-2 sentences), Medium, or Detailed breakdown |
| **Interactive AI Chat** | Ask follow-up questions about the page content |
| **Source Citations** | Clickable `[source: N]` links that highlight the original paragraph |
| **Custom Personas** | ELI5, Executive, Academic, Sales, Casual, or write your own |
| **20+ Languages** | Translate and summarize pages in any language |
| **Read Later** | Bookmark articles for later — with automated daily digests |
| **Export Anywhere** | Notion, Obsidian, Readwise, Kindle, or just copy to clipboard |
| **Dark Mode** | Easy on the eyes for late-night reading |

---

## Quick Start

### Install from Source

```bash
git clone https://github.com/Garvittt-API/Fleavi-extension.git
cd Fleavi-extension
```

Then load in your browser:

**Chrome / Edge:**
1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `Fleavi-extension` folder

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on** → select `manifest.json`

### First-Time Setup

1. Click the **Fleavi** icon in your toolbar
2. Click **Full Panel** to open the side panel
3. That's it — the free tier works without any API key

> **Want unlimited summaries?** Click the settings icon and add your own Groq or OpenAI API key.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+S` | Summarize current page |
| `Ctrl+Shift+C` | Open side panel |

---

## Architecture

```
Fleavi-extension/
├── manifest.json                 # Manifest V3 configuration
├── server/                       # Cloudflare Worker proxy (free tier)
│   ├── index.js                  # Worker — rate limiting, AI routing
│   ├── wrangler.toml             # Cloudflare config
│   └── README.md                 # Deployment guide
├── src/
│   ├── background.js             # Service worker — messaging, digests
│   ├── content.js                # Page extraction, source highlighting
│   ├── popup.html / popup.js     # Quick-action popup
│   ├── sidepanel.html / .js      # Main side panel (all tabs)
│   ├── styles/                   # CSS (with dark mode)
│   └── utils/
│       ├── summarizer.js         # AI API integration + proxy
│       ├── personas.js           # Persona presets
│       ├── translator.js         # Multi-language support
│       ├── exports.js            # Notion, Obsidian, Readwise, Kindle
│       ├── storage.js            # Settings & history
│       └── helpers.js            # Markdown, text utilities
└── screenshots/                  # Store submission mockups
```

---

## Tech Stack

- **Manifest V3** — Modern extension architecture
- **Vanilla JS** — Zero dependencies, lightweight (~33KB)
- **Cloudflare Workers** — Free tier proxy with KV rate limiting
- **Groq / Llama 3.1** — Free, fast AI inference
- **Chrome Storage API** — Settings and history persistence
- **Side Panel API** — Non-intrusive main UI

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

**Ideas for contributions:**
- [ ] Support more AI providers (Gemini, local models)
- [ ] PDF text extraction
- [ ] Video transcript summarization
- [ ] Custom themes and color schemes
- [ ] More export integrations (Roam Research, Logseq)
- [ ] i18n / localization

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ⚡ by [Garvittt](https://github.com/Garvittt-API)**

If you find Fleavi useful, please give it a ⭐ on GitHub!

</div>
