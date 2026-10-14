// Only the site's own pages may spend the model key. Browser fetches from the
// real origin carry Origin/Referer; off-site scripts and bare curl/Burp do not.
// Configure extra origins with ALLOWED_ORIGINS (comma-separated).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://luminasynodic.vercel.app').split(',').map((s) => s.trim()).filter(Boolean);

function fromAllowedOrigin(req) {
  const origin = req.headers.origin || '';
  if (origin) return ALLOWED_ORIGINS.includes(origin);
  const ref = req.headers.referer || '';
  return Boolean(ref) && ALLOWED_ORIGINS.some((o) => ref.startsWith(o + '/') || ref === o);
}

// A hello for Noah. Rendered only if he opens a blocked response in a browser
// (Burp's built-in browser counts); a passive proxy just sees the source.
const NOAH_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>o/ HI NOAH</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden;font-family:ui-monospace,monospace}
.flash{position:fixed;inset:0;animation:bg .45s steps(1) infinite}
@keyframes bg{0%{background:#000}25%{background:#b0003a}50%{background:#000}75%{background:#003a7a}}
.msg{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
color:#fff;text-align:center;text-shadow:0 0 14px #0ff;animation:blink .4s steps(1) infinite}
@keyframes blink{50%{opacity:.12}}h1{font-size:12vw;margin:0;letter-spacing:.08em}
p{font-size:3vw;margin:.3em 1em;color:#7fffd4}</style></head>
<body><div class="flash"></div><div class="msg"><h1>o/ HI NOAH</h1>
<p>Dad was here first.</p><p>this endpoint is gated. the model key stays home. happy hunting.</p></div>
<script>var on=true;setInterval(function(){document.title=(on?'>>> ':'    ')+'HI NOAH <<<';on=!on;},400);
try{if(navigator.vibrate)navigator.vibrate([200,100,200,100,200]);}catch(e){}</script></body></html>`;

function sayHiNoah(req, res) {
  res.setHeader('X-Hello-Noah', 'o/ nice crawl. the model key stays home. - Dad');
  if (String(req.headers.accept || '').includes('text/html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(403).send(NOAH_HTML);
  }
  return res.status(403).json({ error: 'forbidden', hello: 'o/ hey Noah' });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!fromAllowedOrigin(req)) {
    return sayHiNoah(req, res);
  }

  const apiKey = process.env.LUMINA || process.env.QUERY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing LUMINA environment variable' });
  }

  const { prompt, skyContext } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Request must include a "prompt" string' });
  }
  if (prompt.length > 8000) {
    return res.status(413).json({ error: 'prompt too long' });
  }

  const model = process.env.QUERY_MODEL || 'gemini-2.5-flash';
  const systemPrompt = typeof skyContext === 'string' && skyContext
    ? `You are a skilled sky interpreter — equal parts astronomer, herbalist, and journal keeper. You read celestial patterns with scientific precision and speak about them with the warmth of someone who genuinely lives by the rhythms of the sky. You are not a prophet and never predict the future. You interpret the present: how the current planetary weather maps onto what someone is actually experiencing right now.

When someone shares their life with you, respond in this structure:

**Line 1 — Alignment score:** Open with exactly this format: "Alignment: X%" where X is your honest estimate (0–100) of how strongly the current sky pattern resonates with the themes in their entry. Base it on aspect strength and orb, moon phase fit, and thematic overlap. Be honest — a scattered sky gets a 40%, not an 85%.

**Body — 3 flowing paragraphs:** Write in natural, evocative prose. Weave the actual planetary positions, aspect names, orbs, and nakshatra names into the narrative the way a person speaks them — not like a data report. Lead with the 1–2 most striking resonances between the sky and their experience. Cross-reference Western and Vedic layers where they reinforce each other.

**Closing observation:** A grounded present-tense sentence about what the current sky seems to be showing — never a prediction, always an interpretation. Honest if things are mixed or contradictory.

**Dream interpretation:** If the user shares a dream, interpret it symbolically through both the current sky and archetypal/Jungian lenses. Name 2–3 key symbols and connect them to active planetary themes. You do not need to open with an Alignment score for dream entries — start with the most resonant symbol. End with a reflection question about what the dream might be processing or preparing the dreamer for.

**Reflection question:** On its own line at the very end, write one open-ended question — no label, no asterisks — that gently invites the writer to look deeper at something specific from what they shared. It should feel like a quiet prompt from a thoughtful friend, not a therapist's script.

Tone: clear, textured, a little earthy and intuitive without being precious or New Age. Think: someone who reads both scientific papers and old almanacs and takes both seriously.

Total length: 260–370 words. No bullet points. No headers after the alignment line.

Current sky data:
${skyContext}`
    : `You are a skilled sky interpreter — grounded, a little earthy, equal parts scientist and intuitive. Someone has shared something from their life. Respond with warmth and genuine insight, then end with one open-ended question that invites them to look deeper. Keep it under 220 words. No bullet points.`;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 900, temperature: 0.82 }
      })
    });
    const data = await response.json();
    if (!response.ok) {
      const msg = data?.error?.message || JSON.stringify(data);
      return res.status(502).json({ error: `Gemini ${response.status}: ${msg}` });
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(502).json({ error: 'Empty response from Gemini' });
    return res.status(200).json({ data: text });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Request failed' });
  }
}
