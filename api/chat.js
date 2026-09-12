// Vercel / Netlify-style serverless function for OpenRouter + Ollama proxy
// Put this file in /api/chat.js and deploy via Vercel or Netlify

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const CLIENT_KEY = process.env.CLIENT_KEY;
  const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
  const OPENROUTER_URL = process.env.OPENROUTER_URL || 'https://api.openrouter.ai/v1/chat/completions';
  const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'gpt-4o-mini';
  const OLLAMA_URL = process.env.OLLAMA_URL;
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL || '';

  function extractReplyFromProvider(data) {
    if (!data) return '';
    if (data.choices && data.choices[0]) return data.choices[0].message?.content || data.choices[0].text || '';
    if (data.output && typeof data.output === 'string') return data.output;
    if (Array.isArray(data.results) && data.results[0] && Array.isArray(data.results[0].content)) {
      for (const c of data.results[0].content) {
        if (c.type === 'output_text' && c.text) return c.text;
        if (c.type === 'message' && c.text) return c.text;
      }
    }
    if (data?.result && typeof data.result === 'string') return data.result;
    return JSON.stringify(data).slice(0, 2000);
  }

  try {
    if (CLIENT_KEY) {
      const provided = req.headers['x-client-key'] || req.headers['x-api-key'] || req.headers['authorization'];
      let providedVal = provided;
      if (provided && typeof provided === 'string' && provided.toLowerCase().startsWith('bearer ')) providedVal = provided.slice(7).trim();
      if (!providedVal || providedVal !== CLIENT_KEY) return res.status(403).json({ error: 'Invalid client key' });
    }

    const { message, history } = req.body || {};
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Missing message' });

    // Ollama preferred when configured
    if (OLLAMA_URL) {
      const parts = [];
      if (Array.isArray(history)) history.slice(-10).forEach(h => parts.push(`${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`));
      parts.push(`User: ${message}`);
      const prompt = parts.join('\n');

      const tryPaths = ['/api/generate', '/api/chat', '/v1/generate', '/v1/chat/completions'];
      let lastErr = null;
      for (const p of tryPaths) {
        const url = OLLAMA_URL.replace(/\/$/, '') + p;
        try {
          const body = { model: OLLAMA_MODEL || undefined, prompt, max_tokens: 512 };
          const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          const data = await r.json();
          const reply = extractReplyFromProvider(data);
          if (reply) return res.status(200).json({ reply, raw: data });
        } catch (e) {
          lastErr = e;
        }
      }
      return res.status(502).json({ error: 'Ollama provider error', details: lastErr?.message || 'no reply from Ollama' });
    }

    // OpenRouter fallback
    if (OPENROUTER_KEY) {
      const messages = [];
      if (Array.isArray(history)) history.slice(-10).forEach(h => messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text }));
      messages.push({ role: 'user', content: message });

      const payload = { model: OPENROUTER_MODEL, messages, max_tokens: 512, temperature: 0.7 };
      const providerRes = await fetch(OPENROUTER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENROUTER_KEY}` }, body: JSON.stringify(payload) });
      if (!providerRes.ok) {
        const txt = await providerRes.text();
        return res.status(502).json({ error: 'Provider error', details: txt });
      }
      const data = await providerRes.json();
      const reply = extractReplyFromProvider(data);
      return res.status(200).json({ reply, raw: data });
    }

    return res.status(500).json({ error: 'No provider configured (set OLLAMA_URL or OPENROUTER_KEY)' });
  } catch (err) {
    console.error('Serverless proxy error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
