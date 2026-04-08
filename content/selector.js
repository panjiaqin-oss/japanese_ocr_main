(() => {
  if (window.__jpOcrSelectorLoaded) return;
  window.__jpOcrSelectorLoaded = true;

  let overlay, box, startX, startY, screenshot;

  function cleanup() {
    if (overlay) {
      overlay.remove();
      overlay = null;
      box = null;
    }
    document.removeEventListener('keydown', onKey, true);
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cleanup();
    }
  }

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'jp-ocr-overlay';
    box = document.createElement('div');
    box.className = 'jp-ocr-box';
    box.style.display = 'none';
    overlay.appendChild(box);

    const hint = document.createElement('div');
    hint.className = 'jp-ocr-hint';
    hint.textContent = '拖曳框選日文單字，按 Esc 取消';
    overlay.appendChild(hint);

    document.documentElement.appendChild(overlay);

    overlay.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
  }

  function onDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    box.style.display = 'block';
    box.style.left = startX + 'px';
    box.style.top = startY + 'px';
    box.style.width = '0px';
    box.style.height = '0px';
    overlay.addEventListener('mousemove', onMove);
    overlay.addEventListener('mouseup', onUp, { once: true });
  }

  function onMove(e) {
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    box.style.left = x + 'px';
    box.style.top = y + 'px';
    box.style.width = w + 'px';
    box.style.height = h + 'px';
  }

  async function onUp(e) {
    overlay.removeEventListener('mousemove', onMove);
    const rect = {
      x: Math.min(e.clientX, startX),
      y: Math.min(e.clientY, startY),
      w: Math.abs(e.clientX - startX),
      h: Math.abs(e.clientY - startY)
    };
    const shot = screenshot;
    cleanup();
    if (rect.w < 5 || rect.h < 5) return;
    try {
      const cropped = await cropImage(shot, rect);
      window.__jpOcrShowLoading?.(rect);
      const resp = await chrome.runtime.sendMessage({
        type: 'RECOGNIZE_CROP',
        imageDataUrl: cropped
      });
      if (resp?.ok) {
        window.__jpOcrShowResult?.(rect, resp.result);
      } else {
        window.__jpOcrShowError?.(rect, resp?.error || '辨識失敗');
      }
    } catch (err) {
      window.__jpOcrShowError?.(rect, err.message || String(err));
    }
  }

  function cropImage(dataUrl, rect) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const dpr = window.devicePixelRatio || 1;
        const canvas = document.createElement('canvas');
        canvas.width = rect.w * dpr;
        canvas.height = rect.h * dpr;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(
          img,
          rect.x * dpr, rect.y * dpr, rect.w * dpr, rect.h * dpr,
          0, 0, rect.w * dpr, rect.h * dpr
        );
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'START_SELECTION') {
      screenshot = msg.screenshot;
      if (overlay) cleanup();
      buildOverlay();
    }
  });
})();
