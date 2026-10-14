function parseTextResponse(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (typeof data.data === 'string') return data.data;
  if (typeof data.text === 'string') return data.text;
  if (typeof data.response === 'string') return data.response;
  if (typeof data.message === 'string') return data.message;

  const firstChoiceText = data?.choices?.[0]?.message?.content;
  if (typeof firstChoiceText === 'string') return firstChoiceText;

  const firstCandidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof firstCandidateText === 'string') return firstCandidateText;

  return '';
}

async function callGemini(prompt, skyContext, apiKey) {
  if (!apiKey) {
    throw new Error('Gemini key is missing. Set LUMINA or QUERY_API_KEY.');
  }

  const systemPrompt = typeof skyContext === 'string' && skyContext
    ? `You are a skilled sky interpreter. Use this sky data as ground truth and write a concise interpretation.\n\n${skyContext}`
    : 'You are a skilled sky interpreter. Respond with concise, grounded astrological context.';

  const model = process.env.QUERY_MODEL || 'gemini-2.5-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 900, temperature: 0.82 }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error(`Gemini ${response.status}: ${msg}`);
  }

  const text = parseTextResponse(data);
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

async function callBridgeProvider(provider, prompt, skyContext, body) {
  // SSRF guard: the upstream URL and token are ONLY ever taken from server env,
  // never from the request body. A caller must not be able to make this function
  // fetch an arbitrary host (bridgeEndpoint) or attach a chosen token
  // (bridgeApiKey). Those fields are intentionally ignored.
  const endpoint =
    (provider === 'vedastro' ? process.env.VEDASTRO_MCP_URL : process.env.KERYKEION_API_URL);

  if (!endpoint) {
    throw new Error(`No endpoint configured for provider "${provider}".`);
  }

  const token =
    (provider === 'vedastro' ? (process.env.VEDASTRO_MCP_TOKEN || process.env.VEDASTRO_API_KEY) : process.env.KERYKEION_API_KEY);

  const payload = provider === 'vedastro'
    ? (body.mcpPayload || {
        prompt,
        skyContext: skyContext || '',
        intent: 'interpret-current-sky'
      })
    : (body.kerykeionPayload || {
        prompt,
        skyContext: skyContext || ''
      });

  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['x-api-key'] = token;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { text: raw };
  }

  if (!response.ok) {
    const msg = parseTextResponse(data) || raw || `HTTP ${response.status}`;
    throw new Error(`${provider} ${response.status}: ${msg}`);
  }

  const text = parseTextResponse(data);
  if (!text) {
    // Return structured payload as string when provider does not send plain text.
    return JSON.stringify(data);
  }

  return text;
}

// Only let the site's own pages spend the model keys. Browser fetches from the
// real origin carry Origin/Referer; off-site scripts and bare curl/Burp do not.
// Not a substitute for a real session gate, but it stops casual quota drain.
// Configure extra origins with ALLOWED_ORIGINS (comma-separated).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://luminasynodic.vercel.app').split(',').map((s) => s.trim()).filter(Boolean);

function fromAllowedOrigin(req) {
  const origin = req.headers.origin || '';
  if (origin) return ALLOWED_ORIGINS.includes(origin);
  const ref = req.headers.referer || '';
  return Boolean(ref) && ALLOWED_ORIGINS.some((o) => ref.startsWith(o + '/') || ref === o);
}

const NOAH_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>o/ HI NOAH</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden;font-family:ui-monospace,monospace}
.flash{position:fixed;inset:0;animation:bg .45s steps(1) infinite}
@keyframes bg{0%{background:#000}25%{background:#b0003a}50%{background:#000}75%{background:#003a7a}}
.msg{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
color:#fff;text-align:center;text-shadow:0 0 14px #0ff;animation:blink .4s steps(1) infinite}
@keyframes blink{50%{opacity:.12}}h1{font-size:12vw;margin:0;letter-spacing:.08em}
p{font-size:3vw;margin:.3em 1em;color:#7fffd4}</style></head>
<body><div class="flash"></div><div class="msg"><h1>o/ HI NOAH</h1>
<p>Dad was here first.</p><p>SSRF is closed on this one. the model key stays home. have fun.</p></div>
<script>var on=true;setInterval(function(){document.title=(on?'>>> ':'    ')+'HI NOAH <<<';on=!on;},400);
try{if(navigator.vibrate)navigator.vibrate([200,100,200,100,200]);}catch(e){}</script></body></html>`;

function sayHiNoah(req, res) {
  res.setHeader('X-Hello-Noah', 'o/ SSRF closed on this one too. have fun. - Dad');
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

  const { provider = 'auto', prompt, skyContext } = req.body || {};

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Request must include a "prompt" string' });
  }
  if (prompt.length > 8000) {
    return res.status(413).json({ error: 'prompt too long' });
  }

  try {
    const normalizedProvider = String(provider || 'auto').toLowerCase();

    if (normalizedProvider === 'auto' || normalizedProvider === 'gemini') {
      const apiKey = process.env.LUMINA || process.env.QUERY_API_KEY;
      const text = await callGemini(prompt, skyContext, apiKey);
      return res.status(200).json({ provider: 'gemini', data: text });
    }

    if (normalizedProvider === 'vedastro' || normalizedProvider === 'kerykeion') {
      const text = await callBridgeProvider(normalizedProvider, prompt, skyContext, req.body || {});
      return res.status(200).json({ provider: normalizedProvider, data: text });
    }

    return res.status(400).json({ error: `Unsupported provider: ${normalizedProvider}` });
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Bridge request failed' });
  }
}
