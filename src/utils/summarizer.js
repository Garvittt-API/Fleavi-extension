import { getPersonaPrompt } from './personas.js';
import { buildTranslationPrompt } from './translator.js';

// Proxy URL — set to your deployed Cloudflare Worker
// Leave empty to use direct API calls only
const PROXY_URL = 'https://fleavi-proxy.garvitchoudhary2315.workers.dev';

const SUMMARIZE_SYSTEM_PROMPT = `You are Fleavi, an expert web page summarizer. Given the content of a webpage, produce a clear, accurate summary.

Rules:
- Be concise and factual
- Use the requested format (bullets, prose, structured, or mindmap)
- Never fabricate information not present in the source
- For research papers: identify methodology, key findings, and conclusions
- For articles: capture the main argument and supporting points
- For blog posts: distill actionable insights

SOURCE CITATIONS (CRITICAL):
After each key point, add a citation marker pointing to the source paragraph number.
Format: [source: N] where N is the paragraph index from the content (the number in square brackets before each paragraph).
Example: "- Remote work increased by 40% since 2023 [source: 2]"
Only cite points that directly correspond to a specific paragraph. Do not fabricate source numbers.

Available formats:
- "bullets": Key points as a bulleted list
- "prose": Executive summary paragraph
- "structured": Structured breakdown with headings and sub-points
- "mindmap": Nested bullet hierarchy showing topic relationships`;

const CHAT_SYSTEM_PROMPT = `You are Fleavi's AI assistant. You have been given the content of a webpage and its summary. Answer the user's questions about this page accurately and concisely. If the answer is not in the page content, say so. Cite specific parts of the text when possible using [source: N] markers.`;

export async function summarizePage(content, options) {
  const { apiKey, provider, length, format, selectedText, persona, customPersonaInstructions, translateTo } = options;

  const personaPrompt = getPersonaPrompt(persona || 'default', customPersonaInstructions || '');

  // Try proxy first if no user API key
  if (!apiKey && PROXY_URL) {
    return await proxySummarize({
      content,
      format,
      length,
      persona,
      customInstructions: personaPrompt,
      translateTo
    });
  }

  if (!apiKey) {
    return { error: 'No API key configured. Open Fleavi settings to add one, or check your internet connection.' };
  }

  const lengthGuide = {
    short: '1-2 sentences',
    medium: '1 paragraph with 3-5 key points',
    detailed: 'Full structured breakdown with all major points'
  };

  let systemPrompt = SUMMARIZE_SYSTEM_PROMPT;
  if (personaPrompt) {
    systemPrompt += `\n\nTONE/STYLE:\n${personaPrompt}`;
  }

  let userPrompt;

  if (translateTo && translateTo !== 'en') {
    userPrompt = buildTranslationPrompt(content, translateTo);
    userPrompt += `\n\nFormat: ${format}\nLength: ${lengthGuide[length] || lengthGuide.medium}`;
  } else {
    userPrompt = `Summarize the following ${selectedText ? 'selected text' : 'webpage content'}.
Format: ${format}
Length: ${lengthGuide[length] || lengthGuide.medium}

Content:
${content.slice(0, 12000)}`;
  }

  try {
    let summary;

    if (provider === 'anthropic') {
      summary = await callAnthropic(apiKey, systemPrompt, userPrompt);
    } else {
      summary = await callOpenAI(apiKey, systemPrompt, userPrompt);
    }

    return { summary };
  } catch (err) {
    return { error: `Summarization failed: ${err.message}` };
  }
}

export async function chatWithAI(history, pageContent, options) {
  const { apiKey, provider } = options;

  // Try proxy first if no user API key
  if (!apiKey && PROXY_URL) {
    return await proxyChat({ history, pageContent });
  }

  if (!apiKey) {
    return { error: 'No API key configured.' };
  }

  const messages = [
    { role: 'system', content: `${CHAT_SYSTEM_PROMPT}\n\nPage content:\n${pageContent.slice(0, 10000)}` },
    ...history.map(m => ({ role: m.role === 'error' ? 'user' : m.role, content: m.content }))
  ];

  try {
    let reply;

    if (provider === 'anthropic') {
      reply = await callAnthropic(apiKey, messages[0].content, messages.slice(1));
    } else {
      reply = await callOpenAIChat(apiKey, messages);
    }

    return { reply };
  } catch (err) {
    return { error: `Chat failed: ${err.message}` };
  }
}

// ─── Proxy Calls ────────────────────────────────────────────────────────────

async function proxySummarize(payload) {
  const clientId = await getClientId();

  const response = await fetch(`${PROXY_URL}/api/summarize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Fleavi-Client': clientId
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    return { error: data.error || `Proxy error: ${response.status}`, usage: data.usage };
  }

  return { summary: data.summary, usage: data.usage };
}

async function proxyChat(payload) {
  const clientId = await getClientId();

  const response = await fetch(`${PROXY_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Fleavi-Client': clientId
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    return { error: data.error || `Proxy error: ${response.status}` };
  }

  return { reply: data.reply, usage: data.usage };
}

export async function checkProxyUsage() {
  if (!PROXY_URL) return null;

  try {
    const clientId = await getClientId();
    const response = await fetch(`${PROXY_URL}/api/usage`, {
      headers: { 'X-Fleavi-Client': clientId }
    });
    return await response.json();
  } catch {
    return null;
  }
}

// Generate a stable client ID for rate limiting
async function getClientId() {
  const stored = await chrome.storage.local.get('fleaviClientId');
  if (stored.fleaviClientId) return stored.fleaviClientId;

  const id = crypto.randomUUID();
  await chrome.storage.local.set({ fleaviClientId: id });
  return id;
}

// ─── Direct API Calls ───────────────────────────────────────────────────────

async function callOpenAI(apiKey, systemPrompt, userPrompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
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
  return data.choices[0].message.content;
}

async function callOpenAIChat(apiKey, messages) {
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
  return data.choices[0].message.content;
}

async function callAnthropic(apiKey, systemPrompt, userMessages) {
  const messages = Array.isArray(userMessages) ? userMessages : [{ role: 'user', content: userMessages }];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}
