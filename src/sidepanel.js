import { getSettings, saveSettings, getHistory, deleteHistoryItem, getReadLaterList, removeFromReadLater, addToReadLater } from './utils/storage.js';
import { renderMarkdown, timeAgo } from './utils/helpers.js';
import { getPersonaList } from './utils/personas.js';
import { getLanguageList } from './utils/translator.js';
import { checkProxyUsage } from './utils/summarizer.js';

// State
let activeTab = 'summary';
let currentFormat = 'bullets';
let currentLength = 'medium';
let currentPersona = 'default';
let translateTo = '';
let summary = '';
let chatHistory = [];
let pageContent = '';
let isLoading = false;
let historyData = [];
let readLaterData = [];
let proxyUsage = null;

// Init
document.addEventListener('DOMContentLoaded', async () => {
  const settings = await getSettings();
  currentFormat = settings.summaryFormat;
  currentLength = settings.summaryLength;
  currentPersona = settings.persona || 'default';
  translateTo = settings.translateTo || '';

  if (settings.darkMode) {
    document.body.setAttribute('data-theme', 'dark');
  }

  historyData = await getHistory();
  readLaterData = await getReadLaterList();

  // Check proxy usage if no API key set
  if (!settings.apiKey) {
    proxyUsage = await checkProxyUsage();
  }

  renderSidePanel();
  setupEventListeners();
  await fetchPageContent();
});

async function fetchPageContent() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_CONTENT' }, (response) => {
    if (response?.content) {
      pageContent = response.content;
    }
  });
}

function renderSidePanel() {
  const root = document.getElementById('sidepanel-root');
  root.innerHTML = `
    <div class="header">
      <div class="header-left">
        <div class="logo">F</div>
        <h1>Fleavi</h1>
      </div>
      <div class="header-actions">
        <button class="icon-btn" id="btn-read-later" title="Read Later">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
          </svg>
        </button>
        <button class="icon-btn" id="btn-theme" title="Toggle theme">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
        </button>
        <button class="icon-btn" id="btn-settings" title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab ${activeTab === 'summary' ? 'active' : ''}" data-tab="summary">Summary</button>
      <button class="tab ${activeTab === 'chat' ? 'active' : ''}" data-tab="chat">Chat</button>
      <button class="tab ${activeTab === 'readlater' ? 'active' : ''}" data-tab="readlater">Read Later</button>
      <button class="tab ${activeTab === 'history' ? 'active' : ''}" data-tab="history">History</button>
    </div>

    <div class="main-content">
      ${activeTab === 'summary' ? renderSummaryTab() : ''}
      ${activeTab === 'chat' ? renderChatTab() : ''}
      ${activeTab === 'readlater' ? renderReadLaterTab() : ''}
      ${activeTab === 'history' ? renderHistoryTab() : ''}
    </div>
  `;
}

function renderSummaryTab() {
  const personas = getPersonaList();
  const languages = getLanguageList();

  return `
    <div class="summary-view">
      ${proxyUsage ? `
        <div class="usage-banner ${proxyUsage.remaining <= 5 ? 'warning' : ''}">
          <span>${proxyUsage.remaining}/${proxyUsage.limit} free summaries left today</span>
          ${proxyUsage.remaining <= 5 ? '<a class="usage-upgrade" href="#">Get unlimited</a>' : ''}
        </div>
      ` : ''}
      <!-- Persona Selector -->
      <div class="persona-bar">
        <label class="persona-label">Persona</label>
        <div class="persona-chips">
          ${personas.map(p => `
            <button class="persona-chip ${currentPersona === p.id ? 'active' : ''}" data-persona="${p.id}" title="${p.description}">
              <span class="persona-icon">${p.icon}</span>
              <span class="persona-name">${p.name}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Format & Length -->
      <div class="controls">
        <div class="format-chips-group">
          <button class="format-chip ${currentFormat === 'bullets' ? 'active' : ''}" data-format="bullets">Bullets</button>
          <button class="format-chip ${currentFormat === 'prose' ? 'active' : ''}" data-format="prose">Prose</button>
          <button class="format-chip ${currentFormat === 'structured' ? 'active' : ''}" data-format="structured">Structured</button>
          <button class="format-chip ${currentFormat === 'mindmap' ? 'active' : ''}" data-format="mindmap">Mind Map</button>
        </div>
      </div>

      <div class="length-selector">
        <button class="length-btn ${currentLength === 'short' ? 'active' : ''}" data-length="short">Short</button>
        <button class="length-btn ${currentLength === 'medium' ? 'active' : ''}" data-length="medium">Medium</button>
        <button class="length-btn ${currentLength === 'detailed' ? 'active' : ''}" data-length="detailed">Detailed</button>
      </div>

      <!-- Translation Toggle -->
      <div class="translate-bar">
        <label class="translate-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
          </svg>
          Translate to
        </label>
        <select class="translate-select" id="translate-select">
          <option value="">None (English)</option>
          ${languages.filter(l => l.code !== 'en').map(l => `
            <option value="${l.code}" ${translateTo === l.code ? 'selected' : ''}>${l.name}</option>
          `).join('')}
        </select>
      </div>

      <button class="btn-summarize" id="btn-summarize">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        Summarize This Page
      </button>

      <div class="summary-output ${summary ? '' : 'empty'}" id="summary-output">
        ${summary
          ? `<div class="summary-content">${renderMarkdown(summary)}</div>`
          : `<div class="empty-icon">&#9998;</div><div class="empty-text">Click above to summarize</div>`
        }
      </div>

      ${summary ? `
        <div class="export-bar">
          <button class="export-btn" id="btn-copy">Copy</button>
          <button class="export-btn" id="btn-copy-md">Markdown</button>
          <button class="export-btn" id="btn-notion">Notion</button>
          <button class="export-btn" id="btn-obsidian">Obsidian</button>
          <button class="export-btn" id="btn-readwise">Readwise</button>
          <button class="export-btn" id="btn-kindle">Kindle</button>
        </div>
      ` : ''}
    </div>
  `;
}

function renderChatTab() {
  const messagesHtml = chatHistory.length === 0
    ? `<div class="chat-empty">
        <div class="chat-empty-icon">&#128172;</div>
        <div class="chat-empty-text">Ask anything about this page</div>
        <div class="chat-empty-hint">The AI has read the full page content</div>
        <div class="chat-suggestions">
          <button class="chat-suggestion" data-q="What is the main argument?">Main argument?</button>
          <button class="chat-suggestion" data-q="Summarize the key findings">Key findings</button>
          <button class="chat-suggestion" data-q="What are the limitations?">Limitations?</button>
        </div>
      </div>`
    : chatHistory.map(m => `
        <div class="message ${m.role}">${m.role === 'user' ? escapeHtml(m.content) : renderMarkdown(m.content)}</div>
      `).join('');

  return `
    <div class="chat-view">
      <div class="chat-messages" id="chat-messages">${messagesHtml}</div>
      <div class="chat-input-area">
        <textarea class="chat-input" id="chat-input" placeholder="Ask about this page..." rows="1"></textarea>
        <button class="chat-send" id="btn-send" title="Send message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function renderReadLaterTab() {
  if (readLaterData.length === 0) {
    return `
      <div class="readlater-view">
        <div class="readlater-empty">
          <div class="empty-icon">&#128278;</div>
          <div class="empty-text">No saved articles</div>
          <div class="empty-hint">Right-click any page and select "Save to Read Later"</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="readlater-view">
      <div class="readlater-header">
        <span class="readlater-count">${readLaterData.length} articles</span>
        <button class="readlater-action" id="btn-digest-all">Summarize All</button>
      </div>
      ${readLaterData.map(item => `
        <div class="readlater-item" data-url="${escapeHtml(item.url)}">
          <div class="readlater-item-title">${escapeHtml(item.title)}</div>
          <div class="readlater-item-url">${escapeHtml(item.url?.slice(0, 60))}</div>
          <div class="readlater-item-meta">
            <span class="readlater-item-time">${timeAgo(item.addedAt)}</span>
            <button class="readlater-item-remove" data-id="${item.id}">&times;</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderHistoryTab() {
  if (historyData.length === 0) {
    return `
      <div class="history-view">
        <div class="history-empty">
          <div class="empty-icon">&#128218;</div>
          <div class="empty-text">No summaries yet</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="history-view">
      ${historyData.map(item => `
        <div class="history-item ${item.isDigest ? 'digest' : ''}" data-id="${item.id}">
          ${item.isDigest ? '<span class="history-badge">Digest</span>' : ''}
          <div class="history-item-title">${escapeHtml(item.title)}</div>
          <div class="history-item-url">${escapeHtml(item.url?.slice(0, 60))}</div>
          <div class="history-item-meta">
            <span class="history-item-time">${timeAgo(item.timestamp)}</span>
            <button class="history-item-delete" data-id="${item.id}">Delete</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      renderSidePanel();
      setupEventListeners();
    });
  });

  // Theme toggle
  document.getElementById('btn-theme')?.addEventListener('click', async () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.body.removeAttribute('data-theme');
    } else {
      document.body.setAttribute('data-theme', 'dark');
    }
    await saveSettings({ darkMode: !isDark });
    showToast(isDark ? 'Light mode' : 'Dark mode');
  });

  // Settings
  document.getElementById('btn-settings')?.addEventListener('click', () => {
    openSettingsModal();
  });

  // Read Later button in header
  document.getElementById('btn-read-later')?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await addToReadLater({ url: tab.url, title: tab.title });
    readLaterData = await getReadLaterList();
    showToast('Saved to Read Later');
  });

  // Persona chips
  document.querySelectorAll('.persona-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      currentPersona = chip.dataset.persona;
      saveSettings({ persona: currentPersona });
      document.querySelectorAll('.persona-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  // Format chips
  document.querySelectorAll('.format-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      currentFormat = chip.dataset.format;
      saveSettings({ summaryFormat: currentFormat });
      document.querySelectorAll('.format-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  // Length buttons
  document.querySelectorAll('.length-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentLength = btn.dataset.length;
      saveSettings({ summaryLength: currentLength });
      document.querySelectorAll('.length-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Translation select
  document.getElementById('translate-select')?.addEventListener('change', (e) => {
    translateTo = e.target.value;
    saveSettings({ translateTo });
  });

  // Summarize
  document.getElementById('btn-summarize')?.addEventListener('click', handleSummarize);

  // Chat send
  document.getElementById('btn-send')?.addEventListener('click', handleChatSend);
  document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  });

  // Chat suggestions
  document.querySelectorAll('.chat-suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = btn.dataset.q;
        handleChatSend();
      }
    });
  });

  // Export buttons
  bindExportButtons();

  // Source citation clicks
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('source-link')) {
      const sourceIndex = parseInt(e.target.dataset.source, 10);
      if (!isNaN(sourceIndex)) {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
          chrome.tabs.sendMessage(tab.id, { type: 'HIGHLIGHT_SOURCE', index: sourceIndex });
        });
      }
    }
  });

  // History items
  document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('history-item-delete')) return;
      const found = historyData.find(h => h.id === item.dataset.id);
      if (found) {
        summary = found.summary;
        activeTab = 'summary';
        renderSidePanel();
        setupEventListeners();
      }
    });
  });

  document.querySelectorAll('.history-item-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteHistoryItem(btn.dataset.id);
      historyData = await getHistory();
      renderSidePanel();
      setupEventListeners();
    });
  });

  // Read Later items
  document.querySelectorAll('.readlater-item-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await removeFromReadLater(btn.dataset.id);
      readLaterData = await getReadLaterList();
      renderSidePanel();
      setupEventListeners();
    });
  });

  // Auto-resize chat input
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });
  }
}

async function handleSummarize() {
  const btn = document.getElementById('btn-summarize');
  const output = document.getElementById('summary-output');

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div> Analyzing...';

  output.className = 'summary-output';
  output.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <span class="loading-text">Extracting key information...</span>
    </div>
  `;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.runtime.sendMessage({
    type: 'SUMMARIZE_PAGE',
    tabId: tab.id,
    format: currentFormat,
    length: currentLength,
    persona: currentPersona,
    translateTo
  }, (response) => {
    // Update usage banner if proxy returned usage info
    if (response?.usage) {
      proxyUsage = { remaining: response.usage.remaining, limit: response.usage.limit };
      const banner = document.querySelector('.usage-banner');
      if (banner) {
        banner.className = `usage-banner ${proxyUsage.remaining <= 5 ? 'warning' : ''}`;
        banner.querySelector('span').textContent = `${proxyUsage.remaining}/${proxyUsage.limit} free summaries left today`;
      }
    }

    if (response?.error) {
      output.innerHTML = `<div style="color:var(--error);padding:12px;font-size:13px;">${escapeHtml(response.error)}</div>`;
    } else if (response?.summary) {
      summary = response.summary;
      output.innerHTML = `<div class="summary-content">${renderMarkdown(summary)}</div>`;

      if (!document.querySelector('.export-bar')) {
        const view = document.querySelector('.summary-view');
        const exportBar = document.createElement('div');
        exportBar.className = 'export-bar';
        exportBar.innerHTML = `
          <button class="export-btn" id="btn-copy">Copy</button>
          <button class="export-btn" id="btn-copy-md">Markdown</button>
          <button class="export-btn" id="btn-notion">Notion</button>
          <button class="export-btn" id="btn-obsidian">Obsidian</button>
          <button class="export-btn" id="btn-readwise">Readwise</button>
          <button class="export-btn" id="btn-kindle">Kindle</button>
        `;
        view.appendChild(exportBar);
        bindExportButtons();
      }
    }

    btn.disabled = false;
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      Summarize This Page
    `;
  });
}

async function handleChatSend() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message || isLoading) return;

  chatHistory.push({ role: 'user', content: message });
  input.value = '';
  input.style.height = 'auto';

  const messagesEl = document.getElementById('chat-messages');
  const emptyState = messagesEl.querySelector('.chat-empty');
  if (emptyState) emptyState.remove();

  const userEl = document.createElement('div');
  userEl.className = 'message user';
  userEl.textContent = message;
  messagesEl.appendChild(userEl);

  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message assistant';
  loadingDiv.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div>';
  messagesEl.appendChild(loadingDiv);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  isLoading = true;

  chrome.runtime.sendMessage({
    type: 'CHAT_MESSAGE',
    history: chatHistory,
    pageContent
  }, (response) => {
    isLoading = false;
    loadingDiv.remove();

    if (response?.error) {
      chatHistory.push({ role: 'error', content: response.error });
      const errEl = document.createElement('div');
      errEl.className = 'message error';
      errEl.textContent = response.error;
      messagesEl.appendChild(errEl);
    } else if (response?.reply) {
      chatHistory.push({ role: 'assistant', content: response.reply });
      const replyEl = document.createElement('div');
      replyEl.className = 'message assistant';
      replyEl.innerHTML = renderMarkdown(response.reply);
      messagesEl.appendChild(replyEl);
    }

    messagesEl.scrollTop = messagesEl.scrollHeight;
    input.focus();
  });
}

function bindExportButtons() {
  document.getElementById('btn-copy')?.addEventListener('click', () => {
    navigator.clipboard.writeText(summary);
    showToast('Copied to clipboard');
  });

  document.getElementById('btn-copy-md')?.addEventListener('click', () => {
    navigator.clipboard.writeText(summary);
    showToast('Markdown copied');
  });

  document.getElementById('btn-notion')?.addEventListener('click', async () => {
    const settings = await getSettings();
    if (!settings.notionApiKey) {
      showToast('Add Notion API key in Settings');
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const { exportToNotion } = await import('./utils/exports.js');
    const result = await exportToNotion(summary, tab.title, tab.url, settings.notionApiKey);
    if (result.error) showToast(result.error);
    else showToast('Exported to Notion');
  });

  document.getElementById('btn-obsidian')?.addEventListener('click', async () => {
    const settings = await getSettings();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const { exportToObsidian } = await import('./utils/exports.js');
    const uri = exportToObsidian(summary, tab.title, settings.obsidianVault);
    window.open(uri, '_blank');
    showToast('Opening Obsidian...');
  });

  document.getElementById('btn-readwise')?.addEventListener('click', async () => {
    const settings = await getSettings();
    if (!settings.readwiseApiKey) {
      showToast('Add Readwise API key in Settings');
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const { exportToReadwise } = await import('./utils/exports.js');
    const result = await exportToReadwise(summary, tab.title, tab.url, settings.readwiseApiKey);
    if (result.error) showToast(result.error);
    else showToast('Exported to Readwise');
  });

  document.getElementById('btn-kindle')?.addEventListener('click', async () => {
    const settings = await getSettings();
    if (!settings.kindleEmail) {
      showToast('Add Kindle email in Settings');
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const { exportToKindle } = await import('./utils/exports.js');
    const result = exportToKindle(summary, tab.title, settings.kindleEmail);
    if (result.error) showToast(result.error);
    else window.open(result.mailto, '_blank');
  });
}

function openSettingsModal() {
  const modal = document.createElement('div');
  modal.id = 'settings-modal';
  modal.className = 'modal-overlay';

  getSettings().then(settings => {
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Settings</h3>
          <button class="modal-close" id="settings-close">&times;</button>
        </div>

        <div class="modal-section">
          <h4>AI Provider</h4>
          ${!settings.apiKey ? `
            <div class="modal-info">
              <strong>Free tier active</strong> — ${proxyUsage ? `${proxyUsage.remaining}/${proxyUsage.limit} summaries left today` : 'Using Fleavi proxy'}
            </div>
          ` : ''}
          <label>Provider</label>
          <select id="settings-provider">
            <option value="openai" ${settings.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
            <option value="anthropic" ${settings.provider === 'anthropic' ? 'selected' : ''}>Anthropic</option>
          </select>
          <label>API Key <span class="label-hint">(optional — leave empty for free tier)</span></label>
          <input id="settings-apikey" type="password" value="${settings.apiKey || ''}" placeholder="sk-... (optional)" />
          <p class="modal-note">Add your own key for unlimited use. Free tier: 20/day without a key.</p>
        </div>

        <div class="modal-section">
          <h4>Custom Persona</h4>
          <label>Custom Instructions (when "Custom" persona is selected)</label>
          <textarea id="settings-custom-persona" rows="3" placeholder="e.g., Write as a skeptical reviewer...">${settings.customPersonaInstructions || ''}</textarea>
        </div>

        <div class="modal-section">
          <h4>Export Integrations</h4>
          <label>Notion API Key</label>
          <input id="settings-notion" type="password" value="${settings.notionApiKey || ''}" placeholder="secret_..." />
          <label>Obsidian Vault Name</label>
          <input id="settings-obsidian" type="text" value="${settings.obsidianVault || ''}" placeholder="MyVault" />
          <label>Readwise API Token</label>
          <input id="settings-readwise" type="password" value="${settings.readwiseApiKey || ''}" placeholder="..." />
          <label>Kindle Email</label>
          <input id="settings-kindle" type="email" value="${settings.kindleEmail || ''}" placeholder="your-kindle@kindle.com" />
        </div>

        <div class="modal-section">
          <h4>Daily Digest</h4>
          <label class="toggle-label">
            <input type="checkbox" id="settings-digest" ${settings.digestEnabled ? 'checked' : ''} />
            Enable daily digest at
          </label>
          <input type="time" id="settings-digest-time" value="${settings.digestTime || '20:00'}" />
        </div>

        <div class="modal-actions">
          <button id="settings-save" class="btn-save">Save</button>
          <button id="settings-cancel" class="btn-cancel">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#settings-close').addEventListener('click', () => modal.remove());
    modal.querySelector('#settings-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    modal.querySelector('#settings-save').addEventListener('click', async () => {
      await saveSettings({
        provider: modal.querySelector('#settings-provider').value,
        apiKey: modal.querySelector('#settings-apikey').value,
        customPersonaInstructions: modal.querySelector('#settings-custom-persona').value,
        notionApiKey: modal.querySelector('#settings-notion').value,
        obsidianVault: modal.querySelector('#settings-obsidian').value,
        readwiseApiKey: modal.querySelector('#settings-readwise').value,
        kindleEmail: modal.querySelector('#settings-kindle').value,
        digestEnabled: modal.querySelector('#settings-digest').checked,
        digestTime: modal.querySelector('#settings-digest-time').value
      });
      modal.remove();
      showToast('Settings saved');
    });
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%);
    background: #2D3436; color: white; padding: 8px 16px; border-radius: 6px;
    font-size: 12px; font-weight: 500; z-index: 1000; opacity: 0;
    transition: opacity 0.2s ease;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, 1800);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
