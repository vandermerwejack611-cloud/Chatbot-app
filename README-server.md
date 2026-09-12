Ollama integration

If you'd like to use Ollama (self-hosted or Ollama Cloud) with Jaxx AI, configure the proxy with these environment variables:

- OLLAMA_URL — base URL of your Ollama HTTP API (e.g., http://localhost:11434)
- OLLAMA_MODEL — the model name you installed in Ollama (optional; some endpoints accept model param)

The proxy will attempt common Ollama endpoints (/api/generate, /api/chat, /v1/generate) and extract textual replies from the response. If Ollama is not configured, the proxy falls back to OpenRouter (OPENROUTER_KEY).

Notes
- When using Ollama locally, run the Express proxy on the same machine or on a host that can reach Ollama.
- Ollama's HTTP API shapes change between versions; if you run into parsing issues please provide an example response and I will adjust the parsing logic.
