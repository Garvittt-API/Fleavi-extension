# Contributing to Fleavi

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/Garvittt-API/Fleavi-extension.git
cd Fleavi-extension
```

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" → select the project folder
4. Make changes → click the refresh button on the extension

## Project Structure

- `src/` — Extension source code (popup, side panel, background, content script)
- `src/utils/` — Utility modules (AI, exports, storage, personas)
- `server/` — Cloudflare Worker proxy for free tier
- `screenshots/` — Store submission mockups

## Guidelines

- **No build step** — keep it vanilla JS, no frameworks
- **Keep it lightweight** — the extension should stay under 50KB
- **Test on real pages** — verify on Wikipedia, news sites, and documentation
- **Follow existing patterns** — match the code style of the file you're editing

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## Reporting Issues

Open an issue on GitHub with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Browser and OS version

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
