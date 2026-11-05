// Records taps on product links (/go/p) before forwarding to Amazon, so the owner can see
// which deals people tap, on which page, and where they came from (Pinterest, Instagram …).
// One JSON line per tap in DATA_DIR/clicks.jsonl (the Railway volume). No names, emails or IP addresses are stored.
import { appendFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = process.env.DATA_DIR ?? process.env.RAILWAY_VOLUME_MOUNT_PATH ?? path.join(APP_ROOT, 'data');
const FILE = path.join(DATA_DIR, 'clicks.jsonl');

const AMAZON_HOSTS = /^(www\.)?amazon\.com$|^amzn\.to$|^a\.co$/;
const BOTS = /bot|crawl|spider|preview|facebookexternalhit|slurp|headless|python|curl|wget|scanner/i;

// Only Amazon links may be forwarded (otherwise /go/p could send people anywhere).
export function amazonTarget(u) {
  try { const url = new URL(u); return url.protocol === 'https:' && AMAZON_HOSTS.test(url.hostname) ? url.href : null; } catch { return null; }
}

const clean = (s, n) => String(s ?? '').replace(/[\r\n\t]/g, ' ').slice(0, n);
export function sourceName(ref) {
  const h = clean(ref, 200).toLowerCase();
  if (!h) return 'direct';
  for (const [name, re] of [['pinterest', /pinterest|pin\.it/], ['instagram', /instagram/], ['tiktok', /tiktok/], ['facebook', /facebook|fb\.com/], ['google', /google\./], ['bing', /bing\./]]) if (re.test(h)) return name;
  try { return new URL(h).hostname.replace(/^www\./, ''); } catch { return h.slice(0, 40); }
}

// Apps open links in their own in-app browser and usually hide where the visitor came from,
// but each one names itself in the browser's user agent.
const APPS = [['tiktok', /musical_ly|TikTok|BytedanceWebview|trill/i], ['instagram', /Instagram/], ['facebook', /FBAN|FBAV|FB_IAB/],
  ['pinterest', /Pinterest/], ['snapchat', /Snapchat/], ['threads', /Barcelona/], ['messenger', /Messenger/]];
export function appName(ua) {
  for (const [name, re] of APPS) if (re.test(ua ?? '')) return name;
  return null;
}

export async function recordClick(req, params) {
  const ua = req.headers['user-agent'] ?? '';
  if (BOTS.test(ua)) return;
  const row = {
    t: new Date().toISOString(),
    asin: clean(params.get('a'), 20),
    title: clean(params.get('t'), 80),
    from: clean(params.get('from'), 60),
    src: sourceName(params.get('s')) === 'direct' ? (appName(ua) ?? 'direct') : sourceName(params.get('s')),
    phone: /iphone|android|mobile/i.test(ua),
  };
  try { await mkdir(DATA_DIR, { recursive: true }); await appendFile(FILE, JSON.stringify(row) + '\n'); }
  catch (err) { console.error('Could not record click:', err.message); }
  console.log(`Click: ${row.title || row.asin} (from ${row.from || '?'}, ${row.src})`);
}

// Totals for /admin: today, last 7 days, last 30 days, plus top products, pages and sources (last 30 days).
export async function clickSummary() {
  let rows = [];
  try { rows = (await readFile(FILE, 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch {}
  const now = Date.now(), day = 86_400_000;
  const startOfToday = new Date(); startOfToday.setUTCHours(0, 0, 0, 0);
  const recent = rows.filter((r) => now - Date.parse(r.t) < 30 * day);
  const top = (key) => Object.entries(recent.reduce((m, r) => { const k = key(r) || '(unknown)'; m[k] = (m[k] ?? 0) + 1; return m; }, {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, count]) => ({ name, count }));
  return {
    today: rows.filter((r) => Date.parse(r.t) >= startOfToday.getTime()).length,
    week: rows.filter((r) => now - Date.parse(r.t) < 7 * day).length,
    month: recent.length,
    all: rows.length,
    products: top((r) => r.title || r.asin),
    pages: top((r) => r.from),
    sources: top((r) => r.src),
    latest: rows.slice(-15).reverse(),
  };
}
