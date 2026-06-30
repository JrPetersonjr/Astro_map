const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const url = require('url');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(__dirname, 'contexts.json');
const INDEX_DIR = path.join(__dirname, '.indexes');

function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  return JSON.parse(raw);
}

let config = loadConfig();

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', config.server?.corsOrigin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
}

function sendJson(res, statusCode, payload) {
  setCors(res);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function parseTextResponse(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (typeof data.data === 'string') return data.data;
  if (typeof data.text === 'string') return data.text;
  if (typeof data.response === 'string') return data.response;
  if (typeof data.message === 'string') return data.message;
  const llm = data?.choices?.[0]?.message?.content;
  if (typeof llm === 'string') return llm;
  const cand = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof cand === 'string') return cand;
  return '';
}

async function requestJson(endpoint, method, headers, payload) {
  const response = await fetch(endpoint, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined
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
    throw new Error(msg);
  }

  return data;
}

async function runMageBridge(prompt, skyContext, contextHints) {
  const endpoint = config.mage?.mcpUrl;
  if (!endpoint) throw new Error('Mage MCP URL is not configured');

  const headers = { 'Content-Type': 'application/json' };
  const token = config.mage?.apiKey;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['x-api-key'] = token;
  }

  const payload = {
    intent: config.mage?.intent || 'astrology-reading',
    prompt,
    skyContext: skyContext || '',
    contextHints: contextHints || []
  };

  const data = await requestJson(endpoint, 'POST', headers, payload);
  const text = parseTextResponse(data);
  return text || JSON.stringify(data);
}

async function runGgufBridge(prompt, skyContext) {
  const endpoint = config.gguf?.baseUrl;
  if (!endpoint) throw new Error('GGUF endpoint is not configured');

  const headers = { 'Content-Type': 'application/json' };
  const token = config.gguf?.apiKey;
  if (token) headers.Authorization = `Bearer ${token}`;

  const model = config.gguf?.model || 'local-model';
  const system = skyContext
    ? `You are LuminaSynodic local assistant. Use this sky context as factual grounding.\n\n${skyContext}`
    : 'You are LuminaSynodic local assistant.';

  const payload = {
    model,
    temperature: 0.78,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt }
    ]
  };

  const data = await requestJson(endpoint, 'POST', headers, payload);
  const text = parseTextResponse(data);
  return text || JSON.stringify(data);
}

async function runHomeplanetBridge(prompt, skyContext) {
  const endpoint = config.homeplanet?.endpoint;
  if (!endpoint) throw new Error('Homeplanet endpoint is not configured');

  const headers = { 'Content-Type': 'application/json' };
  const token = config.homeplanet?.apiKey;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['x-api-key'] = token;
  }

  const data = await requestJson(endpoint, 'POST', headers, { prompt, skyContext: skyContext || '' });
  const text = parseTextResponse(data);
  return text || JSON.stringify(data);
}

function shouldIndexFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return (config.indexing?.includeExtensions || []).includes(ext);
}

function shouldIgnoreDir(dirName) {
  return (config.indexing?.ignoreDirs || []).includes(dirName.toLowerCase());
}

async function walkFiles(rootDir, acc) {
  let entries;
  try {
    entries = await fsp.readdir(rootDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') && shouldIgnoreDir(entry.name)) continue;
    const full = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (shouldIgnoreDir(entry.name)) continue;
      await walkFiles(full, acc);
    } else if (entry.isFile() && shouldIndexFile(full)) {
      try {
        const stat = await fsp.stat(full);
        if (stat.size > (config.indexing?.maxFileBytes || 3_145_728)) continue;
        const content = await fsp.readFile(full, 'utf8');
        const sample = content.slice(0, 4000);
        acc.push({
          path: full.replace(/\\/g, '/'),
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          sample
        });
      } catch {
        // Skip unreadable files.
      }
    }
  }
}

async function rebuildIndexes() {
  await fsp.mkdir(INDEX_DIR, { recursive: true });
  const out = [];

  for (const group of config.contexts || []) {
    const items = [];
    for (const root of group.roots || []) {
      await walkFiles(root, items);
    }
    const record = {
      name: group.name,
      updatedAt: new Date().toISOString(),
      count: items.length,
      items
    };
    const file = path.join(INDEX_DIR, `${group.name}.json`);
    await fsp.writeFile(file, JSON.stringify(record, null, 2), 'utf8');
    out.push({ name: group.name, count: items.length, file: file.replace(/\\/g, '/') });
  }

  return out;
}

async function searchIndexes(query, scope) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];

  let files = await fsp.readdir(INDEX_DIR).catch(() => []);
  files = files.filter((f) => f.endsWith('.json'));

  const results = [];
  for (const file of files) {
    const group = file.replace(/\.json$/, '');
    if (scope && group !== scope) continue;
    try {
      const raw = await fsp.readFile(path.join(INDEX_DIR, file), 'utf8');
      const data = JSON.parse(raw);
      for (const item of data.items || []) {
        const hay = `${item.path}\n${item.sample}`.toLowerCase();
        const idx = hay.indexOf(q);
        if (idx === -1) continue;
        const start = Math.max(0, idx - 120);
        const end = Math.min(hay.length, idx + 220);
        results.push({
          scope: group,
          path: item.path,
          preview: item.sample.slice(start, end).replace(/\s+/g, ' ')
        });
        if (results.length >= 120) return results;
      }
    } catch {
      // Skip broken index.
    }
  }

  return results;
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webmanifest': return 'application/manifest+json; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

async function serveStatic(reqPath, res) {
  const cleanPath = reqPath === '/' ? '/index.html' : reqPath;
  const fsPath = path.join(ROOT, decodeURIComponent(cleanPath));
  const normalized = path.normalize(fsPath);
  if (!normalized.startsWith(ROOT)) {
    sendJson(res, 403, { error: 'Forbidden path' });
    return;
  }

  try {
    const stat = await fsp.stat(normalized);
    if (!stat.isFile()) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }
    setCors(res);
    res.statusCode = 200;
    res.setHeader('Content-Type', contentTypeFor(normalized));
    fs.createReadStream(normalized).pipe(res);
  } catch {
    sendJson(res, 404, { error: 'Not found' });
  }
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

  if (req.method === 'OPTIONS') {
    setCors(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  if (parsed.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      runtime: 'luminasynodic-standalone',
      host: config.server?.host || '127.0.0.1',
      port: config.server?.port || 8787
    });
    return;
  }

  if (parsed.pathname === '/local/config/reload' && req.method === 'POST') {
    try {
      config = loadConfig();
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Failed to reload config' });
    }
    return;
  }

  if (parsed.pathname === '/local/context/reindex' && req.method === 'POST') {
    try {
      const indexed = await rebuildIndexes();
      sendJson(res, 200, { ok: true, indexed });
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Failed to rebuild indexes' });
    }
    return;
  }

  if (parsed.pathname === '/local/context/search' && req.method === 'GET') {
    try {
      const query = parsed.query.q || '';
      const scope = parsed.query.scope || '';
      const results = await searchIndexes(query, scope);
      sendJson(res, 200, { ok: true, results });
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Failed to search indexes' });
    }
    return;
  }

  if (parsed.pathname === '/local/bridge' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const provider = String(body.provider || 'mage-local').toLowerCase();
      const prompt = body.prompt;
      const skyContext = body.skyContext || '';
      const contextHints = body.contextHints || [];

      if (!prompt || typeof prompt !== 'string') {
        sendJson(res, 400, { error: 'Missing prompt' });
        return;
      }

      let data;
      if (provider === 'mage-local' || provider === 'mage') {
        data = await runMageBridge(prompt, skyContext, contextHints);
      } else if (provider === 'gguf-local' || provider === 'gguf') {
        data = await runGgufBridge(prompt, skyContext);
      } else if (provider === 'homeplanet-local' || provider === 'homeplanet') {
        data = await runHomeplanetBridge(prompt, skyContext);
      } else {
        sendJson(res, 400, { error: `Unsupported provider: ${provider}` });
        return;
      }

      sendJson(res, 200, { ok: true, provider, data });
    } catch (error) {
      sendJson(res, 502, { error: error.message || 'Bridge failure' });
    }
    return;
  }

  await serveStatic(parsed.pathname || '/', res);
});

const host = config.server?.host || '127.0.0.1';
const port = Number(config.server?.port || 8787);
server.listen(port, host, () => {
  console.log(`LuminaSynodic standalone runtime listening on http://${host}:${port}`);
  console.log('Tip: open http://127.0.0.1:8787/index.html?standalone=1');
});
