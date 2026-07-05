import { getSettings, saveSettings, getHistory, deleteHistoryItem } from './utils/storage.js';
import { renderMarkdown, truncateText, timeAgo } from './utils/helpers.js';
import { getPersonaList } from './utils/personas.js';

// State
let currentFormat = 'bullets';
let currentLength = 'medium';
let currentPersona = 'default';
let summary = '';

// Init
document.addEventListener('DOMContentLoaded', async () => {
  const settings = await getSettings();
  currentFormat = settings.summaryFormat;
  currentLength = settings.summaryLength;
  currentPersona = settings.persona || 'default';
  renderPopup();
  setupEventListeners();
});

function renderPopup() {
  const personas = getPersonaList();
  const root = document.getElementById('popup-root');
  root.innerHTML = `
    <div class="popup-container">
      <div class="header">
        <div class="header-left">
          <div class="logo">F</div>
          <h1>Fleavi</h1>
        </div>
        <div class="header-actions">
          <button class="icon-btn" id="btn-settings" title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="quick-actions">
        <button class="btn btn-primary" id="btn-summarize">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          Summarize
        </button>
        <button class="btn btn-secondary" id="btn-chat" title="Open full side panel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          Full Panel
        </button>
      </div>

      <div class="persona-selector">
        <div class="persona-scroll">
          ${personas.map(p => `
            <button class="persona-chip ${currentPersona === p.id ? 'active' : ''}" data-persona="${p.id}" title="${p.description}">
              <span>${p.icon}</span>
              <span>${p.name}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="format-row">
        <div class="format-selector">
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

      <div class="summary-area ${summary ? '' : 'empty'}" id="summary-area">
        ${summary
          ? `<div class="summary-content">${renderMarkdown(summary)}</div>`
          : '<span>Click "Summarize" to get started</span>'
        }
      </div>

      ${summary ? `
        <div class="export-bar">
          <button class="export-btn" id="btn-copy">Copy</button>
          <button class="export-btn" id="btn-copy-md">Markdown</button>
          <button class="export-btn" id="btn-notion">Notion</button>
          <button class="export-btn" id="btn-obsidian">Obsidian</button>
        </div>
      ` : ''}

      <div class="footer">
        <span class="footer-text">Ctrl+Shift+S</span>
        <a class="footer-link" id="btn-history">History</a>
      </div>
    </div>
  `;
}

function setupEventListeners() {
  document.getElementById('btn-summarize').addEventListener('click', handleSummarize);

  document.getElementById('btn-chat').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.sidePanel.open({ tabId: tabs[0].id });
    });
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.sidePanel.open({ tabId: tabs[0].id });
    });
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

  // Export buttons
  document.getElementById('btn-copy')?.addEventListener('click', () => {
    navigator.clipboard.writeText(summary);
    showToast('Copied');
  });
  document.getElementById('btn-copy-md')?.addEventListener('click', () => {
    navigator.clipboard.writeText(summary);
    showToast('Markdown copied');
  });
  document.getElementById('btn-notion')?.addEventListener('click', () => {
    navigator.clipboard.writeText(summary);
    showToast('Open side panel for Notion export');
  });
  document.getElementById('btn-obsidian')?.addEventListener('click', () => {
    navigator.clipboard.writeText(summary);
    showToast('Open side panel for Obsidian export');
  });

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

  // History
  document.getElementById('btn-history')?.addEventListener('click', () => showHistory());
}

async function handleSummarize() {
  const btn = document.getElementById('btn-summarize');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div> Analyzing...';

  const area = document.getElementById('summary-area');
  area.className = 'summary-area';
  area.innerHTML = `
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
    persona: currentPersona
  }, (response) => {
    if (response?.error) {
      area.innerHTML = `<div class="error">${escapeHtml(response.error)}</div>`;
    } else if (response?.summary) {
      summary = response.summary;
      area.innerHTML = `<div class="summary-content">${renderMarkdown(summary)}</div>`;

      if (!document.querySelector('.export-bar')) {
        const exportBar = document.createElement('div');
        exportBar.className = 'export-bar';
        exportBar.innerHTML = `
          <button class="export-btn" id="btn-copy">Copy</button>
          <button class="export-btn" id="btn-copy-md">Markdown</button>
          <button class="export-btn" id="btn-notion">Notion</button>
          <button class="export-btn" id="btn-obsidian">Obsidian</button>
        `;
        area.parentNode.insertBefore(exportBar, area.nextSibling);
        exportBar.querySelector('#btn-copy').addEventListener('click', () => {
          navigator.clipboard.writeText(summary);
          showToast('Copied');
        });
        exportBar.querySelector('#btn-copy-md').addEventListener('click', () => {
          navigator.clipboard.writeText(summary);
          showToast('Markdown copied');
        });
        exportBar.querySelector('#btn-notion').addEventListener('click', () => {
          navigator.clipboard.writeText(summary);
          showToast('Open side panel for Notion export');
        });
        exportBar.querySelector('#btn-obsidian').addEventListener('click', () => {
          navigator.clipboard.writeText(summary);
          showToast('Open side panel for Obsidian export');
        });
      }
    }

    btn.disabled = false;
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      Summarize
    `;
  });
}

async function showHistory() {
  const history = await getHistory();
  const area = document.getElementById('summary-area');

  if (history.length === 0) {
    area.className = 'summary-area empty';
    area.innerHTML = '<span>No summaries yet</span>';
    return;
  }

  area.className = 'summary-area';
  area.innerHTML = history.slice(0, 20).map(item => `
    <div class="history-item" data-id="${item.id}">
      <div class="history-item-title">${escapeHtml(item.title)}</div>
      <div class="history-item-url">${escapeHtml(truncateText(item.url, 50))}</div>
      <div class="history-item-meta">
        <span class="history-item-time">${timeAgo(item.timestamp)}</span>
        <button class="history-item-delete" data-id="${item.id}">Delete</button>
      </div>
    </div>
  `).join('');

  area.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('history-item-delete')) return;
      summary = history.find(h => h.id === item.dataset.id)?.summary || '';
      renderPopup();
      setupEventListeners();
    });
  });

  area.querySelectorAll('.history-item-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteHistoryItem(btn.dataset.id);
      showHistory();
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
  }, 1500);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
