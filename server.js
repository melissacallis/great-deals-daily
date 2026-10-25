import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CreatorsApi } from './src/amazon.js';
import { CATEGORIES, POOL_SEARCHES, TOP } from './src/categories.js';
import { demoDeals } from './src/demo.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = Number(process.env.PORT ?? 3000);
const CACHE_MINUTES = Number(process.env.CACHE_MINUTES ?? 60);
const SITE_NAME = process.env.SITE_NAME ?? 'Great Deals Daily';

const env = process.env;
const MARKETPLACE = env.AMAZON_MARKETPLACE ?? 'www.amazon.com';
const PARTNER_TAG = env.AMAZON_PARTNER_TAG ?? '';
const hasCredentials = env.AMAZON_CREDENTIAL_ID && env.AMAZON_CREDENTIAL_SECRET && PARTNER_TAG;
const api = hasCredentials
  ? new CreatorsApi({
      credentialId: env.AMAZON_CREDENTIAL_ID,
      credentialSecret: env.AMAZON_CREDENTIAL_SECRET,
      version: env.AMAZON_CREDENTIAL_VERSION ?? '3.1',
      partnerTag: PARTNER_TAG,
      marketplace: MARKETPLACE,
    })
  : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Tagged links to Amazon's own pages, shown when the API refuses access
// (new Associates accounts must make some sales before the API opens up).
function amazonLink(pathname, params = {}) {
  const url = new URL(`https://${MARKETPLACE}${pathname}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (PARTNER_TAG) url.searchParams.set('tag', PARTNER_TAG);
  return url.toString();
}
const fallbackFor = (cat) => cat.id === TOP.id
  ? amazonLink('/deals')
  : amazonLink('/s', { k: `${cat.keywords.split(' ')[0]} deals` });

// All deals are fetched in one background pass, then served from memory.
// The API allows about 1 request/second for new accounts, so calls are spaced out.
const store = { at: 0, failedAt: 0, byCategory: {}, top: [], notEligible: false, error: null };
let refreshing = null;

function rankTop(lists) {
  const seen = new Set();
  return lists.flat()
    .filter((it) => !seen.has(it.asin) && seen.add(it.asin))
    .sort((a, b) => b.savingsPct - a.savingsPct || b.savingsAmount - a.savingsAmount)
    .slice(0, TOP.size);
}

async function runSearch(search) {
  const items = [];
  for (const itemPage of [1, 2]) {
    items.push(...await api.searchItems({ ...search, itemPage, itemCount: 10 }));
    await sleep(1100);
  }
  return items;
}

async function refreshDeals() {
  if (!api) {
    for (const cat of CATEGORIES) store.byCategory[cat.id] = demoDeals(cat.id);
    store.top = rankTop(Object.values(store.byCategory));
    store.at = Date.now();
    return;
  }
  const byCategory = {};
  const pool = [];
  try {
    for (const cat of CATEGORIES) {
      byCategory[cat.id] = rankTop([await runSearch(cat)]);
    }
    for (const search of POOL_SEARCHES) pool.push(await runSearch(search));
    Object.assign(store, {
      byCategory,
      top: rankTop([...Object.values(byCategory), ...pool]),
      at: Date.now(),
      notEligible: false,
      error: null,
    });
    console.log(`Refreshed deals: ${store.top.length} in Top 50`);
  } catch (err) {
    store.notEligible = err.reason === 'AssociateNotEligible';
    store.error = err.message;
    store.failedAt = Date.now();
    console.error(store.notEligible ? 'Amazon API: account not eligible yet, showing Amazon links instead.' : err);
  }
}

function ensureFresh() {
  const stale = Date.now() - store.at > CACHE_MINUTES * 60_000
    && Date.now() - store.failedAt > 10 * 60_000; // after a failure, wait 10 minutes before retrying
  if (stale && !refreshing) refreshing = refreshDeals().finally(() => { refreshing = null; });
  // Only make the visitor wait if there is nothing at all to show yet.
  return store.at ? Promise.resolve() : refreshing ?? Promise.resolve();
}

async function search(q) {
  if (!api) return demoDeals(null, q);
  return api.searchItems({ keywords: q, searchIndex: 'All', itemCount: 10 });
}
const searchCache = new Map();

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
        categories: [TOP, ...CATEGORIES].map(({ id, label, icon }) => ({ id, label, icon })),
      });
    }
    if (url.pathname === '/api/deals') {
      const cat = [TOP, ...CATEGORIES].find((c) => c.id === url.searchParams.get('category')) ?? TOP;
      await ensureFresh();
      const items = cat.id === TOP.id ? store.top : store.byCategory[cat.id] ?? [];
      if (!items.length && store.notEligible) {
        return sendJson(res, 200, { category: cat.id, notEligible: true, fallbackUrl: fallbackFor(cat), items: [] });
      }
      if (!items.length && store.error) throw new Error(store.error);
      return sendJson(res, 200, { category: cat.id, ranked: cat.id === TOP.id, updatedAt: store.at, demo: !api, items });
    }
    if (url.pathname === '/api/search') {
      const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
      if (!q) return sendJson(res, 400, { error: 'Missing search query' });
      const key = q.toLowerCase();
      const hit = searchCache.get(key);
      if (hit && Date.now() - hit.at < CACHE_MINUTES * 60_000) return sendJson(res, 200, { query: q, demo: !api, ...hit });
      try {
        const entry = { at: Date.now(), items: await search(q) };
        searchCache.set(key, entry);
        return sendJson(res, 200, { query: q, updatedAt: entry.at, demo: !api, items: entry.items });
      } catch (err) {
        if (err.reason !== 'AssociateNotEligible') throw err;
        return sendJson(res, 200, { query: q, notEligible: true, fallbackUrl: amazonLink('/s', { k: q }), items: [] });
      }
    }
    return serveStatic(res, url.pathname);
  } catch (err) {
    console.error(err);
    return sendJson(res, 502, { error: 'Could not load deals from Amazon right now. Please try again shortly.' });
  }
});

server.listen(PORT, () => {
  console.log(`${SITE_NAME} running at http://localhost:${PORT}`);
  console.log(api ? `Using Amazon Creators API (${MARKETPLACE})` : 'No Amazon credentials found: showing DEMO data. See README.md.');
  ensureFresh();
});
