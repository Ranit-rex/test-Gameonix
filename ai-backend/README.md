# Playovia AI backend (Render)

## Render settings
- Runtime: Node
- Root Directory: `ai-backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Add Environment Variable: `GEMINI_API_KEY` = your Gemini API key
- Optional: `GEMINI_MODEL` = `gemini-2.5-flash`

After deploy, test `https://YOUR-SERVICE.onrender.com/health`.
The frontend should send POST requests to `https://YOUR-SERVICE.onrender.com/api/chat`.

The API key is read only from the Render environment and is never sent to the browser.
