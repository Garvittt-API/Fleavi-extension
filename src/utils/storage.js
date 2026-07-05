// Storage utilities for settings and history
const DEFAULTS = {
  provider: 'openai',
  apiKey: '',
  summaryFormat: 'bullets',
  summaryLength: 'medium',
  darkMode: false,
  sidePanelWidth: 380,
  kindleEmail: '',
  // Persona settings
  persona: 'default',
  customPersonaInstructions: '',
  // Translation
  translateTo: '',
  // Export API keys
  notionApiKey: '',
  obsidianVault: '',
  readwiseApiKey: '',
  // Daily digest
  digestEnabled: false,
  digestTime: '20:00',
  digestBookmarkTag: 'read-later',
  // Read-later list
  readLaterList: []
};

export async function getSettings() {
  const stored = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...stored };
}

export async function saveSettings(settings) {
  await chrome.storage.sync.set(settings);
}

export async function getHistory() {
  const { summaryHistory } = await chrome.storage.local.get('summaryHistory');
  return summaryHistory || [];
}

export async function clearHistory() {
  await chrome.storage.local.set({ summaryHistory: [] });
}

export async function deleteHistoryItem(id) {
  const history = await getHistory();
  await chrome.storage.local.set({
    summaryHistory: history.filter(item => item.id !== id)
  });
}

// Read-later list
export async function addToReadLater(item) {
  const settings = await getSettings();
  const list = settings.readLaterList || [];
  list.unshift({
    id: Date.now().toString(),
    url: item.url,
    title: item.title,
    addedAt: Date.now()
  });
  await saveSettings({ readLaterList: list.slice(0, 200) });
}

export async function removeFromReadLater(id) {
  const settings = await getSettings();
  const list = (settings.readLaterList || []).filter(item => item.id !== id);
  await saveSettings({ readLaterList: list });
}

export async function getReadLaterList() {
  const settings = await getSettings();
  return settings.readLaterList || [];
}

// Onboarding state
export async function hasCompletedOnboarding() {
  const { onboardingComplete } = await chrome.storage.local.get('onboardingComplete');
  return !!onboardingComplete;
}

export async function completeOnboarding() {
  await chrome.storage.local.set({ onboardingComplete: true });
}
