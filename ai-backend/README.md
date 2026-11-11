# Playovia AI backend (Render)

## Render settings
- Runtime: Node
- Root Directory: `ai-backend`
- Build Command: `npm install`
- Start Command: `npm start`

## Private Render environment variables

Add API keys in Render → Environment. Never put keys in `index.html`, GitHub, or chat messages.

Configure key slots for each provider:

- `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`
- `GROQ_API_KEY_1`, `GROQ_API_KEY_2`, `GROQ_API_KEY_3`
- `OPENROUTER_API_KEY_1`, `OPENROUTER_API_KEY_2`, `OPENROUTER_API_KEY_3`

Set the Firebase web API key (same public `apiKey` value already used in the frontend Firebase config):
- `FIREBASE_WEB_API_KEY=...`

The temporary individual-key testing selector is shown only to the two configured Playovia admin emails. Backend requests for key slots 2 and 3 also verify the Firebase ID token against Firebase Identity Toolkit and enforce the admin email allowlist.

To add future slots, add `*_API_KEY_4`, `*_API_KEY_5`, etc. and add corresponding choices to the temporary testing selector if needed. The server uses the exact selected slot only; it does not rotate accounts to evade provider limits. Keys belonging to the same provider project generally share project-level quota.

Optional model variables:
- `GEMINI_MODEL=gemini-3.8-flash`
- `GROQ_MODEL=llama-3.3-70b-versatile`
- `OPENROUTER_MODEL=openrouter/free`

## Routing and testing
- Frontend sends requests to `/api/chat`.
- Provider selector supports Automatic and all nine configured key slots for temporary admin testing.
- Automatic mode tries Gemini, then Groq, then OpenRouter when a provider is unavailable.
- Provider-specific test selection calls only the selected provider.
- API keys remain server-side and are never sent to the browser.

After deploy, test `https://YOUR-SERVICE.onrender.com/health`.
