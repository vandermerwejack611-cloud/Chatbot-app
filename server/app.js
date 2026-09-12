const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '128kb' }));

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://vandermerwejack611-cloud.github.io';
const CLIENT_KEY = process.env.CLIENT_KEY; // optional required client token

// OpenRouter (OpenRouter.ai)
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const OPENROUTER_URL = process.env.OPENROUTER_URL || 'https://api.openrouter.ai/v1/chat/completions';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'gpt-4o-mini';

// Ollama (self-hosted or cloud)
const OLLAMA_URL = process.env.OLLAMA_URL; // e.g. http://localhost:11434
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || '';

if (!OPENROUTER_KEY && !OLLAMA_URL) {
  console.warn('Warning: Neither OPENROUTER_KEY nor OLLAMA_URL is set. Proxy will not be able to contact a provider until one is configured.');
}

// CORS
app.use(cors({ origin: ALLOWED_ORIGIN }));

// Basic rate limit
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use(limiter);

app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Helper: try to extract a textual reply from various provider response shapes
function extractReplyFromProvider(data) {
  try {
    if (!data) return '';
    // OpenAI/OpenRouter style
    if (data.choices && data.choices[0]) {
      return data.choices[0].message?.content || data.choices[0].text || '';
    }
    // OpenRouter sometimes returns output
    if (data.output && typeof data.output === 'string') return data.output;
    // Ollama newer style: results -> content -> output_text
    if (Array.isArray(data.results) && data.results[0] && Array.isArray(data.results[0].content)) {
      for (const c of data.results[0].content) {
        if (c.type === 'output_text' && c.text) return c.text;
        if (c.type === 'message' && c.text) return c.text;
      }
    }
    // Older Ollama style: result?.output
    if (data?.result && typeof data.result === 'string') return data.result;
    // fallback to first string field found
    const json = JSON.stringify(data);
    return json.slice(0, 2000);
  } catch (e) {
    return '';
  }
}

app.post('/chat', async (req, res) => {
  try {
    // Access control: require X-Client-Key header if CLIENT_KEY is set
    if (CLIENT_KEY) {
      const provided = req.header('x-client-key') || req.header('x-api-key') || req.header('authorization');
      // allow Bearer token in Authorization header as well (strip Bearer )
      let providedVal = provided;
      if (provided && typeof provided === 'string' && provided.toLowerCase().startsWith('bearer ')) {
        providedVal = provided.slice(7).trim();
      }
      if (!providedVal || providedVal !== CLIENT_KEY) {
        return res.status(403).json({ error: 'Invalid client key' });
      }
    }

    const { message, history } = req.body || {};
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Missing message' });
    if (message.length > 8000) return res.status(400).json({ error: 'Message too long' });

    // If Ollama is configured, prefer it
    if (OLLAMA_URL) {
      // Build a lightweight prompt from history + message
      const parts = [];
      if (Array.isArray(history)) {
        history.slice(-10).forEach(h => {
          const role = h.role === 'user' ? 'User' : 'Assistant';
          parts.push(`${role}: ${h.text}`);
        });
      }
      parts.push(`User: ${message}`);
      const prompt = parts.join('\n');

      // Try common Ollama endpoints. We'll attempt /api/generate, then /api/chat, then /v1/generate
      const tryPaths = ['/api/generate', '/api/chat', '/v1/generate', '/v1/chat/completions'];
      let lastError = null;
      for (const p of tryPaths) {
        const url = OLLAMA_URL.replace(/\/$/, '') + p;
        try {
          const body = { model: OLLAMA_MODEL || undefined, prompt, max_tokens: 512 };
          const providerRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          const data = await providerRes.json();
          const reply = extractReplyFromProvider(data);
          if (reply) return res.json({ reply, raw: data });
          // If no reply, continue to next path
        } catch (err) {
          lastError = err;
          // continue trying other endpoints
        }
      }
      // If we get here, Ollama attempts failed
      return res.status(502).json({ error: 'Ollama provider error', details: lastError?.message || 'no reply from Ollama' });
    }

    // Else try OpenRouter (OpenRouter.ai) if configured
    if (OPENROUTER_KEY) {
      const messages = [];
      if (Array.isArray(history)) {
        history.slice(-10).forEach(h => messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text }));
      }
      messages.push({ role: 'user', content: message });

      const payload = { model: OPENROUTER_MODEL, messages, max_tokens: 512, temperature: 0.7 };

      const providerResp = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (!providerResp.ok) {
        const text = await providerResp.text();
        return res.status(502).json({ error: 'Provider error', details: text });
      }

      const data = await providerResp.json();
      const reply = extractReplyFromProvider(data);
      return res.json({ reply, raw: data });
    }

    return res.status(500).json({ error: 'No provider configured (set OLLAMA_URL or OPENROUTER_KEY)' });
  } catch (err) {
    console.error('Proxy error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Jaxx AI proxy listening on ${PORT}`));
