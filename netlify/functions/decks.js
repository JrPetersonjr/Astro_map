import fs from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, 'data', 'decks', 'live-index.json');
const LIVE_DIR = path.join(ROOT, 'data', 'decks', 'live');

function slugify(input) {
  return String(input || 'tarot-deck')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'tarot-deck';
}

async function readIndex() {
  try {
    const raw = await fs.readFile(INDEX_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalDeck(entry, manifestText) {
  await fs.mkdir(LIVE_DIR, { recursive: true });
  await fs.mkdir(path.dirname(INDEX_PATH), { recursive: true });
  const fileName = `${entry.slug}-${Date.now()}.json`;
  const filePath = path.join(LIVE_DIR, fileName);
  await fs.writeFile(filePath, manifestText, 'utf8');

  const current = await readIndex();
  const next = [
    {
      ...entry,
      manifestPath: `data/decks/live/${fileName}`
    },
    ...current.filter((d) => d.slug !== entry.slug)
  ];

  await fs.writeFile(INDEX_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json'
  };
}

async function githubGetFile(repo, branch, targetPath, token) {
  const url = `https://api.github.com/repos/${repo}/contents/${targetPath}?ref=${encodeURIComponent(branch)}`;
  const response = await fetch(url, { headers: githubHeaders(token) });
  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub read failed (${response.status}): ${text}`);
  }
  return response.json();
}

async function githubPutFile(repo, branch, targetPath, token, contentText, message, sha) {
  const url = `https://api.github.com/repos/${repo}/contents/${targetPath}`;
  const payload = {
    message,
    content: Buffer.from(contentText, 'utf8').toString('base64'),
    branch
  };
  if (sha) payload.sha = sha;

  const response = await fetch(url, {
    method: 'PUT',
    headers: githubHeaders(token),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub write failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function publishViaGitHub(entry, manifestText) {
  const token = process.env.DECK_GITHUB_TOKEN;
  const repo = process.env.DECK_GITHUB_REPO;
  const branch = process.env.DECK_GITHUB_BRANCH || 'main';

  if (!token || !repo) {
    throw new Error('GitHub publish is not configured. Set DECK_GITHUB_TOKEN and DECK_GITHUB_REPO.');
  }

  const fileName = `${entry.slug}-${Date.now()}.json`;
  const manifestPath = `data/decks/live/${fileName}`;
  const indexPath = 'data/decks/live-index.json';

  await githubPutFile(
    repo,
    branch,
    manifestPath,
    token,
    manifestText,
    `Publish tarot deck: ${entry.name}`
  );

  const currentIndexFile = await githubGetFile(repo, branch, indexPath, token);
  const currentIndex = currentIndexFile
    ? JSON.parse(Buffer.from(currentIndexFile.content, 'base64').toString('utf8'))
    : [];

  const nextIndex = [
    {
      ...entry,
      manifestPath
    },
    ...(Array.isArray(currentIndex) ? currentIndex : []).filter((d) => d.slug !== entry.slug)
  ];

  await githubPutFile(
    repo,
    branch,
    indexPath,
    token,
    `${JSON.stringify(nextIndex, null, 2)}\n`,
    `Update tarot deck index: ${entry.name}`,
    currentIndexFile?.sha
  );

  return nextIndex;
}

function buildDeckCatalog(indexRows) {
  const base = [
    {
      slug: 'classic-source',
      name: 'Classic Source Deck',
      source: 'builtin',
      summary: 'Built-in LuminaSynodic source deck.',
      createdAt: null
    }
  ];
  const rows = Array.isArray(indexRows) ? indexRows : [];
  return [...base, ...rows];
}

export async function handler(event) {
  if (event.httpMethod === 'GET') {
    const index = await readIndex();
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, decks: buildDeckCatalog(index) })
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const adminKey = event.headers['x-deck-admin-key'] || event.headers['X-Deck-Admin-Key'];
  if (!process.env.DECK_ADMIN_KEY || adminKey !== process.env.DECK_ADMIN_KEY) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized publish key' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const name = String(body.name || '').trim();
  const slug = slugify(body.slug || name);
  const manifest = body.manifest;

  if (!name) return { statusCode: 400, body: JSON.stringify({ error: 'Missing deck name' }) };
  if (!manifest) return { statusCode: 400, body: JSON.stringify({ error: 'Missing deck manifest payload' }) };

  const entry = {
    slug,
    name,
    source: String(body.source || 'tarot-atelier-dev'),
    summary: String(body.summary || 'Published from Tarot Atelier.'),
    createdAt: new Date().toISOString()
  };

  try {
    const manifestText = typeof manifest === 'string' ? manifest : JSON.stringify(manifest, null, 2);
    const mode = process.env.DECK_PUBLISH_MODE || 'github';

    let nextIndex;
    if (mode === 'github') nextIndex = await publishViaGitHub(entry, manifestText);
    else nextIndex = await writeLocalDeck(entry, manifestText);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, mode, published: entry, decks: buildDeckCatalog(nextIndex) })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Publish failed' }) };
  }
}
