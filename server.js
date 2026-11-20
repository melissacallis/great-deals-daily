import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { timingSafeEqual, createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CreatorsApi } from './src/amazon.js';
import { CATEGORIES, POOL_SEARCHES, TOP, LIST_SIZE } from './src/categories.js';
import { demoDeals } from './src/demo.js';
import { amazonTarget, recordClick, clickSummary } from './src/clicks.js';
import { getContent, saveContent, storageInfo, HOME_CAMPAIGN, UPLOADS_DIR } from './src/content.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = Number(process.env.PORT ?? 3000);
const CACHE_MINUTES = Number(process.env.CACHE_MINUTES ?? 60);
// Each search reads this many pages of 10 results (Amazon allows up to 10 pages). More pages find more deals,
// but cost more API calls, so refreshes are spaced out to stay under DAILY_CALL_BUDGET.
const SEARCH_PAGES = Math.min(10, Math.max(1, Number(process.env.SEARCH_PAGES ?? 5)));
const DAILY_CALL_BUDGET = Number(process.env.DAILY_CALL_BUDGET ?? 8000);
const SITE_NAME = process.env.SITE_NAME ?? 'UBottega';
const CANONICAL_HOST = process.env.CANONICAL_HOST ?? '';

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
// The Top 100 / category deals pages need the Amazon API. Off until SHOW_TOP_DEALS=1 is set in Railway.
const SHOW_TOP_DEALS = process.env.SHOW_TOP_DEALS === '1';

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
  return { title: String(p.title), why: p.why ? String(p.why) : '', emoji: p.emoji ? String(p.emoji) : '⭐', image: cleanImage(p.image), url: url.toString(), ...(p.rank ? { rank: p.rank } : {}) };
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
  : amazonLink('/s', { k: `${cat.searches[0].keywords} deals` });

// All deals are fetched in one background pass, then served from memory.
// The API allows about 1 request/second for new accounts, so calls are spaced out.
// Lists are published as they finish, so the first visitors after a restart don't wait for the whole pass.
const store = { at: 0, failedAt: 0, byCategory: {}, top: [], notEligible: false, error: null };
let refreshing = null;
let firstData = null; // resolves once the first list has items after a cold start

function rankTop(lists, size = TOP.size) {
  const seen = new Set();
  return lists.flat()
    .filter((it) => it.priceAmount > 0) // $0.00 items (free Kindle editions, missing prices) aren't deals and read as "100% off"
    .filter((it) => !seen.has(it.asin) && seen.add(it.asin))
    .sort((a, b) => b.savingsPct - a.savingsPct || b.savingsAmount - a.savingsAmount)
    .slice(0, size);
}

async function runSearch(search) {
  const items = [];
  for (let itemPage = 1; itemPage <= SEARCH_PAGES; itemPage++) {
    let page;
    try {
      page = await api.searchItems({ ...search, itemPage, itemCount: 10 });
    } catch (err) {
      // Past the last page of results Amazon answers with an error: keep what we have.
      if (itemPage > 1 && err.status === 400 && !search.maxPrice) break;
      // If Amazon doesn't accept the price cap, search without it; the cap is applied to the results below anyway.
      if (!search.maxPrice || err.status !== 400) throw err;
      const { maxPrice, ...rest } = search;
      try { page = await api.searchItems({ ...rest, itemPage, itemCount: 10 }); } catch (e) { if (itemPage > 1 && e.status === 400) break; throw e; }
    }
    items.push(...page);
    await sleep(1500);
    if (page.length < 10) break; // no more results
  }
  // Some departments (Automotive, Sports) ignore minSavingPercent and send full-price items too: drop those here.
  const onSale = search.minSavingPercent ? items.filter((it) => it.savingsPct >= search.minSavingPercent - 1) : items;
  return search.maxPrice ? onSale.filter((it) => it.priceAmount <= search.maxPrice / 100) : onSale;
}
const underCap = (cat, items) => items.filter((it) => it.priceAmount > 0 && it.priceAmount <= cat.maxPrice);

// One search failing (a bad keyword, a hiccup) shouldn't sink the whole refresh; an ineligible account should.
async function trySearch(search) {
  try { return await runSearch(search); } catch (err) {
    if (err.reason === 'AssociateNotEligible' || err.status === 401 || err.status === 403) throw err;
    console.error(`Amazon API: search "${search.keywords}" in ${search.searchIndex} failed: ${err.message.slice(0, 200)}`);
    await sleep(1500);
    return [];
  }
}

// Amazon's search results shift from hour to hour, so a great deal can vanish from a list even though the price
// hasn't changed. Before letting a big deal (50%+ off) drop, look that exact product up again and keep it if it's
// still on sale (in stock, same discount or better, price not up more than 5%).
const HOT_PCT = 50, HOT_MAX = 20;
// Products to always look up, even when Amazon's searches miss them (shown while they're 50%+ off).
// asin: lists it belongs on, and the most it may cost to still be shown. $1.99 men's tracksuit, Nov 2026
// Each refresh looks these up and logs "Watched <asin>: <price>". At or under maxPrice they go first on their
// lists and become a 🔥 bubble around the owner's photo; above it they only show if they're on sale anyway.
const WATCH_ASINS = {
  B0HLGC93P1: { lists: ['him', 'under-10'], maxPrice: 5 }, // $1.99 men's tracksuit, Nov 2026
  B0GTMHDFVN: { lists: ['tech'], maxPrice: 2399 }, // STORMCRAFT Phantom RTX 5070 Ti desktop ($2,599.99 on Nov 20)
  B0HJGNNF9K: { lists: ['tech'], maxPrice: 2599 }, // Skytech 9800X3D RTX 5070 Ti desktop ($2,899.99 on Nov 20)
};
const watchedTooPricey = (it) => WATCH_ASINS[it.asin] && it.priceAmount > WATCH_ASINS[it.asin].maxPrice;
async function keepHotDeals(byCategory, pool) {
  const now = new Set([...Object.values(byCategory), ...pool].flat().map((it) => it.asin));
  const was = new Map(); // asin -> { item, lists it was on }
  for (const [id, items] of Object.entries(store.byCategory)) {
    if (!byCategory[id]) continue;
    for (const it of items) {
      if (now.has(it.asin) || it.savingsPct < HOT_PCT) continue;
      const w = was.get(it.asin) ?? { item: it, lists: [] }; w.lists.push(id); was.set(it.asin, w);
    }
  }
  // deals that were only in the Top 100 (from the general deal searches), plus products the owner asked to always check
  for (const it of store.top) if (!now.has(it.asin) && !was.has(it.asin) && it.savingsPct >= HOT_PCT) was.set(it.asin, { item: it, lists: [] });
  // watched products are looked up every refresh (even when a search found them) so their price is always logged
  for (const [asin, { lists }] of Object.entries(WATCH_ASINS)) if (!was.has(asin)) was.set(asin, { item: null, lists: lists.filter((id) => byCategory[id]) });
  const asins = [...was.keys()].sort((a, b) => (was.get(b).item?.savingsPct ?? 100) - (was.get(a).item?.savingsPct ?? 100)).slice(0, HOT_MAX);
  let kept = 0;
  const pinned = [], seenWatched = new Set();
  for (let i = 0; i < asins.length; i += 10) {
    let fresh = [];
    try { fresh = await api.getItems(asins.slice(i, i + 10)); } catch (err) {
      console.error(`Amazon API: re-checking dropped deals failed: ${err.message.slice(0, 200)}`); break;
    }
    await sleep(1500);
    for (const it of fresh) {
      const w = was.get(it.asin), old = w?.item;
      if (WATCH_ASINS[it.asin]) {
        seenWatched.add(it.asin);
        console.log(`Watched ${it.asin}: ${it.price}, ${it.savingsPct}% off, ${it.availability ?? 'no stock info'}`);
        if (/unavailable|out of stock/i.test(it.availability ?? '') || watchedTooPricey(it)) continue; // the deal is over
        pinned.push(it); pool.push([it]); kept++; // the owner asked for it, so it shows whatever the discount
        continue;
      }
      if (!w || /unavailable|out of stock/i.test(it.availability ?? '')) continue;
      if (it.savingsPct < (old ? Math.max(HOT_PCT, old.savingsPct - 5) : HOT_PCT) || (old && it.priceAmount > old.priceAmount * 1.05)) continue;
      pool.push([it]);
      for (const id of was.get(it.asin).lists) {
        const cat = CATEGORIES.find((c) => c.id === id);
        if (cat?.maxPrice && !underCap(cat, [it]).length) continue;
        byCategory[id] = rankTop([byCategory[id], [it]], LIST_SIZE);
      }
      kept++;
    }
  }
  if (asins.length) console.log(`Re-checked ${asins.length} big deals that dropped out of the searches; kept ${kept} still on sale.`);
  for (const asin of asins) if (WATCH_ASINS[asin] && !seenWatched.has(asin)) console.log(`Watched ${asin}: Amazon returned no offer for it.`);
  return pinned;
}

// Watched products go first on their lists and on the Top 100.
function pinFirst(list, pinned, size) {
  if (!pinned.length) return list;
  const ids = new Set(pinned.map((it) => it.asin));
  return [...pinned, ...list.filter((it) => !ids.has(it.asin))].slice(0, size);
}

async function refreshDeals() {
  if (!api) {
    for (const cat of CATEGORIES) store.byCategory[cat.id] = demoDeals(cat.id).slice(0, LIST_SIZE);
    const everything = Object.values(store.byCategory).flat();
    for (const cat of CATEGORIES.filter((c) => c.maxPrice)) store.byCategory[cat.id] = rankTop([underCap(cat, everything)], LIST_SIZE);
    store.top = rankTop(Object.values(store.byCategory));
    store.at = Date.now();
    return;
  }
  const byCategory = {};
  const pool = [];
  const cold = !store.at;
  let announce;
  if (cold) firstData = new Promise((r) => { announce = r; });
  try {
    const everything = []; // every item found this pass, for the price-cap lists
    // Price-cap lists go last so they can also pick from everything the other lists found.
    const ordered = [...CATEGORIES.filter((c) => !c.maxPrice), ...CATEGORIES.filter((c) => c.maxPrice)];
    for (const cat of ordered) {
      const found = [];
      for (const search of cat.searches) found.push(await trySearch(search));
      everything.push(...found.flat());
      byCategory[cat.id] = cat.maxPrice ? rankTop([underCap(cat, everything)], LIST_SIZE) : rankTop(found, LIST_SIZE);
      if (cold && byCategory[cat.id].length) {
        // Publish what we have so far; the full Top 100 fills in as the pass continues.
        Object.assign(store.byCategory, { [cat.id]: byCategory[cat.id] });
        store.top = rankTop(Object.values(store.byCategory));
        announce?.(); announce = null;
      }
    }
    // a parent list (For Him) also gets its sub-lists' deals (Sports, Fishing, FR Work Clothes)
    for (const cat of CATEGORIES.filter((c) => !c.parent && !c.maxPrice)) {
      const kids = CATEGORIES.filter((c) => c.parent === cat.id).map((c) => byCategory[c.id] ?? []);
      if (kids.length) byCategory[cat.id] = rankTop([byCategory[cat.id], ...kids], LIST_SIZE);
    }
    for (const search of POOL_SEARCHES) pool.push(await trySearch(search));
    // the general deal pool can top up the price-cap lists too
    for (const cat of CATEGORIES.filter((c) => c.maxPrice)) byCategory[cat.id] = rankTop([byCategory[cat.id], underCap(cat, pool.flat())], LIST_SIZE);
    const pinned = await keepHotDeals(byCategory, pool);
    for (const it of pinned) for (const id of WATCH_ASINS[it.asin].lists) {
      if (byCategory[id]) byCategory[id] = pinFirst(byCategory[id], [it], LIST_SIZE);
    }
    const top = pinFirst(rankTop([...Object.values(byCategory), ...pool]), pinned, TOP.size);
    if (!top.length) throw new Error('Amazon returned no deals for any search.');
    Object.assign(store, { byCategory, top, at: Date.now(), notEligible: false, error: null });
    markFirstSeen([top, ...Object.values(byCategory)]);
    saveDealCache();
    console.log(`Refreshed deals: ${store.top.length} in Top 100; ${CATEGORIES.map((c) => `${c.id} ${byCategory[c.id].length}`).join(', ')}`);
  } catch (err) {
    store.notEligible = err.reason === 'AssociateNotEligible';
    store.error = err.message;
    store.failedAt = Date.now();
    if (store.notEligible) console.error('Amazon API: account not eligible yet, showing Amazon links instead.');
    else if (err.status === 429) console.error('Amazon API: rate limit reached (ThrottleException), trying again in 10 minutes.');
    else console.error(err);
  } finally {
    announce?.();
  }
}

// The latest deals are saved on the volume, so after a restart (every deploy) pages show them right away
// instead of "No deals found" while the first refresh runs (about 3-4 minutes).
const DEAL_CACHE = path.join(path.dirname(UPLOADS_DIR), 'deals-cache.json');
function saveDealCache() {
  writeFile(DEAL_CACHE, JSON.stringify({ at: store.at, top: store.top, byCategory: store.byCategory }))
    .catch((err) => console.error('Could not save the deals cache:', err.message));
}
async function loadDealCache() {
  try {
    const saved = JSON.parse(await readFile(DEAL_CACHE, 'utf8'));
    if (!store.at && saved.top?.length && Date.now() - saved.at < 2 * 86_400_000) {
      Object.assign(store, { top: saved.top, byCategory: saved.byCategory ?? {}, at: saved.at });
      console.log(`Loaded saved deals from ${new Date(saved.at).toISOString()} while fresh ones load.`);
    }
  } catch {}
}
// When each product first showed up on any list, so deals that are new in the last 24 hours get a "New today" badge.
const FIRST_SEEN_FILE = path.join(path.dirname(UPLOADS_DIR), 'first-seen.json');
const DAY = 86_400_000;
let firstSeen = {};
async function loadFirstSeen() { try { firstSeen = JSON.parse(await readFile(FIRST_SEEN_FILE, 'utf8')); } catch {} }
function markFirstSeen(lists) {
  const now = Date.now(), seeded = Object.keys(firstSeen).length > 0, current = new Set();
  for (const it of lists.flat()) {
    current.add(it.asin);
    // the very first run has no history yet, so nothing is called new
    if (!firstSeen[it.asin]) firstSeen[it.asin] = seeded ? now : now - 2 * DAY;
  }
  for (const [asin, at] of Object.entries(firstSeen)) if (!current.has(asin) && now - at > 30 * DAY) delete firstSeen[asin];
  writeFile(FIRST_SEEN_FILE, JSON.stringify(firstSeen)).catch((err) => console.error('Could not save first-seen dates:', err.message));
}
const withNew = (items) => {
  const now = Date.now();
  // a watched product above its target price stays only if it's a real sale; at or under target it's featured
  return items.filter((it) => !watchedTooPricey(it) || it.savingsPct >= 15).map((it) => {
    const out = firstSeen[it.asin] && now - firstSeen[it.asin] < DAY ? { ...it, newToday: true } : it;
    return WATCH_ASINS[it.asin] && !watchedTooPricey(it) ? { ...out, featured: true } : out; // the owner's featured deals (bubbles around her photo)
  });
};
const dealCacheReady = api ? Promise.all([loadDealCache(), loadFirstSeen()]) : Promise.resolve();

// Space refreshes so a day of them stays under the API call budget (searches x pages, plus up to 2 re-check calls).
const CALLS_PER_REFRESH = (CATEGORIES.reduce((n, c) => n + c.searches.length, 0) + POOL_SEARCHES.length) * SEARCH_PAGES + 2;
const REFRESH_MINUTES = Math.max(CACHE_MINUTES, Math.ceil(CALLS_PER_REFRESH * 1440 / DAILY_CALL_BUDGET));

async function ensureFresh() {
  await dealCacheReady;
  const stale = Date.now() - store.at > REFRESH_MINUTES * 60_000
    && Date.now() - store.failedAt > 10 * 60_000; // after a failure, wait 10 minutes before retrying
  if (stale && !refreshing) refreshing = refreshDeals().finally(() => { refreshing = null; });
  // Only make the visitor wait if there is nothing at all to show yet.
  if (store.at || store.top.length) return Promise.resolve();
  return firstData ?? refreshing ?? Promise.resolve();
}

async function search(q) {
  if (!api) return demoDeals(null, q);
  return api.searchItems({ keywords: q, searchIndex: 'All', itemCount: 10 });
}
const searchCache = new Map();
const imgCache = new Map();

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain', '.woff2': 'font/woff2' };

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


// ---- Search engines: per-page titles/descriptions in the HTML itself, a sitemap and robots.txt ----
const BASE_URL = `https://${CANONICAL_HOST || 'www.ubottega.com'}`;
const escHtml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function pageMeta(pathname) {
  if (pathname === '/') return { title: 'Top 100 Amazon Deals Today, Checked | UBottega', desc: 'The 100 biggest real Amazon markdowns right now, checked against their usual price and refreshed every hour. Gift ideas for her, him and kids, under $10, $25 and $50.' };
  const id = pathname.match(/^\/top\/([\w-]+)\/?$/)?.[1];
  const cat = id && CATEGORIES.find((c) => c.id === id);
  if (cat) {
    const parent = cat.parent && CATEGORIES.find((c) => c.id === cat.parent);
    return { title: `${cat.title} (Updated Daily) | UBottega`, desc: `${cat.intro} Refreshed every hour${parent ? `, part of our ${parent.label} gift lists` : ''}.`, h1: cat.title, lede: cat.intro };
  }
  return null;
}
async function servePage(res, file, pathname) {
  let html = await readFile(path.join(ROOT, file), 'utf8');
  const m = pageMeta(pathname);
  if (m) {
    const t = escHtml(m.title), d = escHtml(m.desc);
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
      .replace(/(<meta property="og:title" content=")[^"]*/, `$1${t}`)
      .replace(/(<meta property="og:description" content=")[^"]*/, `$1${d}`)
      .replace(/(<meta name="description" content=")[^"]*/, `$1${d}`);
    if (m.h1) html = html.replace(/<h1>[\s\S]*?<\/h1>/, `<h1>${escHtml(m.h1)}</h1>`).replace(/(<p class="lede">)[^<]*/, `$1${escHtml(m.lede)}`);
  }
  const canonical = `<link rel="canonical" href="${BASE_URL}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}">`;
  const verify = process.env.GOOGLE_SITE_VERIFICATION ? `\n  <meta name="google-site-verification" content="${escHtml(process.env.GOOGLE_SITE_VERIFICATION)}">` : '';
  html = html.replace('</head>', `  ${canonical}${verify}\n</head>`);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}
async function sitemap() {
  const day = new Date().toISOString().slice(0, 10);
  const { campaigns } = await getContent();
  const urls = [['/', 'hourly', '1.0'], ...CATEGORIES.map((c) => [`/top/${c.id}`, 'hourly', c.parent ? '0.7' : '0.9']), ['/black-friday', 'daily', '0.6'],
    ...campaigns.filter((c) => c.nav && c.id !== HOME_CAMPAIGN).map((c) => [`/c/${c.id}`, 'weekly', '0.5']), ['/privacy', 'yearly', '0.1']];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, f, p]) => `  <url><loc>${BASE_URL}${u}</loc><lastmod>${day}</lastmod><changefreq>${f}</changefreq><priority>${p}</priority></url>`).join('\n')}\n</urlset>\n`;
}
const ROBOTS = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /go/\n\nSitemap: ${BASE_URL}/sitemap.xml\n`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  // Once the custom domain is live (CANONICAL_HOST=www.ubottega.com in Railway), old railway.app links forward to it.
  if (CANONICAL_HOST && req.headers.host?.endsWith('.up.railway.app')) {
    res.writeHead(301, { Location: `https://${CANONICAL_HOST}${req.url}` }); return res.end();
  }
  try {
    if (url.pathname === '/api/config') {
      return sendJson(res, 200, {
        siteName: SITE_NAME,
        demo: !api,
        categories: [TOP, ...CATEGORIES].map(({ id, parent, label, icon, title, intro }) => ({ id, parent, label, icon, title: title ?? label, intro })),
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
      return sendJson(res, 200, { category: cat.id, ranked: true, updatedAt: store.at || Date.now(), demo: !api, items: withNew(items) });
    }
    // Product photos for the daily pin (/pin), served from our own address so the browser may save the drawn image.
    // Only Amazon's image servers are allowed, and results are cached in memory for a day.
    if (url.pathname === '/api/img') {
      let src; try { src = new URL(url.searchParams.get('u') ?? ''); } catch { return sendJson(res, 400, { error: 'Bad image address.' }); }
      if (src.protocol !== 'https:' || !/^(m\.media-amazon\.com|images-na\.ssl-images-amazon\.com)$/.test(src.hostname)) return sendJson(res, 400, { error: 'Only Amazon product images.' });
      let hit = imgCache.get(src.href);
      if (!hit || Date.now() - hit.at > 86_400_000) {
        const r = await fetch(src.href);
        if (!r.ok) return sendJson(res, 502, { error: 'Image not available.' });
        const body = Buffer.from(await r.arrayBuffer());
        if (body.length > 3_000_000) return sendJson(res, 502, { error: 'Image too large.' });
        hit = { at: Date.now(), type: r.headers.get('content-type') ?? 'image/jpeg', body };
        if (imgCache.size > 200) imgCache.delete(imgCache.keys().next().value);
        imgCache.set(src.href, hit);
      }
      res.writeHead(200, { 'Content-Type': hit.type, 'Cache-Control': 'public, max-age=86400' });
      return res.end(hit.body);
    }
    if (url.pathname === '/api/picks') {
      const { campaigns } = await getContent();
      const home = campaigns.find((c) => c.id === HOME_CAMPAIGN);
      if (home.hidden) return sendJson(res, 200, { picks: [] });
      return sendJson(res, 200, { picks: home.sections.flatMap((s) => s.picks).map(cleanPick).filter(Boolean) });
    }
    if (url.pathname === '/api/campaigns') {
      const { campaigns } = await getContent();
      return sendJson(res, 200, {
        campaigns: campaigns.filter((c) => c.nav && c.id !== HOME_CAMPAIGN).map(({ id, title, emoji }) => ({ id, title, emoji })),
        topDeals: SHOW_TOP_DEALS,
        topLists: SHOW_TOP_DEALS ? CATEGORIES.filter((c) => !c.parent).map(({ id, label, icon }) => ({ id, label, icon })) : [],
      });
    }
    // The TikTok swipe page: Today's Picks first, then every campaign shown in the menu.
    if (url.pathname === '/api/swipe') {
      const { campaigns } = await getContent();
      const slides = campaigns.filter((c) => (c.id === HOME_CAMPAIGN && !c.hidden) || c.nav).map(publicCampaign);
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
    if (url.pathname === '/privacy') return serveStatic(res, '/privacy.html');
    // Front page: the Top 100 deals (when they're on). The Black Friday page (featured campaign + front-page
    // campaigns) lives at /black-friday. /deals is kept for old links.
    if (url.pathname === '/sitemap.xml') { res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' }); return res.end(await sitemap()); }
    if (url.pathname === '/robots.txt') { res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end(ROBOTS); }
    if (url.pathname === '/') return SHOW_TOP_DEALS ? servePage(res, 'deals.html', '/') : serveStatic(res, '/index.html');
    if (url.pathname === '/black-friday') return serveStatic(res, '/index.html');
    if (url.pathname === '/pin') return serveStatic(res, '/pin.html'); // daily Top 10 pin maker (unlisted)
    // One Top 100 page per list: /top/her, /top/him, /top/kids, /top/tech …
    const topPage = url.pathname.match(/^\/top\/([\w-]+)\/?$/);
    if (topPage) {
      if (!SHOW_TOP_DEALS || !CATEGORIES.some((c) => c.id === topPage[1])) { res.writeHead(302, { Location: '/' }); return res.end(); }
      return servePage(res, 'deals.html', url.pathname);
    }
    if (url.pathname === '/deals') {
      res.writeHead(301, { Location: `/${url.search}` }); return res.end();
    }
    // Product taps from older links: record the tap, then forward to Amazon (Amazon links only).
    if (url.pathname === '/go/p') {
      const target = amazonTarget(url.searchParams.get('u') ?? '');
      if (!target) { res.writeHead(302, { Location: '/' }); return res.end(); }
      recordClick(req, url.searchParams); // don't make the shopper wait for the write
      res.writeHead(302, { Location: target, 'Cache-Control': 'no-store', 'Referrer-Policy': 'unsafe-url' }); return res.end();
    }
    // Tap beacon from product links that go straight to Amazon: record it, nothing to send back.
    if (url.pathname === '/go/t') {
      if (amazonTarget(url.searchParams.get('u') ?? '')) recordClick(req, url.searchParams);
      res.writeHead(204, { 'Cache-Control': 'no-store' }); return res.end();
    }
    // Share button beacon: just a log line, so we can see which deals people share.
    if (url.pathname === '/go/share') {
      const ua = req.headers['user-agent'] ?? '';
      if (!/bot|crawl|spider|headless|python|curl/i.test(ua)) console.log(`Share: ${String(url.searchParams.get('t') ?? '').slice(0, 80)} (${String(url.searchParams.get('a') ?? '').slice(0, 12)})`);
      res.writeHead(204, { 'Cache-Control': 'no-store' }); return res.end();
    }
    if (url.pathname === '/api/clicks') {
      const auth = checkAdmin(req);
      if (!auth.ok) return sendJson(res, auth.status, { error: auth.error });
      return sendJson(res, 200, await clickSummary());
    }
    if (url.pathname === '/go/search') {
      // Site search goes straight to Amazon's search, with the tag.
      const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
      res.writeHead(302, { Location: q ? amazonLink('/s', { k: q }) : '/' }); return res.end();
    }
    // The campaign featured on the front page: the one ticked in /admin, else the Black Friday watchlist.
    if (url.pathname === '/api/featured') {
      const { campaigns } = await getContent();
      const c = campaigns.find((x) => x.featured && x.id !== HOME_CAMPAIGN) ?? campaigns.find((x) => x.id === 'black-friday');
      if (!c) return sendJson(res, 404, { error: 'No featured campaign yet.' });
      return sendJson(res, 200, publicCampaign(c));
    }
    if (url.pathname === '/api/home-sections') {
      // Campaigns ticked "Also show on the front page", in admin order, below the featured one.
      const { campaigns } = await getContent();
      const list = campaigns.filter((x) => x.home && !x.featured && x.id !== HOME_CAMPAIGN && x.sections.some((s) => s.picks.length));
      return sendJson(res, 200, list.map(publicCampaign));
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
  if (api) console.log(`Reading ${SEARCH_PAGES} pages (up to ${SEARCH_PAGES * 10} results) per search; refreshing every ${REFRESH_MINUTES} minutes (about ${CALLS_PER_REFRESH} API calls each).`);
  if (SHOW_TOP_DEALS) {
    ensureFresh();
    // Keep checking even when nobody visits, so live deals appear as soon as Amazon allows.
    setInterval(ensureFresh, 10 * 60_000).unref();
  } else console.log('Top Deals pages are off (set SHOW_TOP_DEALS=1 to turn them on); not calling the Amazon API.');
  getContent().catch((err) => console.error('Could not load content:', err)); // also runs one-time imports
});
