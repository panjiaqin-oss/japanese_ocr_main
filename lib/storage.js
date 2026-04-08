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

function compareByMode(a, b, mode) {
  if (mode === 'alpha') {
    // 以讀音為主要排序鍵（更符合日文字母順），fallback 到 word
    const ka = (a.reading || a.word || '');
    const kb = (b.reading || b.word || '');
    return ka.localeCompare(kb, 'ja');
  }
  if (mode === 'random') {
    return (a._r ?? 0) - (b._r ?? 0);
  }
  // default: date desc
  return b.createdAt - a.createdAt;
}

export function sortWords(words, mode = 'date') {
  let list = words;
  if (mode === 'random') {
    list = words.map(w => ({ ...w, _r: Math.random() }));
  }
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return compareByMode(a, b, mode);
  });
}
