# Jaxx AI (Chatbot-app)

Jaxx AI is a lightweight static chat UI (client-side) that supports three modes: Echo, Rule-based, and API mode. It includes a sample OpenRouter proxy (Express + serverless function) so you can safely connect a real LLM without exposing your API keys in the browser.

Live demo
- Project Pages: https://vandermerwejack611-cloud.github.io/Chatbot-app/

What’s included
- `index.html` — Frontend (Jaxx AI): responsive UI, mobile-friendly, loading overlay, localStorage persistence, export/import, and an API mode to call a server proxy or provider.
- `server/` — Express proxy example (server/app.js, package.json, .env.example) that forwards requests to OpenRouter and protects your key with `CLIENT_KEY` + rate limiting.
- `api/chat.js` — Vercel/Netlify-compatible serverless function for the same proxy behavior.
- `README-server.md` — Instructions for deploying the proxy (see server/README for full details).

Quick start — frontend only
1. Open the live demo URL above (or open `index.html` locally in a browser).  
2. Use Echo or Rule-based modes to try the UI without any server.

Connecting to an LLM via OpenRouter (recommended)
1. Deploy the proxy (Express or serverless) and set environment variables (do NOT commit real keys):
   - `OPENROUTER_KEY` — your OpenRouter API key
   - `CLIENT_KEY` — optional client token (frontend must send this in `X-Client-Key` header)
   - `ALLOWED_ORIGIN` — optional CORS origin (your Pages URL)

2. In the Jaxx AI UI (sidebar) set:
   - API URL to `https://<your-proxy>/chat` (or the serverless function endpoint)
   - Header value field: `X-Client-Key: <your-client-token>` (or `Authorization: Bearer <token>` depending on your proxy)

3. Use Test & Detect (or Test API) to verify the proxy responds. The UI supports a detection flow for common provider shapes (OpenRouter/OpenAI/Anthropic) and will adapt how it reads replies.

Local testing (Express)
1. Copy `server/.env.example` → `server/.env` and fill `OPENROUTER_KEY` and `CLIENT_KEY`.  
2. From repository root:
   ```bash
   cd server
   npm install
   npm start
   ```
3. Test with curl:
   ```bash
   curl -X POST http://localhost:3000/chat \
     -H "Content-Type: application/json" \
     -H "x-client-key: <your-client-key>" \
     -d '{"message":"Hello"}'
   ```

Serverless (Vercel) quick deploy
1. Push the repo to GitHub.  
2. Create a Vercel project, link this repo.  
3. Add Environment Variables in Vercel: `OPENROUTER_KEY`, `CLIENT_KEY`.  
4. Deploy — the function will be available at `https://<your-vercel>.vercel.app/api/chat`.

Security notes
- Never place `OPENROUTER_KEY` in client-side code or commit it. Use environment variables on the server.  
- Use `CLIENT_KEY` + CORS (`ALLOWED_ORIGIN`) and rate limiting for basic protection. For production, add stronger auth and monitoring.

Auto-detect / Provider detection
- The frontend includes a Test & Detect mechanism that:
  - Checks the API URL pattern and tries a small test request.
  - Inspects the response shape and labels it as OpenRouter / OpenAI / Anthropic / Proxy (or Unknown).
  - Adjusts how replies are read from the response (e.g., `reply`, `choices[0].message`, `completion`, etc.).

If you want me to:
- Deploy a serverless instance (Vercel) for you, I can scaffold the Vercel project and provide exact steps.  
- Set the `CLIENT_KEY` to a specific token (e.g., `bbavjwbx`) in the example files — I will only put it in `server/.env.example` (never in runtime files).  

Files modified/added recently
- `index.html` — updated to Jaxx AI, mobile UI, loading overlay, modes, auto-detect UI changes.  
- `server/app.js`, `server/package.json`, `server/.env.example` — Express OpenRouter proxy.  
- `api/chat.js` — serverless proxy (Vercel/Netlify).  
- `README-server.md` — proxy deployment instructions.

If you want, I’ll now:
- Update the frontend to automatically send `X-Client-Key` header when you enter `CLIENT_KEY` in the sidebar header field (I recommend this so the UI and proxy agree).  
- Deploy a serverless function to Vercel if you give me the go-ahead (you’ll need to set OPENROUTER_KEY in Vercel).  

Tell me which next step you want (update frontend header behavior, set CLIENT_KEY to `bbavjwbx` in examples, or deploy to Vercel) and I’ll proceed.