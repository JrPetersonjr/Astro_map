// One-time encrypted reading fetch.
//
// Spec (user, 2026-09-25): "one time readout ... the session ends and the key
// access ends . and it has a finite connection time of 10 minutes after opening
// link".
//
// THE SERVER NEVER SEES THE PLAINTEXT. The reading is AES-256-GCM encrypted by
// the publisher (Reader/publish_reading.py) and the key travels only in the URL
// FRAGMENT (#k=...), which browsers never transmit. So this function stores and
// serves ciphertext it cannot read, and "airlocked" is a property of the design
// rather than a promise about our conduct.
//
// Lifecycle:
//   published            -> KV key with UNOPENED_TTL, so an unused link expires
//   first GET            -> stamps opened_at and drops the TTL to WINDOW_SEC
//   GET inside window    -> serves ciphertext again (reload/refresh must work)
//   GET after window     -> deletes and returns 410
//
// Deliberately NOT single-fetch: a browser reload, an image re-request or a
// flaky connection would burn a genuinely-once token and lock the client out of
// her own reading. The 10-minute window is the limit; within it she can reload.
//
// Storage is Vercel KV over its REST API with plain fetch -- package.json has no
// dependencies and this keeps it that way.

const WINDOW_SEC = 600;              // 10 minutes from first open
const UNOPENED_TTL = 60 * 60 * 24 * 7;  // an unopened link lasts a week

function kvEnv() {
  // Vercel KV and the Upstash marketplace integration inject DIFFERENT names for
  // the same thing. Accept either so whichever the dashboard creates just works.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function kv(cmd) {
  const env = kvEnv();
  if (!env) throw new Error('KV not configured');
  const res = await fetch(`${env.url}/${cmd.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${env.token}` },
  });
  if (!res.ok) throw new Error(`KV ${cmd[0]} failed: ${res.status}`);
  const j = await res.json();
  return j.result;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!kvEnv()) {
    return res.status(500).json({ error: 'storage not configured' });
  }
  const token = String((req.query && req.query.t) || '').trim();
  // Tokens are 32 hex from the publisher; refuse anything else rather than
  // letting arbitrary strings become KV lookups.
  if (!/^[0-9a-f]{32}$/.test(token)) {
    return res.status(400).json({ error: 'bad token' });
  }
  const key = `reading:${token}`;

  let raw;
  try {
    raw = await kv(['get', key]);
  } catch (e) {
    return res.status(500).json({ error: 'storage unavailable' });
  }
  if (!raw) {
    // Expired, consumed, or never existed -- deliberately the same answer, so a
    // probe cannot distinguish "wrong token" from "already gone".
    return res.status(404).json({ error: 'this reading is no longer available' });
  }

  let rec;
  try { rec = JSON.parse(raw); } catch (e) {
    return res.status(500).json({ error: 'stored record unreadable' });
  }

  const now = Math.floor(Date.now() / 1000);
  if (!rec.opened_at) {
    rec.opened_at = now;
    try {
      await kv(['set', key, JSON.stringify(rec), 'EX', String(WINDOW_SEC)]);
    } catch (e) {
      return res.status(500).json({ error: 'could not start the session' });
    }
  } else if (now - rec.opened_at > WINDOW_SEC) {
    try { await kv(['del', key]); } catch (e) { /* expiring anyway */ }
    return res.status(410).json({ error: 'this reading has closed' });
  }

  const remaining = Math.max(0, WINDOW_SEC - (now - rec.opened_at));
  return res.status(200).json({
    ct: rec.ct,            // base64 AES-256-GCM ciphertext (+tag)
    iv: rec.iv,            // base64 96-bit nonce
    remaining,             // seconds left in this session
    window: WINDOW_SEC,
    // No key field. There is no key here to send.
  });
};
