import { recognizeWord } from '../lib/ai-providers.js';
import { getSettings, addWord } from '../lib/storage.js';

const MENU_ID = 'start-japanese-ocr';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: '選取日文單字 (OCR)',
    contexts: ['page', 'selection', 'image']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && tab?.id) startOcr(tab);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'start-ocr') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) startOcr(tab);
  }
});

async function startOcr(tab) {
  try {
    // 確保 content script 已注入（處理舊頁面情況）
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/selector.js', 'content/result-card.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content/selector.css', 'content/result-card.css']
      });
    } catch (_) { /* 已注入則忽略 */ }

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    await chrome.tabs.sendMessage(tab.id, { type: 'START_SELECTION', screenshot: dataUrl });
  } catch (e) {
    console.error('[japanese_ocr] startOcr failed', e);
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'RECOGNIZE_CROP') {
    (async () => {
      try {
        const settings = await getSettings();
        const result = await recognizeWord(msg.imageDataUrl, settings);
        if (result.error) {
          sendResponse({ ok: false, error: result.error });
          return;
        }
        await addWord(result);
        sendResponse({ ok: true, result });
      } catch (e) {
        sendResponse({ ok: false, error: e.message || String(e) });
      }
    })();
    return true; // async
  }
});
