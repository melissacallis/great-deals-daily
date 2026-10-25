import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { timingSafeEqual, createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CreatorsApi } from './src/amazon.js';
import { CATEGORIES, POOL_SEARCHES, TOP } from './src/categories.js';
import { demoDeals } from './src/demo.js';
import { getContent, saveContent, storageInfo, HOME_CAMPAIGN, UPLOADS_DIR } from './src/content.js';

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
// Hand-picked products come from the /admin page. Links must point to
// Amazon; plain amazon.com links get the affiliate tag added.
function cleanPick(p) {
  if (!p || !p.title || !p.url) return null;
  let url;
  try { url = new URL(p.url); } catch { return null; }
  const host = url.hostname.toLowerCase();
  if (host === 'amzn.to') {
    // SiteStripe short links already carry the tag.
  } else if (host === MARKETPLACE || host.endsWith('.amazon.com') || host === 'amazon.com') {
    if (PARTNER_TAG && !url.searchParams.has('tag')) url.searchParams.set('tag', PARTNER_TAG);
  } else {
    return null;
  }
  return { title: String(p.title), why: p.why ? String(p.why) : '', emoji: p.emoji ? String(p.emoji) : '⭐', image: cleanImage(p.image), url: url.toString() };
}

// Product photos: either uploaded from /admin (the owner's own photos), or an
// Amazon-hosted image such as the SiteStripe "Image" link. Copying Amazon's
// product photos to other hosts isn't allowed, so other sites are dropped.
const UPLOAD_NAME = /^\/uploads\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/;
const AMAZON_IMAGE_HOSTS = /(^|\.)(amazon-adsystem\.com|media-amazon\.com|ssl-images-amazon\.com|images-amazon\.com)$/;

function cleanImage(image) {
  if (!image) return null;
  if (UPLOAD_NAME.test(image)) return image;
  try {
    const url = new URL(image.startsWith('//') ? `https:${image}` : image);
    if (url.protocol === 'https:' && AMAZON_IMAGE_HOSTS.test(url.hostname)) return url.toString();
  } catch {}
  return null;
}

const IMAGE_TYPES = [
  { ext: 'jpg', type: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', type: 'image/png', test: (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) },
  { ext: 'gif', type: 'image/gif', test: (b) => b.subarray(0, 3).toString() === 'GIF' },
  { ext: 'webp', type: 'image/webp', test: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
];

async function readBody(req, limit) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Too large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function serveUpload(res, name) {
  const kind = IMAGE_TYPES.find((t) => name.endsWith(`.${t.ext}`));
  try {
    const data = await readFile(path.join(UPLOADS_DIR, path.basename(name)));
    res.writeHead(200, { 'Content-Type': kind.type, 'Cache-Control': 'public, max-age=31536000, immutable' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

function publicCampaign(c) {
  return {
    id: c.id,
    title: c.title,
    emoji: c.emoji,
    intro: c.intro,
    sections: c.sections.map((s) => ({
      id: s.id,
      emoji: s.emoji,
      title: s.title,
      search: s.search || s.title,
      browseUrl: s.search || s.title ? amazonLink('/s', { k: s.search || s.title }) : null,
      picks: s.picks.map(cleanPick).filter(Boolean),
    })),
  };
}

// The admin page is protected by ADMIN_PASSWORD (set in Railway, never in code).
// The browser sends it as a Bearer token on each admin request.
const ADMIN_PASSWORD = env.ADMIN_PASSWORD ?? '';
const failedLogins = new Map(); // ip -> { count, since }

function checkAdmin(req) {
  if (!ADMIN_PASSWORD) return { ok: false, status: 503, error: 'Admin is turned off. Set ADMIN_PASSWORD in Railway to turn it on.' };
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.socket.remoteAddress;
  const record = failedLogins.get(ip);
  if (record && record.count >= 10 && Date.now() - record.since < 15 * 60_000) {
    return { ok: false, status: 429, error: 'Too many wrong passwords. Try again in 15 minutes.' };
  }
  const given = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  const hash = (s) => createHash('sha256').update(s).digest();
  if (timingSafeEqual(hash(given), hash(ADMIN_PASSWORD))) {
    failedLogins.delete(ip);
    return { ok: true };
  }
  const fresh = !record || Date.now() - record.since > 15 * 60_000;
  failedLogins.set(ip, fresh ? { count: 1, since: Date.now() } : { ...record, count: record.count + 1 });
  return { ok: false, status: 401, error: 'Wrong password.' };
}

async function readJsonBody(req, limit = 1_000_000) {
  return JSON.parse((await readBody(req, limit)).toString('utf8'));
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

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain' };

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
    if (url.pathname === '/api/picks') {
      const { campaigns } = await getContent();
      const home = campaigns.find((c) => c.id === HOME_CAMPAIGN);
      return sendJson(res, 200, { picks: home.sections.flatMap((s) => s.picks).map(cleanPick).filter(Boolean) });
    }
    if (url.pathname === '/api/campaigns') {
      const { campaigns } = await getContent();
      return sendJson(res, 200, {
        campaigns: campaigns.filter((c) => c.nav && c.id !== HOME_CAMPAIGN).map(({ id, title, emoji }) => ({ id, title, emoji })),
      });
    }
    // The TikTok swipe page: Today's Picks first, then every campaign shown in the menu.
    if (url.pathname === '/api/swipe') {
      const { campaigns } = await getContent();
      const slides = campaigns.filter((c) => c.id === HOME_CAMPAIGN || c.nav).map(publicCampaign);
      return sendJson(res, 200, { slides });
    }
    const campaignApi = url.pathname.match(/^\/api\/campaign\/([\w-]+)$/);
    if (campaignApi) {
      const { campaigns } = await getContent();
      const c = campaigns.find((x) => x.id === campaignApi[1] && x.id !== HOME_CAMPAIGN);
      if (!c) return sendJson(res, 404, { error: 'This page doesn’t exist (yet).' });
      return sendJson(res, 200, publicCampaign(c));
    }
    // Campaign pages: /gift-guide (kept for old links) and /c/<campaign-id>.
    if (url.pathname === '/gift-guide' || /^\/c\/[\w-]+\/?$/.test(url.pathname)) return serveStatic(res, '/campaign.html');
    if (url.pathname === '/admin') return serveStatic(res, '/admin.html');
    if (url.pathname === '/deals') return serveStatic(res, '/deals.html');
    // The campaign featured on the front page: the one ticked in /admin, else the Black Friday watchlist.
    if (url.pathname === '/api/featured') {
      const { campaigns } = await getContent();
      const c = campaigns.find((x) => x.featured && x.id !== HOME_CAMPAIGN) ?? campaigns.find((x) => x.id === 'black-friday');
      if (!c) return sendJson(res, 404, { error: 'No featured campaign yet.' });
      return sendJson(res, 200, publicCampaign(c));
    }
    if (url.pathname === '/swipe') return serveStatic(res, '/swipe.html');
    if (UPLOAD_NAME.test(url.pathname)) return serveUpload(res, url.pathname);
    if (url.pathname.startsWith('/api/admin/')) {
      const auth = checkAdmin(req);
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      if (url.pathname === '/api/admin/content' && req.method === 'GET') {
        return sendJson(res, 200, { ...(await getContent()), storage: storageInfo(), partnerTag: PARTNER_TAG, marketplace: MARKETPLACE });
      }
      if (url.pathname === '/api/admin/content' && req.method === 'PUT') {
        let body;
        try { body = await readJsonBody(req); } catch (err) {
          return sendJson(res, err.status ?? 400, { error: err.status === 413 ? 'Too much data in one save.' : 'Invalid data.' });
        }
        return sendJson(res, 200, await saveContent(body));
      }
      if (url.pathname === '/api/admin/upload' && req.method === 'POST') {
        let data;
        try { data = await readBody(req, 5_000_000); } catch (err) {
          return sendJson(res, err.status ?? 400, { error: err.status === 413 ? 'That photo is over 5 MB. Try a smaller one.' : 'Upload failed.' });
        }
        const kind = IMAGE_TYPES.find((t) => t.test(data));
        if (!kind) return sendJson(res, 415, { error: 'Use a JPG, PNG, WebP or GIF photo.' });
        const name = `${randomUUID()}.${kind.ext}`;
        await mkdir(UPLOADS_DIR, { recursive: true });
        await writeFile(path.join(UPLOADS_DIR, name), data);
        return sendJson(res, 200, { image: `/uploads/${name}` });
      }
      return sendJson(res, 404, { error: 'Not found' });
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
  getContent().catch((err) => console.error('Could not load content:', err)); // also runs one-time imports
});
