// Fleavi Backend Proxy — Cloudflare Worker
// Handles AI summarization with rate limiting for free tier users

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Fleavi-Client, X-Fleavi-Key',
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/summarize') {
        return await handleSummarize(request, env);
      }
      if (url.pathname === '/api/chat') {
        return await handleChat(request, env);
      }
      if (url.pathname === '/api/usage') {
        return await handleUsage(request, env);
      }
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

  // Check if user sent their own API key (BYO — bypass rate limits)
  const userKey = request.headers.get('X-Fleavi-Key');
  if (userKey) {
    return await callOpenAI(userKey, buildSummarizePrompt(content, format, length, persona, customInstructions, translateTo));
  }

  // Free tier: rate limit check
  const clientId = request.headers.get('X-Fleavi-Client') || request.headers.get('cf-connecting-ip') || 'unknown';
  const rateCheck = await checkRateLimit(clientId, env);
  if (!rateCheck.allowed) {
    return jsonResponse({
      error: `Free daily limit reached (${env.FREE_DAILY_LIMIT || 20}/day). Add your own API key in settings for unlimited use.`,
      limitReached: true,
      remaining: rateCheck.remaining,
      resetsAt: rateCheck.resetsAt
    }, 429);
  }

  // Use proxy API key
  const proxyKey = env.OPENAI_API_KEY;
  if (!proxyKey) {
    return jsonResponse({ error: 'Service not configured. Please add your own API key in Settings.' }, 503);
  }

  const result = await callOpenAI(proxyKey, buildSummarizePrompt(content, format, length, persona, customInstructions, translateTo));

  // Increment usage
  await incrementUsage(clientId, env);

  return jsonResponse({
    ...result,
    usage: {
      remaining: rateCheck.remaining - 1,
      limit: parseInt(env.FREE_DAILY_LIMIT || '20'),
      resetsAt: rateCheck.resetsAt
    }
  });
}

// ─── Chat ───────────────────────────────────────────────────────────────────

async function handleChat(request, env) {
  const body = await request.json();
  const { history, pageContent } = body;

  if (!history || history.length === 0) {
    return jsonResponse({ error: 'No chat history provided' }, 400);
  }

  // Check BYO key
  const userKey = request.headers.get('X-Fleavi-Key');
  if (userKey) {
    return await callOpenAIChat(userKey, history, pageContent);
  }

  // Free tier rate limit
  const clientId = request.headers.get('X-Fleavi-Client') || request.headers.get('cf-connecting-ip') || 'unknown';
  const rateCheck = await checkRateLimit(clientId, env);
  if (!rateCheck.allowed) {
    return jsonResponse({
      error: `Free daily limit reached. Add your own API key for unlimited.`,
      limitReached: true
    }, 429);
  }

  const proxyKey = env.OPENAI_API_KEY;
  if (!proxyKey) {
    return jsonResponse({ error: 'Service not configured.' }, 503);
  }

  const result = await callOpenAIChat(proxyKey, history, pageContent);
  await incrementUsage(clientId, env);

  return jsonResponse({
    ...result,
    usage: { remaining: rateCheck.remaining - 1, limit: parseInt(env.FREE_DAILY_LIMIT || '20') }
  });
}

// ─── Usage Check ────────────────────────────────────────────────────────────

async function handleUsage(request, env) {
  const clientId = request.headers.get('X-Fleavi-Client') || request.headers.get('cf-connecting-ip') || 'unknown';
  const usage = await getUsage(clientId, env);

  return jsonResponse({
    used: usage,
    limit: parseInt(env.FREE_DAILY_LIMIT || '20'),
    remaining: Math.max(0, parseInt(env.FREE_DAILY_LIMIT || '20') - usage),
    resetsAt: getTomorrowMidnight()
  });
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
  if (!env.RATE_LIMITS) return 0; // No KV — skip rate limiting
  const key = `usage:${clientId}:${getTodayKey()}`;
  const val = await env.RATE_LIMITS.get(key);
  return val ? parseInt(val) : 0;
}

async function checkRateLimit(clientId, env) {
  const limit = parseInt(env.FREE_DAILY_LIMIT || '20');
  const used = await getUsage(clientId, env);

  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    resetsAt: getTomorrowMidnight()
  };
}

async function incrementUsage(clientId, env) {
  if (!env.RATE_LIMITS) return;
  const key = `usage:${clientId}:${getTodayKey()}`;
  const current = await env.RATE_LIMITS.get(key);
  const newVal = (current ? parseInt(current) : 0) + 1;
  // TTL: 48 hours (2 days) — auto-cleanup
  await env.RATE_LIMITS.put(key, String(newVal), { expirationTtl: 172800 });
}

// ─── OpenAI Calls ───────────────────────────────────────────────────────────

function buildSummarizePrompt(content, format, length, persona, customInstructions, translateTo) {
  const lengthGuide = {
    short: '1-2 sentences',
    medium: '1 paragraph with 3-5 key points',
    detailed: 'Full structured breakdown with all major points'
  };

  let systemPrompt = `You are Fleavi, an expert web page summarizer. Given webpage content, produce a clear, accurate summary.

Rules:
- Be concise and factual
- Use the requested format
- Never fabricate information not present in the source
- For research papers: identify methodology, key findings, and conclusions
- For articles: capture the main argument and supporting points
- For blog posts: distill actionable insights

SOURCE CITATIONS (CRITICAL):
After each key point, add a citation marker: [source: N] where N is the paragraph index.
Example: "- Remote work increased by 40% [source: 2]"
Only cite points that directly correspond to a specific paragraph.`;

  const personaPrompts = {
    default: 'Write in a clear, neutral tone. Balance brevity with completeness.',
    eli5: 'Explain everything using simple language a 10-year-old could understand. Use everyday analogies. Avoid jargon.',
    executive: 'Write as an executive briefing. Lead with the bottom line. Use bullet points for decisions and action items. Keep under 200 words. End with "Next Steps:".'
  };

  if (persona === 'custom' && customInstructions) {
    systemPrompt += `\n\nTONE/STYLE:\n${customInstructions}`;
  } else if (personaPrompts[persona]) {
    systemPrompt += `\n\nTONE/STYLE:\n${personaPrompts[persona]}`;
  }

  if (translateTo && translateTo !== 'en') {
    const langNames = { es:'Spanish', fr:'French', de:'German', ja:'Japanese', ko:'Korean', zh:'Chinese', ar:'Arabic', hi:'Hindi', ru:'Russian', pt:'Portuguese', it:'Italian', nl:'Dutch' };
    const langName = langNames[translateTo] || translateTo;
    return {
      system: systemPrompt,
      user: `Translate and summarize the following into ${langName}. Format: ${format || 'bullets'}. Length: ${lengthGuide[length] || lengthGuide.medium}.\n\nContent:\n${content.slice(0, 12000)}`
    };
  }

  return {
    system: systemPrompt,
    user: `Summarize the following webpage content.\nFormat: ${format || 'bullets'}\nLength: ${lengthGuide[length] || lengthGuide.medium}\n\nContent:\n${content.slice(0, 12000)}`
  };
}

async function callOpenAI(apiKey, { system, user }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      max_tokens: 1024,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return { summary: data.choices[0].message.content };
}

async function callOpenAIChat(apiKey, history, pageContent) {
  const systemMessage = `You are Fleavi's AI assistant. You have been given the content of a webpage and its summary. Answer the user's questions accurately and concisely. If the answer is not in the page content, say so. Cite specific parts using [source: N] markers.\n\nPage content:\n${(pageContent || '').slice(0, 10000)}`;

  const messages = [
    { role: 'system', content: systemMessage },
    ...history.map(m => ({ role: m.role === 'error' ? 'user' : m.role, content: m.content }))
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 512,
      temperature: 0.5
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return { reply: data.choices[0].message.content };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}
