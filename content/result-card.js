(() => {
  if (window.__jpOcrCardLoaded) return;
  window.__jpOcrCardLoaded = true;

  let currentCard = null;

  function removeCard() {
    if (currentCard) { currentCard.remove(); currentCard = null; }
  }

  function buildCard(rect) {
    removeCard();
    const card = document.createElement('div');
    card.className = 'jp-ocr-card';
    const top = Math.min(window.innerHeight - 250, rect.y + rect.h + 8);
    const left = Math.min(window.innerWidth - 340, Math.max(8, rect.x));
    card.style.top = top + 'px';
    card.style.left = left + 'px';
    document.documentElement.appendChild(card);
    currentCard = card;
    return card;
  }

  window.__jpOcrShowLoading = (rect) => {
    const card = buildCard(rect);
    card.innerHTML = `<div class="jp-ocr-card-loading">辨識中…</div>`;
  };

  window.__jpOcrShowError = (rect, msg) => {
    const card = buildCard(rect);
    card.innerHTML = `
      <div class="jp-ocr-card-header">
        <span class="jp-ocr-card-title">錯誤</span>
        <button class="jp-ocr-card-close">×</button>
      </div>
      <div class="jp-ocr-card-error"></div>
    `;
    card.querySelector('.jp-ocr-card-error').textContent = msg;
    card.querySelector('.jp-ocr-card-close').onclick = removeCard;
  };

  window.__jpOcrShowResult = (rect, r) => {
    const card = buildCard(rect);
    card.innerHTML = `
      <div class="jp-ocr-card-header">
        <span class="jp-ocr-card-word"></span>
        <button class="jp-ocr-card-close">×</button>
      </div>
      <div class="jp-ocr-card-reading"></div>
      <div class="jp-ocr-card-pos"></div>
      <div class="jp-ocr-card-meaning"></div>
      <div class="jp-ocr-card-example-jp"></div>
      <div class="jp-ocr-card-example-zh"></div>
      <div class="jp-ocr-card-footer">已加入單字本</div>
    `;
    card.querySelector('.jp-ocr-card-word').textContent = r.word || '';
    card.querySelector('.jp-ocr-card-reading').textContent = r.reading ? `【${r.reading}】` : '';
    card.querySelector('.jp-ocr-card-pos').textContent = r.pos || '';
    card.querySelector('.jp-ocr-card-meaning').textContent = r.meaning_zh || '';
    card.querySelector('.jp-ocr-card-example-jp').textContent = r.example_jp || '';
    card.querySelector('.jp-ocr-card-example-zh').textContent = r.example_zh || '';
    card.querySelector('.jp-ocr-card-close').onclick = removeCard;
    setTimeout(() => {
      if (currentCard === card) document.addEventListener('click', outsideClose, { once: true, capture: true });
    }, 100);
  };

  function outsideClose(e) {
    if (currentCard && !currentCard.contains(e.target)) removeCard();
    else document.addEventListener('click', outsideClose, { once: true, capture: true });
  }
})();
