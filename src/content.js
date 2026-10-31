// Campaigns and hand-picked products, edited from /admin.
// Stored as one JSON file on a persistent disk (a Railway volume in
// production); seeded from content/*.json the first time.
import { readFile, writeFile, mkdir, rename, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = process.env.DATA_DIR ?? process.env.RAILWAY_VOLUME_MOUNT_PATH ?? path.join(APP_ROOT, 'data');
const FILE = path.join(DATA_DIR, 'content.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

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
    image: str(p.image, 1000),
    ...(Number.isInteger(Number(p.rank)) && Number(p.rank) > 0 ? { rank: Number(p.rank) } : {}), // countdown number, e.g. 50
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
    featured: Boolean(c?.featured),
    home: Boolean(c?.home), // also shown on the front page, below the featured campaign
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
  const firstFeatured = campaigns.find((c) => c.featured);
  for (const c of campaigns) c.featured = c === firstFeatured;
  for (const c of campaigns) {
    const ids = new Set();
    c.sections = c.sections.filter((s) => !ids.has(s.id) && ids.add(s.id));
  }
  const appliedSeeds = [...new Set((Array.isArray(doc?.appliedSeeds) ? doc.appliedSeeds : []).map((s) => str(s, 80)).filter(Boolean))];
  return { campaigns, appliedSeeds };
}

// One-time campaign imports: each content/seeds/<id>.json adds its campaign
// the first time the site starts with it, then is recorded in appliedSeeds,
// so deleting the campaign in /admin doesn't bring it back.
async function applySeeds(doc) {
  const dir = path.join(APP_ROOT, 'content', 'seeds');
  const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith('.json')).sort();
  // new campaigns first, then patches that change them
  const isPatch = async (f) => 'patch' in JSON.parse(await readFile(path.join(dir, f), 'utf8').catch(() => '{}'));
  const flags = await Promise.all(files.map(isPatch));
  files.sort((x, y) => flags[files.indexOf(x)] - flags[files.indexOf(y)]);
  let changed = false;
  for (const file of files) {
    const id = file.replace(/\.json$/, '');
    if (doc.appliedSeeds.includes(id)) continue;
    try {
      const { campaign, patch } = JSON.parse(await readFile(path.join(dir, file), 'utf8'));
      if (patch) {
        // A patch seed changes settings on a campaign that already exists, e.g. { "id": "amazon-haul", "home": true }.
        const target = doc.campaigns.find((c) => c.id === patch.id);
        if (!target) continue; // try again on a later start, once the campaign exists
        for (const key of ['title', 'emoji', 'intro', 'nav', 'featured', 'home']) if (key in patch) target[key] = patch[key];
        // "addPicks": { "<section id>": [products] } adds products to a section, skipping ones already there (by title)
        for (const [sectionId, picks] of Object.entries(patch.addPicks ?? {})) {
          const section = target.sections.find((x) => x.id === sectionId);
          if (!section) continue;
          const have = new Set(section.picks.map((x) => x.title.toLowerCase()));
          section.picks.push(...picks.map(normalizePick).filter((x) => x && !have.has(x.title.toLowerCase())));
        }
        doc.appliedSeeds.push(id);
        changed = true;
        console.log(`Updated campaign "${target.title}" from content/seeds/${file}`);
        continue;
      }
      const clean = normalizeCampaign(campaign);
      const existing = doc.campaigns.find((c) => c.id === clean.id);
      if (!existing) {
        doc.campaigns.push(clean);
      } else {
        // Campaign already made by hand: add the imported products to its first
        // section, skipping any it already has (matched by title).
        const have = new Set(existing.sections.flatMap((s) => s.picks).map((p) => p.title.toLowerCase()));
        const add = clean.sections.flatMap((s) => s.picks).filter((p) => !have.has(p.title.toLowerCase()));
        existing.sections[0].picks.push(...add);
      }
      doc.appliedSeeds.push(id);
      changed = true;
      console.log(`Imported campaign "${clean.title}" from content/seeds/${file}`);
    } catch (err) {
      console.error(`Could not import content/seeds/${file}:`, err.message);
    }
  }
  return changed;
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

async function readStored() {
  try { return normalizeContent(JSON.parse(await readFile(FILE, 'utf8'))); } catch { return null; }
}

export async function getContent() {
  if (cache) return cache;
  try {
    cache = normalizeContent(JSON.parse(await readFile(FILE, 'utf8')));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`Could not read ${FILE}, starting from defaults:`, err.message);
    cache = await seed();
  }
  if (await applySeeds(cache)) await saveContent(cache);
  return cache;
}

export async function saveContent(doc) {
  // The admin page sends only campaigns; keep the record of applied imports.
  const prior = cache ?? await readStored();
  const clean = normalizeContent({ ...doc, appliedSeeds: [...(doc.appliedSeeds ?? []), ...(prior?.appliedSeeds ?? [])] });
  await mkdir(DATA_DIR, { recursive: true });
  // Write to a temp file first so a crash mid-write can't corrupt the data.
  const tmp = `${FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(clean, null, 2));
  await rename(tmp, FILE);
  cache = clean;
  return clean;
}

export const storageInfo = () => ({ dir: DATA_DIR, persistent: Boolean(process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH) });
