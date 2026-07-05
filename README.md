<div align="center">

# ⚡ Fleavi

### Summarize Any Page. In One Click.

A powerful browser extension that uses AI to instantly summarize web pages, with interactive chat, source citations, and seamless exports to your favorite tools.

[![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://chrome.google.com/webstore/detail/fleavi)
[![Firefox](https://img.shields.io/badge/Firefox-Extension-FF7139?logo=firefox-browser&logoColor=white)]()
[![Edge](https://img.shields.io/badge/Edge-Extension-0078D4?logo=microsoft-edge&logoColor=white)]()
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## 🎯 What is Fleavi?

Fleavi is a lightweight browser extension that distills any web page into concise, actionable summaries using AI. Whether you're reading research papers, blog posts, news articles, or documentation — Fleavi gives you the key insights in seconds.

## ✨ Features

### 🧠 Smart Summarization
- **One-click summarize** any webpage with `Ctrl+Shift+S`
- **4 summary formats**: Bullets, Prose, Structured, and Mind Map
- **Adjustable length**: Short, Medium, or Detailed
- **Source citations** — clickable `[source: N]` links that highlight the original paragraph on the page

### 🎭 Custom Personas
Tailor the output to your needs with built-in personas:
| Persona | Description |
|---------|-------------|
| **Standard** | Balanced, clear summary |
| **ELI5** | Explain Like I'm 5 — simple language, analogies |
| **Executive** | Concise business brief with action items |
| **Academic** | Formal, citation-ready analysis |
| **Sales** | Focus on value propositions and opportunities |
| **Casual** | Friendly, conversational tone |
| **Custom** | Write your own instructions |

### 💬 Interactive AI Chat
- Ask follow-up questions about the page without leaving it
- Quick suggestion buttons: "Main argument?", "Key findings", "Limitations?"
- Chat history preserved during session

### 🌍 Cross-Language Translation
- Translate and summarize pages in 20+ languages in one click
- Spanish, French, German, Japanese, Chinese, Arabic, and more

### 📑 Read Later & Daily Digests
- Bookmark pages to your Read Later list
- Right-click any page → "Save to Read Later"
- Enable automated daily digests that compile summaries of saved articles

### 📤 Seamless Exports
| Service | How it works |
|---------|-------------|
| **Notion** | Creates pages directly via API |
| **Obsidian** | Opens via URI scheme with pre-filled content |
| **Readwise** | Syncs highlights via API |
| **Kindle** | Sends via email-to-Kindle |
| **Copy / Markdown** | One-click clipboard copy |

### 🎨 Design
- Clean, minimal UI with violet (#6C5CE7) accent
- Full **dark mode** support
- Responsive side panel that doesn't interrupt your workflow
- Keyboard shortcuts for power users

---

## 🚀 Installation

### From Source (Development)

```bash
# Clone the repository
git clone https://github.com/Garvittt-API/Snapsum-extension.git

# Navigate to the directory
cd Snapsum-extension
```

Then load in your browser:

**Chrome / Edge:**
1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `Snapsum-extension` folder

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json`

### First-Time Setup

1. Click the Fleavi icon in your toolbar
2. Click **Full Panel** to open the side panel
3. Click the **⚙ Settings** icon
4. Select your AI provider and enter your API key
5. Click **Save**

---

## 🔑 API Keys

Fleavi supports two AI providers:

| Provider | Model | Get API Key |
|----------|-------|-------------|
| **OpenAI** | GPT-4o-mini | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Anthropic** | Claude 3.5 Haiku | [console.anthropic.com](https://console.anthropic.com/) |

Your API key is stored locally in your browser and never sent to any server except the provider's API.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+S` | Summarize current page |
| `Ctrl+Shift+C` | Open side panel / chat |

---

## 📁 Project Structure

```
Snapsum-extension/
├── manifest.json              # Manifest V3 configuration
├── README.md                  # This file
├── src/
│   ├── background.js          # Service worker — messaging, context menus, digests
│   ├── content.js             # Content script — page extraction, source highlighting
│   ├── popup.html             # Popup entry point
│   ├── popup.js               # Quick-action popup UI
│   ├── sidepanel.html         # Side panel entry point
│   ├── sidepanel.js           # Main side panel UI (all tabs)
│   ├── styles/
│   │   ├── popup.css          # Popup styles
│   │   ├── sidepanel.css      # Side panel styles (dark mode included)
│   │   └── content.css        # Content script overlay styles
│   └── utils/
│       ├── summarizer.js      # OpenAI & Anthropic API integration
│       ├── personas.js        # Custom persona presets
│       ├── translator.js      # Cross-language translation
│       ├── exports.js         # Notion, Obsidian, Readwise, Kindle exports
│       ├── storage.js         # Settings & history persistence
│       └── helpers.js         # Markdown rendering, text utilities
└── public/
    └── icons/                 # Extension icons (16, 48, 128px)
```

---

## 🛠 Tech Stack

- **Manifest V3** — Modern Chrome extension architecture
- **Vanilla JavaScript** — Zero framework dependencies, lightweight
- **Chrome Storage API** — Settings and history persistence
- **Side Panel API** — Non-intrusive main UI
- **CSS Custom Properties** — Theme support (light/dark)
- **OpenAI GPT-4o-mini** / **Anthropic Claude 3.5 Haiku** — AI summarization

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Ideas for Contributions
- [ ] Support more AI providers (Gemini, local models)
- [ ] PDF text extraction
- [ ] Video transcript summarization
- [ ] Browser bookmark integration
- [ ] Custom themes
- [ ] More export integrations (Roam Research, Logseq)
- [ ] i18n / localization

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ⚡ by [Garvittt](https://github.com/Garvittt-API)**

If you find Fleavi useful, please give it a ⭐ on GitHub!

</div>
