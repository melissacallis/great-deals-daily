import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CreatorsApi } from './src/amazon.js';
import { CATEGORIES } from './src/categories.js';
import { demoDeals } from './src/demo.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = Number(process.env.PORT ?? 3000);
const CACHE_MINUTES = Number(process.env.CACHE_MINUTES ?? 60);
const SITE_NAME = process.env.SITE_NAME ?? 'Great Deals Daily';

const env = process.env;
const hasCredentials = env.AMAZON_CREDENTIAL_ID && env.AMAZON_CREDENTIAL_SECRET && env.AMAZON_PARTNER_TAG;
const api = hasCredentials
  ? new CreatorsApi({
      credentialId: env.AMAZON_CREDENTIAL_ID,
      credentialSecret: env.AMAZON_CREDENTIAL_SECRET,
      version: env.AMAZON_CREDENTIAL_VERSION ?? '3.1',
      partnerTag: env.AMAZON_PARTNER_TAG,
      marketplace: env.AMAZON_MARKETPLACE ?? 'www.amazon.com',
    })
  : null;

// Simple in-memory cache. The API is rate limited (about 1 request/second for
// new accounts), so cached results keep the site fast and within limits.
const cache = new Map();
async function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MINUTES * 60_000) return hit;
  const entry = { at: Date.now(), items: await fn() };
  cache.set(key, entry);
  return entry;
}

async function loadCategory(cat) {
  if (!api) return demoDeals(cat.id);
  const items = [];
  for (const itemPage of [1, 2]) {
    items.push(...await api.searchItems({
      keywords: cat.keywords,
      searchIndex: cat.searchIndex,
      minSavingPercent: cat.minSavingPercent,
      itemPage,
      itemCount: 10,
    }));
  }
  const seen = new Set();
  return items
    .filter((it) => !seen.has(it.asin) && seen.add(it.asin))
    .sort((a, b) => b.savingsPct - a.savingsPct);
}

async function search(q) {
  if (!api) return demoDeals(null, q);
  return api.searchItems({ keywords: q, searchIndex: 'All', itemCount: 10 });
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain' };

async function serveStatic(res, urlPath) {
  const file = path.normalize(path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath));
  if (!file.startsWith(ROOT)) return sendJson(res, 403, { error: 'Forbidden' });
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === '/api/config') {
      return sendJson(res, 200, {
        siteName: SITE_NAME,
        demo: !api,
        categories: CATEGORIES.map(({ id, label, icon }) => ({ id, label, icon })),
      });
    }
    if (url.pathname === '/api/deals') {
      const cat = CATEGORIES.find((c) => c.id === url.searchParams.get('category')) ?? CATEGORIES[0];
      const { at, items } = await cached(`cat:${cat.id}`, () => loadCategory(cat));
      return sendJson(res, 200, { category: cat.id, updatedAt: at, demo: !api, items });
    }
    if (url.pathname === '/api/search') {
      const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
      if (!q) return sendJson(res, 400, { error: 'Missing search query' });
      const { at, items } = await cached(`q:${q.toLowerCase()}`, () => search(q));
      return sendJson(res, 200, { query: q, updatedAt: at, demo: !api, items });
    }
    return serveStatic(res, url.pathname);
  } catch (err) {
    console.error(err);
    return sendJson(res, 502, { error: 'Could not load deals from Amazon right now. Please try again shortly.' });
  }
});

server.listen(PORT, () => {
  console.log(`${SITE_NAME} running at http://localhost:${PORT}`);
  console.log(api ? `Using Amazon Creators API (${env.AMAZON_MARKETPLACE ?? 'www.amazon.com'})` : 'No Amazon credentials found: showing DEMO data. See README.md.');
});
