import { OCR_PROMPT } from './prompt.js';

export const DEFAULT_MODELS = {
  claude: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash'
};

function stripDataUrlPrefix(dataUrl) {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

function parseJsonLoose(text) {
  // 移除可能的 markdown code fence
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // 嘗試找出第一個 { 到最後一個 }
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first >= 0 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw new Error('AI 回傳內容無法解析為 JSON: ' + text);
  }
}

async function callClaude(imageDataUrl, apiKey, model) {
  const base64 = stripDataUrlPrefix(imageDataUrl);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODELS.claude,
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
          { type: 'text', text: OCR_PROMPT }
        ]
      }]
    })
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  return parseJsonLoose(text);
}

async function callOpenAI(imageDataUrl, apiKey, model) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODELS.openai,
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: OCR_PROMPT },
          { type: 'image_url', image_url: { url: imageDataUrl } }
        ]
      }]
    })
  });
  if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return parseJsonLoose(text);
}

async function callGemini(imageDataUrl, apiKey, model) {
  const base64 = stripDataUrlPrefix(imageDataUrl);
  const m = model || DEFAULT_MODELS.gemini;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: OCR_PROMPT },
          { inline_data: { mime_type: 'image/png', data: base64 } }
        ]
      }]
    })
  });
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parseJsonLoose(text);
}

export async function recognizeWord(imageDataUrl, settings) {
  const { provider, apiKey, model } = settings;
  if (!apiKey) throw new Error('尚未設定 API Key，請到設定頁填入。');
  switch (provider) {
    case 'claude': return callClaude(imageDataUrl, apiKey, model);
    case 'openai': return callOpenAI(imageDataUrl, apiKey, model);
    case 'gemini': return callGemini(imageDataUrl, apiKey, model);
    default: throw new Error('未知的 AI provider: ' + provider);
  }
}
