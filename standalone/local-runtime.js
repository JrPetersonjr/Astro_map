const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const url = require('url');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(__dirname, 'contexts.json');
const INDEX_DIR = path.join(__dirname, '.indexes');
const MAGE_STATE_PATH = path.join(__dirname, '.mage-process.json');
const DECK_DIR = path.join(ROOT, 'data', 'decks');
const LIVE_DECK_INDEX_PATH = path.join(ROOT, 'data', 'decks', 'live-index.json');
const LIVE_DECK_DIR = path.join(ROOT, 'data', 'decks', 'live');

function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  return JSON.parse(raw);
}

let config = loadConfig();
let mageProcess = null;

function getMageHttpConfig() {
  const httpCfg = config.mage?.http || {};
  return {
    model: String(httpCfg.model || 'lfm2-1.2b'),
    baseUrl: String(httpCfg.baseUrl || 'http://127.0.0.1:8081').replace(/\/+$/, ''),
    path: String(httpCfg.path || '/v1/chat/completions')
  };
}

function fileExistsSync(target) {
  try {
    return fs.existsSync(target);
  } catch {
    return false;
  }
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function saveMageState(state) {
  try {
    fs.writeFileSync(MAGE_STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // Non-fatal.
  }
}

function readMageState() {
  try {
    if (!fileExistsSync(MAGE_STATE_PATH)) return null;
    return JSON.parse(fs.readFileSync(MAGE_STATE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function detectMageLaunch() {
  const launchCfg = config.mage?.launch || {};

  // Explicit command override in config.
  if (launchCfg.command && String(launchCfg.command).trim()) {
    return {
      command: launchCfg.command,
      args: Array.isArray(launchCfg.args) ? launchCfg.args : [],
      cwd: launchCfg.cwd || ROOT,
      detectedFrom: 'contexts.json command override'
    };
  }

  const defaultRoots = [
    'H:/AIRLOCK/HomePlanetStudio',
    'H:/AIRLOCK/FlowState_Mage',
    'H:/AIRLOCK/ASTRO/LuminaSynodic'
  ];
  const roots = Array.isArray(launchCfg.roots) && launchCfg.roots.length ? launchCfg.roots : defaultRoots;

  for (const root of roots) {
    const mcpJson = path.join(root, '.mcp.json');
    if (fileExistsSync(mcpJson)) {
      try {
        const mcp = JSON.parse(fs.readFileSync(mcpJson, 'utf8'));
        const server = mcp?.mcpServers?.['mage-local'] || mcp?.mcpServers?.mage || null;
        if (server?.command) {
          return {
            command: server.command,
            args: Array.isArray(server.args) ? server.args : [],
            cwd: server.cwd || root,
            env: server.env && typeof server.env === 'object' ? server.env : null,
            detectedFrom: `${mcpJson}::mcpServers.mage-local`
          };
        }
      } catch {
        // Ignore broken MCP config and continue detection.
      }
    }

    const startPs1 = path.join(root, 'start-mage.ps1');
    const scriptsStartPs1 = path.join(root, 'scripts', 'start-mage.ps1');
    const runMagePs1 = path.join(root, 'run-mage.ps1');
    const startCmd = path.join(root, 'start-mage.cmd');
    const mageCmd = path.join(root, 'mage.cmd');
    const launchRunnerBat = path.join(root, 'Launch Mage Runner.bat');
    const startFlowstateBat = path.join(root, 'START_FLOWSTATE.bat');
    const imageGenCmd = path.join(root, 'Image Gen Server.cmd');
    const mageServerJs = path.join(root, 'mage-server.js');
    const mcpServerJs = path.join(root, 'mcp_server.js');
    const packageJson = path.join(root, 'package.json');

    if (fileExistsSync(startPs1)) {
      return {
        command: 'powershell',
        args: ['-ExecutionPolicy', 'Bypass', '-File', startPs1],
        cwd: root,
        env: null,
        detectedFrom: startPs1
      };
    }
    if (fileExistsSync(scriptsStartPs1)) {
      return {
        command: 'powershell',
        args: ['-ExecutionPolicy', 'Bypass', '-File', scriptsStartPs1],
        cwd: root,
        env: null,
        detectedFrom: scriptsStartPs1
      };
    }
    if (fileExistsSync(runMagePs1)) {
      return {
        command: 'powershell',
        args: ['-ExecutionPolicy', 'Bypass', '-File', runMagePs1],
        cwd: root,
        env: null,
        detectedFrom: runMagePs1
      };
    }
    if (fileExistsSync(startCmd)) {
      return {
        command: startCmd,
        args: [],
        cwd: root,
        env: null,
        detectedFrom: startCmd
      };
    }
    if (fileExistsSync(mageCmd)) {
      return {
        command: 'cmd',
        args: ['/c', mageCmd, 'serve', 'lfm2-1.2b'],
        cwd: root,
        env: null,
        detectedFrom: mageCmd
      };
    }
    if (fileExistsSync(launchRunnerBat)) {
      return {
        command: 'cmd',
        args: ['/c', launchRunnerBat, 'lfm2-1.2b'],
        cwd: root,
        env: null,
        detectedFrom: launchRunnerBat
      };
    }
    if (fileExistsSync(startFlowstateBat)) {
      return {
        command: 'cmd',
        args: ['/c', startFlowstateBat],
        cwd: root,
        env: null,
        detectedFrom: startFlowstateBat
      };
    }
    if (fileExistsSync(imageGenCmd)) {
      return {
        command: 'cmd',
        args: ['/c', imageGenCmd],
        cwd: root,
        env: null,
        detectedFrom: imageGenCmd
      };
    }
    if (fileExistsSync(mageServerJs)) {
      return {
        command: 'node',
        args: [mageServerJs],
        cwd: root,
        env: null,
        detectedFrom: mageServerJs
      };
    }
    if (fileExistsSync(mcpServerJs)) {
      return {
        command: 'node',
        args: [mcpServerJs],
        cwd: root,
        env: null,
        detectedFrom: mcpServerJs
      };
    }
    if (fileExistsSync(packageJson)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
        const scripts = pkg?.scripts || {};
        const preferred = ['mage', 'serve', 'start', 'dev'];
        const script = preferred.find((name) => scripts[name]);
        if (script) {
          return {
            command: 'npm',
            args: ['run', script],
            cwd: root,
            env: null,
            detectedFrom: `${packageJson}::scripts.${script}`
          };
        }
      } catch {
        // Ignore malformed package.json.
      }
    }
  }

  return null;
}

function detectMageHttpLaunch() {
  const launchCfg = config.mage?.launch || {};
  const model = getMageHttpConfig().model;

  const defaultRoots = [
    'H:/AIRLOCK/FlowState_Mage',
    'H:/AIRLOCK/HomePlanetStudio'
  ];
  const roots = Array.isArray(launchCfg.roots) && launchCfg.roots.length ? launchCfg.roots : defaultRoots;

  for (const root of roots) {
    const mageCmd = path.join(root, 'mage.cmd');
    if (fileExistsSync(mageCmd)) {
      return {
        command: 'cmd',
        args: ['/c', mageCmd, 'serve', model],
        cwd: root,
        env: null,
        mode: 'http',
        detectedFrom: `${mageCmd}::serve ${model}`
      };
    }

    const packageJson = path.join(root, 'package.json');
    if (fileExistsSync(packageJson)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
        const scripts = pkg?.scripts || {};
        const script = scripts.serve ? 'serve' : scripts.mage ? 'mage' : null;
        if (script) {
          return {
            command: 'npm',
            args: ['run', script],
            cwd: root,
            env: null,
            mode: 'http',
            detectedFrom: `${packageJson}::scripts.${script}`
          };
        }
      } catch {
        // Ignore malformed package.json.
      }
    }
  }

  return null;
}

function detectMageCliRoot() {
  const launchCfg = config.mage?.launch || {};
  const defaultRoots = [
    'H:/AIRLOCK/FlowState_Mage',
    'H:/AIRLOCK/HomePlanetStudio'
  ];
  const roots = Array.isArray(launchCfg.roots) && launchCfg.roots.length ? launchCfg.roots : defaultRoots;
  for (const root of roots) {
    const mageCmd = path.join(root, 'mage.cmd');
    if (fileExistsSync(mageCmd)) {
      return { root, mageCmd };
    }
  }
  return null;
}

async function mageHttpHealthy() {
  const cfg = getMageHttpConfig();
  const modelsUrl = `${cfg.baseUrl}/v1/models`;
  try {
    const response = await fetch(modelsUrl, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

async function currentMageStatus() {
  const httpReady = await mageHttpHealthy();
  if (mageProcess?.pid && isPidAlive(mageProcess.pid)) {
    return {
      running: true,
      launchable: true,
      httpReady,
      pid: mageProcess.pid,
      startedAt: mageProcess.startedAt,
      cwd: mageProcess.cwd,
      command: mageProcess.command,
      args: mageProcess.args,
      mode: mageProcess.mode || 'auto',
      detectedFrom: mageProcess.detectedFrom
    };
  }

  const persisted = readMageState();
  if (persisted?.pid && isPidAlive(persisted.pid)) {
    return {
      running: true,
      launchable: true,
      httpReady,
      pid: persisted.pid,
      startedAt: persisted.startedAt,
      cwd: persisted.cwd,
      command: persisted.command,
      args: persisted.args,
      mode: persisted.mode || 'auto',
      detectedFrom: persisted.detectedFrom
    };
  }

  const detected = detectMageLaunch();
  const detectedHttp = detectMageHttpLaunch();
  return {
    running: Boolean(httpReady),
    launchable: Boolean(detected || detectedHttp || httpReady),
    httpReady,
    mode: httpReady ? 'http' : 'auto',
    detectedFrom: detected?.detectedFrom || null,
    detectedHttpFrom: detectedHttp?.detectedFrom || null,
    cwd: detected?.cwd || null,
    command: detected?.command || null,
    args: detected?.args || []
  };
}

function launchMageProcess(mode = 'auto') {
  const existing = (mageProcess?.pid && isPidAlive(mageProcess.pid)) ? mageProcess : readMageState();
  if (existing?.pid && isPidAlive(existing.pid)) {
    const existingMode = existing.mode || 'auto';
    if (mode !== 'auto' && existingMode !== mode) {
      try {
        process.kill(existing.pid);
      } catch {
        // Ignore kill errors before relaunch.
      }
      mageProcess = null;
      saveMageState({});
    } else {
      return {
        running: true,
        launchable: true,
        pid: existing.pid,
        startedAt: existing.startedAt,
        cwd: existing.cwd,
        command: existing.command,
        args: existing.args,
        mode: existingMode,
        detectedFrom: existing.detectedFrom
      };
    }
  }

  const launch = mode === 'http' ? detectMageHttpLaunch() : detectMageLaunch();
  if (!launch) {
    throw new Error(`Could not detect Mage launch command for mode '${mode}'. Configure standalone/contexts.json -> mage.launch.`);
  }

  const child = spawn(launch.command, launch.args || [], {
    cwd: launch.cwd || ROOT,
    env: {
      ...process.env,
      ...(launch.env || {})
    },
    detached: true,
    stdio: 'ignore',
    shell: true
  });
  child.unref();

  mageProcess = {
    pid: child.pid,
    startedAt: new Date().toISOString(),
    cwd: launch.cwd || ROOT,
    command: launch.command,
    args: launch.args || [],
    env: launch.env || null,
    mode,
    detectedFrom: launch.detectedFrom || 'auto-detect'
  };

  saveMageState(mageProcess);
  return { running: true, ...mageProcess };
}

function stopMageProcess() {
  const status = mageProcess?.pid && isPidAlive(mageProcess.pid)
    ? mageProcess
    : readMageState();
  if (!status?.pid || !isPidAlive(status.pid)) return { running: false, stopped: false };

  try {
    process.kill(status.pid);
  } catch {
    // Ignore kill errors.
  }

  mageProcess = null;
  saveMageState({});
  return { running: false, stopped: true, pid: status.pid };
}

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

async function runMageBridge(prompt, skyContext, contextHints, intentOverride) {
  const endpoint = config.mage?.mcpUrl;
  const useMcp = Boolean(endpoint);

  const headers = { 'Content-Type': 'application/json' };
  const token = config.mage?.apiKey;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['x-api-key'] = token;
  }

  const payload = {
    intent: intentOverride || config.mage?.intent || 'astrology-reading',
    prompt,
    skyContext: skyContext || '',
    contextHints: contextHints || []
  };

  if (useMcp) {
    try {
      const data = await requestJson(endpoint, 'POST', headers, payload);
      const text = parseTextResponse(data);
      if (text) return text;
    } catch {
      // Fall back to local HTTP runner bridge when MCP transport is unavailable.
    }
  }

  // Prefer Mage's own CLI path so RaidBrain + Faux cache + hot model switching remain authoritative.
  try {
    const cli = detectMageCliRoot();
    if (cli) {
      const http = getMageHttpConfig();
      const systemPrefix = skyContext
        ? `Sky context for grounding:\n${skyContext}\n\n`
        : '';
      const routedPrompt = `${systemPrefix}${prompt}`;
      const cliResult = spawnSync('cmd', ['/c', cli.mageCmd, 'ask', '-m', http.model, '--json', '-'], {
        cwd: cli.root,
        input: routedPrompt,
        encoding: 'utf8',
        timeout: 600000,
        maxBuffer: 20 * 1024 * 1024,
        windowsHide: true
      });

      if (cliResult.status === 0 && cliResult.stdout) {
        try {
          const parsed = JSON.parse(cliResult.stdout.trim());
          const text = parseTextResponse(parsed) || parsed?.reply;
          if (typeof text === 'string' && text.trim()) return text;
        } catch {
          const raw = cliResult.stdout.trim();
          if (raw) return raw;
        }
      }
    }
  } catch {
    // Fall through to HTTP runner path.
  }

  const http = getMageHttpConfig();
  const runnerPayload = {
    model: http.model,
    temperature: 0.55,
    messages: [
      {
        role: 'system',
        content: skyContext
          ? `You are LuminaSynodic's local Mage model. Use this context when useful.\n\n${skyContext}`
          : `You are LuminaSynodic's local Mage model.`
      },
      { role: 'user', content: prompt }
    ]
  };
  const data = await requestJson(`${http.baseUrl}${http.path}`, 'POST', { 'Content-Type': 'application/json' }, runnerPayload);
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

function safeDeckSlug(input) {
  return String(input || 'tarot-deck')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'tarot-deck';
}

async function saveDeckManifest(payload) {
  await fsp.mkdir(DECK_DIR, { recursive: true });

  const slug = safeDeckSlug(payload?.slug || 'tarot-deck');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${slug}-${stamp}.json`;
  const filePath = path.join(DECK_DIR, fileName);

  const rawManifest = payload?.manifest;
  if (rawManifest === undefined || rawManifest === null) {
    throw new Error('Missing manifest');
  }

  let manifest = rawManifest;
  if (typeof rawManifest === 'string') {
    try {
      manifest = JSON.parse(rawManifest);
    } catch {
      manifest = { raw: rawManifest };
    }
  }

  const wrapped = {
    version: 1,
    savedAt: new Date().toISOString(),
    slug,
    source: payload?.source || 'luminasynodic-dev',
    manifest
  };

  await fsp.writeFile(filePath, JSON.stringify(wrapped, null, 2), 'utf8');

  return {
    fileName,
    filePath: filePath.replace(/\\/g, '/'),
    slug,
    savedAt: wrapped.savedAt
  };
}

async function readLiveDeckIndex() {
  try {
    const raw = await fsp.readFile(LIVE_DECK_INDEX_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLiveDeckIndex(rows) {
  await fsp.mkdir(path.dirname(LIVE_DECK_INDEX_PATH), { recursive: true });
  await fsp.writeFile(LIVE_DECK_INDEX_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}

async function publishLocalDeck(payload) {
  const name = String(payload?.name || '').trim();
  const slug = safeDeckSlug(payload?.slug || name || 'tarot-deck');
  const manifestRaw = payload?.manifest;
  if (!name) throw new Error('Missing deck name');
  if (manifestRaw === undefined || manifestRaw === null) throw new Error('Missing deck manifest payload');

  const manifestText = typeof manifestRaw === 'string' ? manifestRaw : JSON.stringify(manifestRaw, null, 2);
  await fsp.mkdir(LIVE_DECK_DIR, { recursive: true });

  const fileName = `${slug}-${Date.now()}.json`;
  const filePath = path.join(LIVE_DECK_DIR, fileName);
  await fsp.writeFile(filePath, manifestText, 'utf8');

  const entry = {
    slug,
    name,
    source: String(payload?.source || 'tarot-atelier-dev-local'),
    summary: String(payload?.summary || 'Published via local runtime fallback.'),
    createdAt: new Date().toISOString(),
    manifestPath: `data/decks/live/${fileName}`
  };

  const current = await readLiveDeckIndex();
  const next = [entry, ...current.filter((item) => item.slug !== slug)];
  await writeLiveDeckIndex(next);

  return { entry, decks: next };
}

async function buildDeckCatalogPayload() {
  const live = await readLiveDeckIndex();
  return {
    ok: true,
    decks: [
      {
        slug: 'classic-source',
        name: 'Classic Source Deck',
        source: 'builtin',
        summary: 'Built-in LuminaSynodic source deck.',
        createdAt: null
      },
      ...live
    ]
  };
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

  if (parsed.pathname === '/local/mage/status' && req.method === 'GET') {
    const status = await currentMageStatus();
    sendJson(res, 200, { ok: true, ...status });
    return;
  }

  if (parsed.pathname === '/local/mage/launch' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const mode = String(body.mode || 'auto').toLowerCase();
      const result = launchMageProcess(mode === 'http' ? 'http' : 'auto');
      sendJson(res, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Failed to launch Mage' });
    }
    return;
  }

  if (parsed.pathname === '/local/mage/stop' && req.method === 'POST') {
    const result = stopMageProcess();
    sendJson(res, 200, { ok: true, ...result });
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
      const intent = typeof body.intent === 'string' && body.intent.trim() ? body.intent.trim() : null;

      if (!prompt || typeof prompt !== 'string') {
        sendJson(res, 400, { error: 'Missing prompt' });
        return;
      }

      let data;
      if (provider === 'mage-local' || provider === 'mage') {
        data = await runMageBridge(prompt, skyContext, contextHints, intent);
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

  if (parsed.pathname === '/local/decks/save' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const saved = await saveDeckManifest(body || {});
      sendJson(res, 200, { ok: true, saved });
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Failed to save deck manifest' });
    }
    return;
  }

  if (parsed.pathname === '/local/decks/catalog' && req.method === 'GET') {
    try {
      const payload = await buildDeckCatalogPayload();
      sendJson(res, 200, payload);
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Failed to load deck catalog' });
    }
    return;
  }

  if (parsed.pathname === '/local/decks/publish' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const result = await publishLocalDeck(body || {});
      const payload = await buildDeckCatalogPayload();
      sendJson(res, 200, { ok: true, published: result.entry, decks: payload.decks });
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Failed to publish deck locally' });
    }
    return;
  }

  // Serve the Vercel /api/decks route locally so the tarot deck catalog loads
  // (and doesn't 404) when running under the standalone runtime.
  if (parsed.pathname === '/api/decks' && req.method === 'GET') {
    try {
      const payload = await buildDeckCatalogPayload();
      sendJson(res, 200, payload);
    } catch (error) {
      sendJson(res, 500, { error: error.message || 'Failed to load deck catalog' });
    }
    return;
  }

  await serveStatic(parsed.pathname || '/', res);
});

const host = config.server?.host || '127.0.0.1';
const port = Number(config.server?.port || 8787);
server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    const healthUrl = `http://${host}:${port}/health`;
    // Gracefully handle second-launch attempts when runtime is already running.
    (async () => {
      try {
        const response = await fetch(healthUrl, { method: 'GET' });
        if (response.ok) {
          console.log(`LuminaSynodic runtime already running on http://${host}:${port}`);
          console.log('Open http://127.0.0.1:8787/index.html?standalone=1');
          process.exit(0);
          return;
        }
      } catch {
        // Fall through to error exit if health probe fails.
      }
      console.error(`Port ${port} is already in use and is not a healthy LuminaSynodic runtime.`);
      console.error('Stop the conflicting process or change standalone/contexts.json server.port.');
      process.exit(1);
    })();
    return;
  }
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`LuminaSynodic standalone runtime listening on http://${host}:${port}`);
  console.log('Tip: open http://127.0.0.1:8787/index.html?standalone=1');
});
