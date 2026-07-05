// Fleavi Backend Proxy — Cloudflare Worker
// Handles AI summarization with rate limiting for free tier users

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Fleavi-Client, X-Fleavi-Key',
};

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/api/usage' && request.method === 'GET') {
      try { return await handleUsage(request, env); }
      catch (err) { return jsonResponse({ error: err.message }, 500); }
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    try {
      if (url.pathname === '/api/summarize') return await handleSummarize(request, env);
      if (url.pathname === '/api/chat') return await handleChat(request, env);
      return jsonResponse({ error: 'Not found' }, 404);
    } catch (err) {
      return jsonResponse({ error: err.message || 'Internal error' }, 500);
    }
  }
};

// ─── Summarize ──────────────────────────────────────────────────────────────

async function handleSummarize(request, env) {
  const body = await request.json();
  const { content, format, length, persona, customInstructions, translateTo } = body;

  if (!content || content.length < 10) {
    return jsonResponse({ error: 'Content too short to summarize' }, 400);
  }

  const userKey = request.headers.get('X-Fleavi-Key');
  if (userKey) {
    return await callGroq(userKey, buildPrompt(content, format, length, persona, customInstructions, translateTo));
  }

  const clientId = request.headers.get('X-Fleavi-Client') || request.headers.get('cf-connecting-ip') || 'unknown';
  const rateCheck = await checkRateLimit(clientId, env);
  if (!rateCheck.allowed) {
    return jsonResponse({ error: `Free daily limit reached (${env.FREE_DAILY_LIMIT || 20}/day). Add your own key for unlimited.`, limitReached: true }, 429);
  }

  const proxyKey = env.GROQ_API_KEY;
  if (!proxyKey) return jsonResponse({ error: 'Service not configured.' }, 503);

  const result = await callGroq(proxyKey, buildPrompt(content, format, length, persona, customInstructions, translateTo));
  await incrementUsage(clientId, env);

  return jsonResponse({ ...result, usage: { remaining: rateCheck.remaining - 1, limit: parseInt(env.FREE_DAILY_LIMIT || '20'), resetsAt: rateCheck.resetsAt } });
}

// ─── Chat ───────────────────────────────────────────────────────────────────

async function handleChat(request, env) {
  const body = await request.json();
  const { history, pageContent } = body;
  if (!history || history.length === 0) return jsonResponse({ error: 'No chat history' }, 400);

  const userKey = request.headers.get('X-Fleavi-Key');
  if (userKey) return await callGroqChat(userKey, history, pageContent);

  const clientId = request.headers.get('X-Fleavi-Client') || request.headers.get('cf-connecting-ip') || 'unknown';
  const rateCheck = await checkRateLimit(clientId, env);
  if (!rateCheck.allowed) return jsonResponse({ error: 'Free daily limit reached.', limitReached: true }, 429);

  const proxyKey = env.GROQ_API_KEY;
  if (!proxyKey) return jsonResponse({ error: 'Service not configured.' }, 503);

  const result = await callGroqChat(proxyKey, history, pageContent);
  await incrementUsage(clientId, env);
  return jsonResponse({ ...result, usage: { remaining: rateCheck.remaining - 1, limit: parseInt(env.FREE_DAILY_LIMIT || '20') } });
}

// ─── Usage ──────────────────────────────────────────────────────────────────

async function handleUsage(request, env) {
  const clientId = request.headers.get('X-Fleavi-Client') || request.headers.get('cf-connecting-ip') || 'unknown';
  const used = await getUsage(clientId, env);
  const limit = parseInt(env.FREE_DAILY_LIMIT || '20');
  return jsonResponse({ used, limit, remaining: Math.max(0, limit - used), resetsAt: getTomorrowMidnight() });
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────

function getTodayKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}`;
}

function getTomorrowMidnight() {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + 1);
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}

async function getUsage(clientId, env) {
  if (!env.RATE_LIMITS) return 0;
  const val = await env.RATE_LIMITS.get(`usage:${clientId}:${getTodayKey()}`);
  return val ? parseInt(val) : 0;
}

async function checkRateLimit(clientId, env) {
  const limit = parseInt(env.FREE_DAILY_LIMIT || '20');
  const used = await getUsage(clientId, env);
  return { allowed: used < limit, remaining: Math.max(0, limit - used), resetsAt: getTomorrowMidnight() };
}

async function incrementUsage(clientId, env) {
  if (!env.RATE_LIMITS) return;
  const key = `usage:${clientId}:${getTodayKey()}`;
  const current = await env.RATE_LIMITS.get(key);
  await env.RATE_LIMITS.put(key, String((current ? parseInt(current) : 0) + 1), { expirationTtl: 172800 });
}

// ─── Prompt Builder ─────────────────────────────────────────────────────────

function buildPrompt(content, format, length, persona, customInstructions, translateTo) {
  const lengthGuide = { short: '1-2 sentences', medium: '1 paragraph with 3-5 key points', detailed: 'Full structured breakdown' };

  let system = `You are Fleavi, an expert web page summarizer. Be concise, factual, never fabricate.
SOURCE CITATIONS: After each key point, add [source: N] where N is the paragraph index from the content.
Available formats: bullets, prose, structured, mindmap.`;

  const personaPrompts = {
    default: 'Write in a clear, neutral tone.',
    eli5: 'Explain using simple language a 10-year-old could understand. Use analogies.',
    executive: 'Executive briefing. Lead with bottom line. End with "Next Steps:". Under 200 words.',
    academic: 'Formal academic prose. Use precise terminology and hedged language.',
    sales: 'Frame through a sales lens. Highlight value propositions and ROI.',
    casual: 'Friendly, conversational tone like explaining to a friend.'
  };

  if (persona === 'custom' && customInstructions) {
    system += `\n\nTONE/STYLE:\n${customInstructions}`;
  } else if (personaPrompts[persona]) {
    system += `\n\nTONE/STYLE:\n${personaPrompts[persona]}`;
  }

  let user;
  if (translateTo && translateTo !== 'en') {
    const langs = { es:'Spanish', fr:'French', de:'German', ja:'Japanese', ko:'Korean', zh:'Chinese', ar:'Arabic', hi:'Hindi', ru:'Russian', pt:'Portuguese', it:'Italian', nl:'Dutch' };
    user = `Translate and summarize into ${langs[translateTo] || translateTo}. Format: ${format || 'bullets'}. Length: ${lengthGuide[length] || lengthGuide.medium}.\n\nContent:\n${content.slice(0, 12000)}`;
  } else {
    user = `Summarize the following webpage content.\nFormat: ${format || 'bullets'}\nLength: ${lengthGuide[length] || lengthGuide.medium}\n\nContent:\n${content.slice(0, 12000)}`;
  }

  return { system, user };
}

// ─── Groq API Calls ─────────────────────────────────────────────────────────

async function callGroq(apiKey, { system, user }) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: 1024, temperature: 0.3 })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Groq API error: ${response.status}`);
  }
  const data = await response.json();
  return { summary: data.choices[0].message.content };
}

async function callGroqChat(apiKey, history, pageContent) {
  const systemMsg = `You are Fleavi's AI assistant. Answer questions about the webpage accurately. Use [source: N] markers.\n\nPage content:\n${(pageContent || '').slice(0, 10000)}`;
  const messages = [
    { role: 'system', content: systemMsg },
    ...history.map(m => ({ role: m.role === 'error' ? 'user' : m.role, content: m.content }))
  ];
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: 512, temperature: 0.5 })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Groq API error: ${response.status}`);
  }
  const data = await response.json();
  return { reply: data.choices[0].message.content };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
}
