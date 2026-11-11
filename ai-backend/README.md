# Playovia AI backend (Render)

## Render settings
- Runtime: Node
- Root Directory: `ai-backend`
- Build Command: `npm install`
- Start Command: `npm start`

## Private Render environment variables

Add API keys in Render → Environment. Never put keys in `index.html`, GitHub, or chat messages.

Configure key slots (the active slot is selected server-side):

- `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`
- `GROQ_API_KEY_1`, `GROQ_API_KEY_2`, `GROQ_API_KEY_3`
- `OPENROUTER_API_KEY_1`, `OPENROUTER_API_KEY_2`, `OPENROUTER_API_KEY_3`

Set active slots:
- `GEMINI_ACTIVE_KEY=1`
- `GROQ_ACTIVE_KEY=1`
- `OPENROUTER_ACTIVE_KEY=1`

To add future slots, add `*_API_KEY_4`, `*_API_KEY_5`, etc. and select the desired slot with the matching `*_ACTIVE_KEY` variable. The server uses only the selected slot for that provider; it does not rotate accounts to evade provider limits. Keys belonging to the same provider project generally share project-level quota.

Optional model variables:
- `GEMINI_MODEL=gemini-3.8-flash`
- `GROQ_MODEL=llama-3.3-70b-versatile`
- `OPENROUTER_MODEL=openrouter/free`

## Routing and testing
- Frontend sends requests to `/api/chat`.
- Provider selector supports Automatic, Gemini, Groq, and OpenRouter for testing.
- Automatic mode tries Gemini, then Groq, then OpenRouter when a provider is unavailable.
- Provider-specific test selection calls only the selected provider.
- API keys remain server-side and are never sent to the browser.

After deploy, test `https://YOUR-SERVICE.onrender.com/health`.
