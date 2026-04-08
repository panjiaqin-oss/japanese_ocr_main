# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Chrome Extension (Manifest V3, vanilla JS ES modules, no build step). Users screenshot-select Japanese words on any webpage; a multimodal LLM returns word + reading + POS + Chinese meaning + example sentence in one call. Results appear as a floating card and are saved to a card-based wordlist page.

## Development
No build / lint / test tooling. To run:
1. `chrome://extensions` → Developer mode → **Load unpacked** → select repo root
2. After editing files, click the reload icon on the extension card (or use `chrome://extensions/shortcuts`). Content script changes also require reloading any open tabs.
3. Debug: service worker logs via the "service worker" link on the extensions page; content script logs in the page DevTools; popup/options/wordlist logs in their own DevTools windows.

## Architecture

### Data flow for a single OCR
`commands` shortcut or context menu → `background/service-worker.js`:
1. Ensures content scripts are injected via `chrome.scripting` (fallback for tabs opened before install).
2. `chrome.tabs.captureVisibleTab` → PNG dataURL of visible viewport.
3. `sendMessage({type: 'START_SELECTION', screenshot})` to the tab.

`content/selector.js` overlays a full-viewport mask, tracks drag rect in **CSS pixels**, then crops the screenshot on an in-page `<canvas>` using `devicePixelRatio` to map CSS → device pixels. It sends `{type: 'RECOGNIZE_CROP', imageDataUrl}` back to the service worker.

Service worker reads settings from `chrome.storage.local`, calls `lib/ai-providers.js::recognizeWord()`, persists via `lib/storage.js::addWord()`, and replies to the content script, which calls the globals `window.__jpOcrShowLoading / ShowResult / ShowError` exposed by `content/result-card.js`.

### AI provider abstraction
`lib/ai-providers.js` is the single place that knows HTTP shapes for Claude / OpenAI / Gemini. All providers share one prompt from `lib/prompt.js` that demands **strict JSON** (no markdown fences). `parseJsonLoose()` tolerates fenced output by extracting the first `{...}` block. The expected shape is:
```
{ word, reading, pos, meaning_zh, example_jp, example_zh }   // or { error }
```
`DEFAULT_MODELS` is the fallback when the user leaves the model field blank in options. The Claude call uses the `anthropic-dangerous-direct-browser-access: true` header because the request originates from an extension origin — do **not** remove this without switching to a proxy.

### Storage contract
`chrome.storage.local` holds two keys managed by `lib/storage.js`:
- `settings`: `{provider, apiKey, model}`
- `words`: array of `{id, word, reading, pos, meaning_zh, example_jp, example_zh, createdAt, pinned}`; newest unshifted to front. `sortWords()` returns pinned-first then createdAt desc — the wordlist page relies on this ordering and re-renders on `chrome.storage.onChanged`.

### Two content scripts, one flag each
`selector.js` and `result-card.js` both guard against double-injection with `window.__jpOcrSelectorLoaded` / `__jpOcrCardLoaded` because the service worker may `executeScript` them on top of the manifest auto-injection. `result-card.js` exposes its API via `window.__jpOcr*` globals rather than messages because `selector.js` calls it directly after the crop.

### Module boundaries
Service worker and the wordlist/options pages import `lib/*` as ES modules (manifest sets `"type": "module"` for the worker; HTML uses `<script type="module">`). Content scripts are classic scripts — they **cannot** use `import`, which is why `selector.js` inlines its canvas crop and talks to the background via `chrome.runtime.sendMessage` rather than importing `ai-providers.js` directly.

## Gotchas
- `captureVisibleTab` only captures the visible viewport, never the full page. Selection coordinates must stay within `window.innerWidth/innerHeight`.
- Chrome shortcut `Ctrl/Cmd+Shift+J` frequently collides with other extensions and fails silently; users rebind via `chrome://extensions/shortcuts`.
- Anthropic credits are workspace-scoped — an API key tied to a non-Default workspace returns 400 "balance too low" even when the main account has credit.
- Do not add a build step or TypeScript without discussion; the zero-tooling setup is intentional so the repo folder can be loaded directly as an unpacked extension.
