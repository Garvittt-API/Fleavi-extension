// Background service worker — handles messaging, context menus, side panel, exports, and digests
import { summarizePage, chatWithAI } from './utils/summarizer.js';

// Note: chrome.action.onClicked does NOT fire when default_popup is set.
// The popup handles the icon click. Side panel is opened from the popup via
// chrome.sidePanel.open() or from keyboard shortcuts below.

// Context menu: summarize selected text
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'fleavi-summarize-selection',
    title: 'Summarize Selection with Fleavi',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'fleavi-add-read-later',
    title: 'Save to Fleavi Read Later',
    contexts: ['page', 'link']
  });

  // Set up daily digest alarm
  chrome.alarms.create('fleavi-digest', { periodInMinutes: 60 });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'fleavi-summarize-selection') {
    chrome.sidePanel.open({ tabId: tab.id });
    chrome.tabs.sendMessage(tab.id, {
      type: 'SUMMARIZE_SELECTION',
      selectedText: info.selectionText
    });
  }

  if (info.menuItemId === 'fleavi-add-read-later') {
    addToReadLaterFromBackground({
      url: info.linkUrl || info.pageUrl,
      title: tab.title || 'Untitled'
    });
  }
});

// Alarm handler for daily digests
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'fleavi-digest') {
    const settings = await chrome.storage.sync.get(['digestEnabled', 'digestTime', 'readLaterList']);
    if (!settings.digestEnabled) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (currentTime !== settings.digestTime) return;

    const list = settings.readLaterList || [];
    if (list.length === 0) return;

    // Generate digest summary
    const digestContent = list.map(item => `- ${item.title}: ${item.url}`).join('\n');
    const digestResult = await summarizePage(digestContent, {
      apiKey: settings.apiKey,
      provider: settings.provider,
      length: 'medium',
      format: 'bullets',
      persona: 'executive'
    });

    if (digestResult.summary) {
      // Store the digest
      const history = (await chrome.storage.local.get(['summaryHistory'])).summaryHistory || [];
      history.unshift({
        id: `digest-${Date.now()}`,
        url: 'fleavi://daily-digest',
        title: `Daily Digest — ${now.toLocaleDateString()}`,
        summary: digestResult.summary,
        timestamp: Date.now(),
        isDigest: true
      });
      await chrome.storage.local.set({ summaryHistory: history.slice(0, 100) });
    }
  }
});

// Message routing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SUMMARIZE_PAGE') {
    const tabId = message.tabId || sender.tab?.id;
    handleSummarizePage(message, tabId, sendResponse);
    return true;
  }

  if (message.type === 'CHAT_MESSAGE') {
    handleChatMessage(message, sendResponse);
    return true;
  }

  if (message.type === 'EXTRACT_PAGE_CONTENT') {
    chrome.tabs.sendMessage(message.tabId, { type: 'EXTRACT_CONTENT' }, sendResponse);
    return true;
  }

  if (message.type === 'HIGHLIGHT_SOURCE') {
    chrome.tabs.sendMessage(message.tabId, { type: 'HIGHLIGHT_SOURCE', index: message.index });
    return false;
  }

  if (message.type === 'ADD_READ_LATER') {
    addToReadLaterFromBackground(message.item).then(result => sendResponse(result));
    return true;
  }

  if (message.type === 'GET_READ_LATER') {
    chrome.storage.sync.get(['readLaterList'], (data) => {
      sendResponse(data.readLaterList || []);
    });
    return true;
  }

  if (message.type === 'REMOVE_READ_LATER') {
    chrome.storage.sync.get(['readLaterList'], async (data) => {
      const list = (data.readLaterList || []).filter(item => item.id !== message.id);
      await chrome.storage.sync.set({ readLaterList: list });
      sendResponse(list);
    });
    return true;
  }
});

async function handleSummarizePage(message, tabId, sendResponse) {
  try {
    const settings = await chrome.storage.sync.get([
      'apiKey', 'provider', 'summaryLength', 'summaryFormat',
      'persona', 'customPersonaInstructions', 'translateTo'
    ]);

    let contentResponse;
    try {
      contentResponse = await chrome.tabs.sendMessage(tabId, {
        type: 'EXTRACT_CONTENT',
        selectedText: message.selectedText
      });
    } catch (e) {
      // Content script not injected — try to inject it
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['src/content.js']
        });
        // Retry after injection
        contentResponse = await chrome.tabs.sendMessage(tabId, {
          type: 'EXTRACT_CONTENT',
          selectedText: message.selectedText
        });
      } catch (e2) {
        sendResponse({ error: 'Could not connect to page. Try refreshing the page and trying again.' });
        return;
      }
    }

    if (!contentResponse?.content) {
      sendResponse({ error: 'Could not extract page content' });
      return;
    }

    const result = await summarizePage(contentResponse.content, {
      apiKey: settings.apiKey,
      provider: settings.provider || 'openai',
      length: message.length || settings.summaryLength || 'medium',
      format: message.format || settings.summaryFormat || 'bullets',
      selectedText: message.selectedText,
      persona: message.persona || settings.persona || 'default',
      customPersonaInstructions: settings.customPersonaInstructions || '',
      translateTo: message.translateTo || settings.translateTo || ''
    });

    // Save to history
    const history = (await chrome.storage.local.get(['summaryHistory'])).summaryHistory || [];
    history.unshift({
      id: Date.now().toString(),
      url: contentResponse.url,
      title: contentResponse.title,
      summary: result.summary,
      timestamp: Date.now(),
      format: message.format || settings.summaryFormat,
      persona: message.persona || settings.persona
    });
    await chrome.storage.local.set({ summaryHistory: history.slice(0, 100) });

    sendResponse(result);
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

async function handleChatMessage(message, sendResponse) {
  try {
    const settings = await chrome.storage.sync.get(['apiKey', 'provider']);
    const result = await chatWithAI(message.history, message.pageContent, {
      apiKey: settings.apiKey,
      provider: settings.provider || 'openai'
    });
    sendResponse(result);
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

async function addToReadLaterFromBackground(item) {
  try {
    const settings = await chrome.storage.sync.get(['readLaterList']);
    const list = settings.readLaterList || [];

    // Avoid duplicates
    if (list.some(i => i.url === item.url)) {
      return { success: true, message: 'Already in Read Later' };
    }

    list.unshift({
      id: Date.now().toString(),
      url: item.url,
      title: item.title,
      addedAt: Date.now()
    });
    await chrome.storage.sync.set({ readLaterList: list.slice(0, 200) });
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

// Keyboard shortcut handler
chrome.commands.onCommand.addListener((command) => {
  if (command === 'summarize-page' || command === 'open-chat') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.sidePanel.open({ tabId: tabs[0].id });
      }
    });
  }
});
