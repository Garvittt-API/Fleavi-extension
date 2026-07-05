<div align="center">

  <img src="public/icons/icon128.png" alt="Fleavi Logo" width="80" style="border-radius: 16px; box-shadow: 0 8px 32px rgba(108,92,231,0.3);" />

  <h1>⚡ Fleavi</h1>

  <p><strong>Summarize Any Page. In One Click.</strong></p>

  <p>A lightweight browser extension that uses AI to instantly distill web pages into concise, actionable summaries — with interactive chat, source citations, translation, and seamless exports.</p>

  <br/>

  <a href="https://chrome.google.com/webstore/detail/fleavi">
    <img src="https://img.shields.io/badge/Download-Chrome-4285F4?logo=google-chrome&logoColor=white&style=for-the-badge" alt="Chrome" />
  </a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/fleavi">
    <img src="https://img.shields.io/badge/Download-Edge-0078D4?logo=microsoft-edge&logoColor=white&style=for-the-badge" alt="Edge" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-00B894?style=for-the-badge" alt="License" />
  </a>
  <a href="https://github.com/Garvittt-API/Fleavi-extension">
    <img src="https://img.shields.io/github/stars/Garvittt-API/Fleavi-extension?style=for-the-badge&logo=github" alt="Stars" />
  </a>

  <br/><br/>

  <img src="screenshots/preview.png" alt="Fleavi Demo" width="600" style="border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.3);" />

</div>

---

<br/>

## ✨ Why Fleavi?

Reading long articles, research papers, or documentation takes time. **Fleavi** cuts through the noise — one click gives you the key insights, and you can ask follow-up questions without ever leaving the page.

> **Free to use.** No API key required. 20 summaries/day on the free tier. Bring your own key for unlimited access.

<br/>

## 🎯 Features

<table>
  <tr>
    <td width="50%" valign="top">

### 🧠 Smart Summarization
- **One-click summarize** with `Ctrl+Shift+S`
- **4 formats**: Bullets, Prose, Structured, Mind Map
- **3 lengths**: Short, Medium, Detailed
- **Source citations** — clickable links that highlight the original text

### 💬 Interactive AI Chat
- Ask follow-up questions about any page
- Quick suggestions: *"Main argument?"* *"Key findings"*
- Chat history preserved during session

### 🌍 Cross-Language Translation
- Translate and summarize in **20+ languages**
- Spanish, French, German, Japanese, Chinese, and more

    </td>
    <td width="50%" valign="top">

### 🎭 Custom Personas
| Persona | Style |
|---------|-------|
| **Standard** | Clear, neutral summary |
| **ELI5** | Simple language, analogies |
| **Executive** | Business brief with action items |
| **Academic** | Formal, citation-ready |
| **Sales** | Value propositions & ROI |
| **Casual** | Friendly, conversational |

### 📤 Seamless Exports
- **Notion** — creates pages via API
- **Obsidian** — opens via URI scheme
- **Readwise** — syncs highlights
- **Kindle** — send via email
- **Copy / Markdown** — one-click clipboard

### 📑 Read Later & Digests
- Bookmark pages for later
- Right-click → *"Save to Read Later"*
- Automated **daily digests** of saved articles

    </td>
  </tr>
</table>

<br/>

## 🚀 Quick Start

### Install from Source

```bash
git clone https://github.com/Garvittt-API/Fleavi-extension.git
cd Fleavi-extension
```

**Chrome / Edge:**
1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode**
3. Click **Load unpacked** → select the folder

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on** → select `manifest.json`

### That's it — no API key needed!

The free tier works out of the box. Open any page, click the Fleavi icon, and hit **Summarize**.

> 💡 **Want unlimited?** Click the ⚙️ settings icon and add your own Groq or OpenAI API key.

<br/>

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|:--------:|--------|
| `Ctrl+Shift+S` | ⚡ Summarize current page |
| `Ctrl+Shift+C` | 💬 Open side panel |

<br/>

## 🏗️ Architecture

```
Fleavi-extension/
├── manifest.json              # Manifest V3
├── server/                    # Cloudflare Worker (free tier)
│   ├── index.js               # Rate limiting + AI proxy
│   └── wrangler.toml          # Cloudflare config
├── src/
│   ├── background.js          # Service worker
│   ├── content.js             # Page extraction + highlighting
│   ├── popup.*                # Quick-action popup
│   ├── sidepanel.*            # Full side panel UI
│   ├── styles/                # CSS with dark mode
│   └── utils/
│       ├── summarizer.js      # AI API + proxy routing
│       ├── personas.js        # Persona presets
│       ├── translator.js      # 20+ languages
│       ├── exports.js         # Notion, Obsidian, Readwise, Kindle
│       ├── storage.js         # Settings & history
│       └── helpers.js         # Markdown, utilities
└── screenshots/               # Store submission mockups
```

<br/>

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Extension** | Manifest V3, Vanilla JS (~33KB) |
| **AI Backend** | Cloudflare Workers + Groq (Llama 3.1) |
| **Rate Limiting** | Cloudflare KV (20 free/day) |
| **Storage** | Chrome Storage API |
| **UI** | Side Panel API, CSS Custom Properties |

<br/>

## 🔒 Privacy

- **Your data stays yours** — API keys stored locally in your browser
- **No tracking** — zero analytics, zero ads
- **No server storage** — proxy processes requests and discards them
- **Open source** — audit the code yourself

<br/>

## 🤝 Contributing

Contributions are welcome! Whether it's a bug fix, new feature, or documentation improvement.

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

<br/>

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

<br/>

---

<div align="center">

**Built with ⚡ by [Garvittt](https://github.com/Garvittt-API)**

If you find Fleavi useful, please give it a ⭐ — it helps others discover the project!

<br/>

<a href="https://github.com/Garvittt-API/Fleavi-extension">
  <img src="https://img.shields.io/badge/Star_on_GitHub-6C5CE7?style=for-the-badge&logo=github&logoColor=white" alt="Star on GitHub" />
</a>

</div>
