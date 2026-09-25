// Questions about a live one-time reading, proxied to DeepSeek.
//
// Spec (user, 2026-09-25): the link "has temporary access for that to my deepseek
// api ... I only have to monitor the one between rotations".
//
// So: the DeepSeek key lives ONLY in process.env here. It is never sent to the
// browser, never embedded in the link, and never written to KV. Access is gated
// on the same 10-minute session the reading itself uses, so the window closes on
// its own and there is nothing to rotate on a schedule -- one credential to watch.
//
// Same server-side-key pattern as api/query.js, which already proxies a model
// this way; this adds the session gate and points at DeepSeek.
//
// The server still cannot read her reading (the key is in the URL fragment), so
// the CLIENT sends the relevant excerpt as context. That is deliberate: it keeps
// the airlock intact and means only what she chooses to ask about leaves her
// browser.

const WINDOW_SEC = 600;
const MAX_CONTEXT = 12000;   // chars; a reading is ~72KB, do not ship all of it
const MAX_QUESTION = 1000;

function kvEnv() {
  // Vercel KV and the Upstash marketplace integration inject DIFFERENT names for
  // the same thing. Accept either so whichever the dashboard creates just works.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function kvGet(key) {
  const env = kvEnv();
  if (!env) throw new Error('KV not configured');
  const res = await fetch(`${env.url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${env.token}` },
  });
  if (!res.ok) throw new Error(`KV get failed: ${res.status}`);
  return (await res.json()).result;
}

// The guardrail the whole practice runs on: interpret what is there, never
// prophesy, never bend the chart to fit a story. Same stance as api/query.js and
// the personalized-readings principle.
const SYSTEM = [
  'You are answering questions about an astrology reading that has ALREADY been',
  'computed deterministically. The supplied excerpt is the only source of fact.',
  'Rules, without exception:',
  '- Never invent or alter a placement, aspect, orb, house or date. If the excerpt',
  '  does not contain it, say so plainly.',
  '- Interpret the present. Do not predict events, name outcomes, or say what will',
  '  happen. Point at where something may apply, in conditional language.',
  '- Do not give medical, legal, or safety advice. If the question touches personal',
  '  safety, say clearly that a reading cannot answer it and a real-world resource',
  '  is the right place.',
  '- Keep the traditional voice of the reading. Plain, warm, specific. No filler',
  '  positivity and no doom.',
].join('\n');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    // Honest failure: say it is unconfigured rather than returning a canned
    // answer that looks like a working feature.
    return res.status(503).json({ error: 'the question service is not configured' });
  }
  if (!kvEnv()) {
    return res.status(500).json({ error: 'storage not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const token = String(body.t || '').trim();
  const question = String(body.question || '').trim().slice(0, MAX_QUESTION);
  const context = String(body.context || '').slice(0, MAX_CONTEXT);

  if (!/^[0-9a-f]{32}$/.test(token)) return res.status(400).json({ error: 'bad token' });
  if (!question) return res.status(400).json({ error: 'no question' });

  // The session gate. Access to the model is exactly as long-lived as the reading.
  let rec;
  try {
    const raw = await kvGet(`reading:${token}`);
    if (!raw) return res.status(410).json({ error: 'this session has closed' });
    rec = JSON.parse(raw);
  } catch (e) {
    return res.status(500).json({ error: 'storage unavailable' });
  }
  const now = Math.floor(Date.now() / 1000);
  if (!rec.opened_at || now - rec.opened_at > WINDOW_SEC) {
    return res.status(410).json({ error: 'this session has closed' });
  }

  try {
    const r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        temperature: 0.4,
        max_tokens: 700,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Excerpt from the reading:\n${context}\n\nQuestion: ${question}` },
        ],
      }),
    });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 300);
      return res.status(502).json({ error: `model refused (${r.status})`, detail });
    }
    const j = await r.json();
    const answer = ((j.choices || [])[0] || {}).message || {};
    return res.status(200).json({
      answer: answer.content || '',
      remaining: Math.max(0, WINDOW_SEC - (now - rec.opened_at)),
    });
  } catch (e) {
    return res.status(502).json({ error: 'could not reach the model' });
  }
};
