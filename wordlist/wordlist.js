import { getWords, deleteWord, togglePin, sortWords } from '../lib/storage.js';

const grid = document.getElementById('grid');
const empty = document.getElementById('empty');
const count = document.getElementById('count');
const sortSel = document.getElementById('sort');

const SORT_KEY = 'wordlist_sort_mode';
sortSel.value = localStorage.getItem(SORT_KEY) || 'date';

// 隨機排序的種子快取：只有在選擇「隨機」或按下重排時才重新產生，避免每次 storage 變動就打亂
let randomCache = null;

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function render() {
  const mode = sortSel.value;
  let raw = await getWords();
  if (mode === 'random') {
    if (!randomCache) {
      randomCache = new Map(raw.map(w => [w.id, Math.random()]));
    }
    raw = raw.map(w => ({ ...w, _r: randomCache.get(w.id) ?? Math.random() }));
  }
  const words = sortWords(raw, mode);
  count.textContent = words.length;
  if (words.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  grid.innerHTML = words.map(w => `
    <div class="card ${w.pinned ? 'pinned' : ''}" data-id="${w.id}">
      <div class="word">${escape(w.word)}</div>
      <div class="reading">${w.reading ? '【' + escape(w.reading) + '】' : ''}</div>
      <div class="pos">${escape(w.pos)}</div>
      <div class="meaning">${escape(w.meaning_zh)}</div>
      <div class="example-jp">${escape(w.example_jp)}</div>
      <div class="example-zh">${escape(w.example_zh)}</div>
      <div class="actions">
        <button class="pin-btn ${w.pinned ? 'active' : ''}">${w.pinned ? '★ 已置頂' : '☆ 置頂'}</button>
        <button class="del-btn">刪除</button>
      </div>
    </div>
  `).join('');
}

grid.addEventListener('click', async (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  const id = card.dataset.id;
  if (e.target.classList.contains('pin-btn')) {
    await togglePin(id);
    render();
  } else if (e.target.classList.contains('del-btn')) {
    if (confirm('確定要刪除這個單字嗎？')) {
      await deleteWord(id);
      render();
    }
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.words) render();
});

sortSel.addEventListener('change', () => {
  localStorage.setItem(SORT_KEY, sortSel.value);
  randomCache = null; // 切換模式時重抽
  render();
});

render();
