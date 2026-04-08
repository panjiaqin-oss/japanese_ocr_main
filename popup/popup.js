document.getElementById('open-list').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('wordlist/wordlist.html') });
});
document.getElementById('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
