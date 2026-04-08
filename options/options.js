import { getSettings, saveSettings } from '../lib/storage.js';

const providerEl = document.getElementById('provider');
const apiKeyEl = document.getElementById('apiKey');
const modelEl = document.getElementById('model');
const statusEl = document.getElementById('status');

(async () => {
  const s = await getSettings();
  providerEl.value = s.provider || 'claude';
  apiKeyEl.value = s.apiKey || '';
  modelEl.value = s.model || '';
})();

document.getElementById('save').addEventListener('click', async () => {
  await saveSettings({
    provider: providerEl.value,
    apiKey: apiKeyEl.value.trim(),
    model: modelEl.value.trim()
  });
  statusEl.textContent = '✓ 已儲存';
  setTimeout(() => statusEl.textContent = '', 2000);
});
