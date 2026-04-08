const WORDS_KEY = 'words';
const SETTINGS_KEY = 'settings';

export async function getSettings() {
  const { [SETTINGS_KEY]: s } = await chrome.storage.local.get(SETTINGS_KEY);
  return s || { provider: 'claude', apiKey: '', model: '' };
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function getWords() {
  const { [WORDS_KEY]: w } = await chrome.storage.local.get(WORDS_KEY);
  return w || [];
}

export async function addWord(entry) {
  const words = await getWords();
  const id = crypto.randomUUID();
  words.unshift({ id, pinned: false, createdAt: Date.now(), ...entry });
  await chrome.storage.local.set({ [WORDS_KEY]: words });
  return id;
}

export async function deleteWord(id) {
  const words = (await getWords()).filter(w => w.id !== id);
  await chrome.storage.local.set({ [WORDS_KEY]: words });
}

export async function togglePin(id) {
  const words = await getWords();
  const w = words.find(x => x.id === id);
  if (w) w.pinned = !w.pinned;
  await chrome.storage.local.set({ [WORDS_KEY]: words });
}

export function sortWords(words) {
  return [...words].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt - a.createdAt;
  });
}
