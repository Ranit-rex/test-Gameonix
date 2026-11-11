// Playovia Gemini AI proxy — deploy this file as a Cloudflare Worker.
// In Worker Settings > Variables and Secrets, add GEMINI_API_KEY as a SECRET.
// Never paste the Gemini key into this file or the website.
// Then replace PLAYOVIA_AI_ENDPOINT in index.html with the deployed Worker URL.
const ALLOWED_ORIGIN = "https://ranit-rex.github.io";

function cors(origin) {
  const allowed = origin === ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed ? ALLOWED_ORIGIN : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin"
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = cors(origin);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...headers, "Access-Control-Max-Age": "86400" } });
    }
    const json = (body, status = 200) => new Response(JSON.stringify(body), {
      status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
    if (origin !== ALLOWED_ORIGIN) return json({ error: "Origin not allowed." }, 403);
    if (request.method !== "POST") return json({ error: "Use POST." }, 405);
    if (!env.GEMINI_API_KEY) return json({ error: "Gemini API secret is not configured on the Worker." }, 503);

    try {
      const body = await request.json();
      const message = String(body.message || "").trim().slice(0, 1200);
      if (!message) return json({ error: "Please enter a message." }, 400);
      const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
      const games = Array.isArray(body.games) ? body.games.slice(0, 100) : [];
      const safeHistory = history.map(item => ({
        role: item.role === "model" ? "model" : "user",
        parts: [{ text: String(item.text || "").slice(0, 1800) }]
      })).filter(item => item.parts[0].text);

      const gameContext = games.length
        ? "\n\nPLAYOVIA GAME CATALOG (recommend only titles from this list when suggesting games):\n" +
          games.map(g => "- " + String(g.title || "Untitled").slice(0, 100) +
            " | " + String(g.category || "Uncategorized").slice(0, 60) +
            " | " + String(g.description || "").slice(0, 220)).join("\n")
        : "";

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(env.GEMINI_API_KEY),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text:
              "You are Playovia AI, a friendly gaming assistant inside the Playovia gaming website. " +
              "Reply in the same language and style as the user (including Hinglish). Be concise, useful and warm. " +
              "Help discover games, explain Playovia features, and give gaming tips. Do not claim to perform actions " +
              "on the website. Never ask for passwords, API keys, or private credentials. When recommending Playovia games, " +
              "use the supplied catalog and do not invent titles. If the catalog does not contain a suitable game, say so."
            }] },
            contents: [...safeHistory, { role: "user", parts: [{ text: message + gameContext }] }],
            generationConfig: { temperature: 0.75, maxOutputTokens: 700 }
          })
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = data?.error?.message || "Gemini request failed.";
        return json({ error: detail.slice(0, 350) }, response.status === 429 ? 429 : 502);
      }
      const reply = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
      if (!reply) return json({ error: "Gemini returned an empty response. Try again." }, 502);
      return json({ reply });
    } catch (error) {
      return json({ error: error?.message || "Unexpected Worker error." }, 500);
    }
  }
};
