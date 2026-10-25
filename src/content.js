// Campaigns and hand-picked products, edited from /admin.
// Stored as one JSON file on a persistent disk (a Railway volume in
// production); seeded from content/*.json the first time.
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = process.env.DATA_DIR ?? process.env.RAILWAY_VOLUME_MOUNT_PATH ?? path.join(APP_ROOT, 'data');
const FILE = path.join(DATA_DIR, 'content.json');

// The front page's "Today's Picks". It always exists and can't be deleted.
export const HOME_CAMPAIGN = 'todays-picks';

export function slugify(text) {
  return String(text).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '')
    .trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 60) || 'campaign';
}

const str = (v, max) => (v == null ? '' : String(v).trim().slice(0, max));

function normalizePick(p) {
  if (!p || !str(p.title) || !str(p.url)) return null;
  return {
    id: str(p.id, 40) || randomUUID(),
    title: str(p.title, 140),
    why: str(p.why, 600),
    url: str(p.url, 1000),
    emoji: str(p.emoji, 8) || '⭐',
  };
}

function normalizeSection(s, i) {
  return {
    id: slugify(s?.id || s?.title || `section-${i + 1}`),
    title: str(s?.title, 80),
    emoji: str(s?.emoji, 8),
    search: str(s?.search, 80),
    picks: (Array.isArray(s?.picks) ? s.picks : []).map(normalizePick).filter(Boolean).slice(0, 200),
  };
}

function normalizeCampaign(c) {
  const sections = (Array.isArray(c?.sections) ? c.sections : []).map(normalizeSection).slice(0, 30);
  return {
    id: slugify(c?.id || c?.title),
    title: str(c?.title, 100) || 'Untitled campaign',
    emoji: str(c?.emoji, 8),
    intro: str(c?.intro, 600),
    nav: Boolean(c?.nav),
    sections: sections.length ? sections : [normalizeSection({ id: 'main', title: '' }, 0)],
  };
}

// Accepts anything the admin page sends and returns a clean document.
export function normalizeContent(doc) {
  const seen = new Set();
  const campaigns = (Array.isArray(doc?.campaigns) ? doc.campaigns : [])
    .map(normalizeCampaign)
    .filter((c) => !seen.has(c.id) && seen.add(c.id))
    .slice(0, 50);
  if (!seen.has(HOME_CAMPAIGN)) {
    campaigns.unshift(normalizeCampaign({ id: HOME_CAMPAIGN, title: "Today's Picks", emoji: '⭐' }));
  }
  for (const c of campaigns) {
    const ids = new Set();
    c.sections = c.sections.filter((s) => !ids.has(s.id) && ids.add(s.id));
  }
  return { campaigns };
}

async function seed() {
  const read = async (f) => JSON.parse(await readFile(path.join(APP_ROOT, 'content', f), 'utf8'));
  const picks = await read('picks.json').catch(() => ({ picks: [] }));
  const guide = await read('gift-guide.json').catch(() => null);
  const campaigns = [{
    id: HOME_CAMPAIGN,
    title: "Today's Picks",
    emoji: '⭐',
    sections: [{ id: 'main', title: '', picks: (picks.picks ?? []).filter((p) => !p.example) }],
  }];
  if (guide) campaigns.push({ id: 'gift-guide', emoji: '🎁', nav: true, ...guide });
  return normalizeContent({ campaigns });
}

let cache = null;

export async function getContent() {
  if (cache) return cache;
  try {
    cache = normalizeContent(JSON.parse(await readFile(FILE, 'utf8')));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`Could not read ${FILE}, starting from defaults:`, err.message);
    cache = await seed();
  }
  return cache;
}

export async function saveContent(doc) {
  const clean = normalizeContent(doc);
  await mkdir(DATA_DIR, { recursive: true });
  // Write to a temp file first so a crash mid-write can't corrupt the data.
  const tmp = `${FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(clean, null, 2));
  await rename(tmp, FILE);
  cache = clean;
  return clean;
}

export const storageInfo = () => ({ dir: DATA_DIR, persistent: Boolean(process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH) });
