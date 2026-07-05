# Fleavi Backend Proxy

Cloudflare Worker that powers the free tier. Handles AI summarization, rate limiting, and chat.

## Setup

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### 2. Create KV namespace for rate limiting

```bash
cd server
npm install
npm run create-kv
```

Copy the ID from the output and paste it into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "PASTE_YOUR_ID_HERE"
```

### 3. Set your OpenAI API key

```bash
wrangler secret put OPENAI_API_KEY
# Paste your OpenAI API key when prompted
```

### 4. Deploy

```bash
npm run deploy
```

Your proxy is now live at `https://fleavi-proxy.YOUR_SUBDOMAIN.workers.dev`

### 5. Update the extension

In `src/utils/summarizer.js`, set the `PROXY_URL` to your deployed worker URL.

## Rate Limits

- Free tier: 20 requests/day per user
- Tracked by IP address via Cloudflare KV
- Resets at midnight UTC
- Users with their own API key bypass all limits

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/summarize` | POST | Summarize content |
| `/api/chat` | POST | Chat about page content |
| `/api/usage` | GET | Check current usage |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key (stored as secret) |
| `FREE_DAILY_LIMIT` | No | Requests per day per user (default: 20) |
| `RATE_LIMITS` | Optional | KV namespace for tracking usage |
