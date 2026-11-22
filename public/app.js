import { pickCard, renderNav, goLink } from '/shared.js';

const $ = (sel) => document.querySelector(sel);
const grid = $('#grid');
const tpl = $('#card-tpl');

const state = { categories: [], category: 'top', query: '', items: [], sort: 'discount' };

const SORTERS = {
  discount: (a, b) => b.savingsPct - a.savingsPct,
  'price-asc': (a, b) => a.priceAmount - b.priceAmount,
  'price-desc': (a, b) => b.priceAmount - a.priceAmount,
  rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0),
  new: (a, b) => (b.newToday ? 1 : 0) - (a.newToday ? 1 : 0) || b.savingsPct - a.savingsPct,
};

function stars(value) {
  const full = Math.round(value);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function timeLeft(iso) {
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return h > 0 ? `Ends in ${h}h ${m}m` : `Ends in ${m}m`;
}

function renderCard(item) {
  const node = tpl.content.cloneNode(true);
  const link = node.querySelector('.card-link');
  link.href = goLink(item.url, { asin: item.asin, title: item.title });
  if (item.url === '#demo') { link.removeAttribute('target'); link.addEventListener('click', (e) => e.preventDefault()); }

  const img = node.querySelector('img');
  if (item.image) { img.src = item.image; img.alt = item.title; } else img.remove();

  const rank = node.querySelector('.rank');
  if (item.rank) rank.textContent = `#${item.rank}`; else rank.remove();

  const off = node.querySelector('.badge-off');
  if (item.savingsPct > 0) off.textContent = `-${item.savingsPct}%`; else off.remove();

  if (item.dealBadge) { const b = node.querySelector('.deal-badge'); b.textContent = item.dealBadge; b.hidden = false; }
  if (item.newToday) node.querySelector('.card-img').append(Object.assign(document.createElement('span'), { className: 'new-badge', textContent: '🆕 New today' }));
  node.querySelector('.title').textContent = item.title;

  if (item.rating) {
    const r = node.querySelector('.rating');
    r.hidden = false;
    r.querySelector('.stars').textContent = stars(item.rating);
    r.querySelector('.count').textContent = `${item.rating.toFixed(1)}${item.reviewCount ? ` (${item.reviewCount.toLocaleString()})` : ''}`;
  }

  node.querySelector('.price').textContent = item.price;
  const list = node.querySelector('.list');
  if (item.listPrice) list.textContent = `${String(item.listPriceLabel).replace(/:\s*$/, "")}: ${item.listPrice}`; else list.remove(); // Amazon labels often end in ":" already
  const save = node.querySelector('.save');
  if (item.savingsAmount > 0) save.textContent = `You save ${item.savingsDisplay ?? `$${item.savingsAmount.toFixed(2)}`}`; else save.remove();

  const left = item.dealEndsAt && timeLeft(item.dealEndsAt);
  if (left) { const e = node.querySelector('.ends'); e.textContent = left; e.hidden = false; }
  const share = node.querySelector('.share-btn');
  if (item.url === '#demo') share.remove(); else share.addEventListener('click', () => shareDeal(item, share));
  return node;
}

// Share button: the phone's share sheet (Messages, Facebook, Pinterest…) where it exists, otherwise copy the link.
// The shared link is the Amazon product link with the affiliate tag, so a friend's purchase still counts.
async function shareDeal(item, btn) {
  const short = item.title.split(/[|,(]/)[0].trim().slice(0, 80);
  const text = `${short}${item.savingsPct > 0 ? ` — ${item.savingsPct}% off right now` : ''} 🛍️ Found on UBottega (more deals: ubottega.com)`;
  const url = item.url;
  try { navigator.sendBeacon?.(`/go/share?a=${encodeURIComponent(item.asin)}&t=${encodeURIComponent(short)}`); } catch {}
  if (navigator.share) {
    try { await navigator.share({ title: short, text, url }); } catch { /* closed the share sheet */ }
    return;
  }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); flash(btn, '✓ Link copied'); }
  catch { window.prompt('Copy this link:', url); }
}

function flash(btn, msg) {
  const label = btn.querySelector('span'); const old = label.textContent;
  label.textContent = msg; btn.classList.add('done');
  setTimeout(() => { label.textContent = old; btn.classList.remove('done'); }, 1800);
}

// Filters under the toolbar: price range, minimum discount, new today. (Amazon's feed has no star ratings for us.)
const filters = { price: '', off: 0, fresh: false };
const filtering = () => filters.price || filters.off || filters.fresh;
function passes(it) {
  if (filters.price) {
    const [lo, hi] = filters.price.split('-').map((v) => (v === '' ? null : Number(v)));
    if (lo != null && it.priceAmount < lo) return false;
    if (hi != null && it.priceAmount > hi) return false;
  }
  if (filters.off && it.savingsPct < filters.off) return false;
  if (filters.fresh && !it.newToday) return false;
  return true;
}

function render() {
  $('.sort').hidden = false;
  $('#filters').hidden = false;
  grid.replaceChildren();
  const all = [...state.items].sort(SORTERS[state.sort]);
  const items = all.filter(passes);
  $('#f-count').textContent = filtering() ? `${items.length} of ${all.length} deals` : `${all.length} deals`;
  $('#f-clear').hidden = !filtering();
  if (!items.length) {
    grid.innerHTML = filtering() && all.length
      ? '<p class="empty">No deals match these filters. Try a wider price range or a smaller discount.</p>'
      : '<p class="empty">No deals found right now. Try another category or search.</p>';
    return;
  }
  items.forEach((it) => grid.appendChild(renderCard(it)));
}

// Shown while the Amazon account is not yet approved for API access: send
// visitors to Amazon's own deals pages with the affiliate tag instead.
function renderFallback(url) {
  $('.sort').hidden = true;
  $('#filters').hidden = true;
  grid.innerHTML = `
    <div class="fallback">
      <h3>Today's deals are live on Amazon</h3>
      <p>We're getting our hand-picked list ready. In the meantime, browse the latest discounts straight on Amazon.</p>
      <a class="cta" target="_blank" rel="nofollow sponsored noopener">Browse deals on Amazon →</a>
    </div>`;
  grid.querySelector('a').href = url;
}

function showSkeletons() {
  grid.replaceChildren(...Array.from({ length: 8 }, () => Object.assign(document.createElement('div'), { className: 'skeleton' })));
}

async function load() {
  showSkeletons();
  $('#updated').textContent = '';
  const url = state.query
    ? `/api/search?q=${encodeURIComponent(state.query)}`
    : `/api/deals?category=${state.category}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.notEligible) return renderFallback(data.fallbackUrl);
    state.items = data.items.map((it, i) => (data.ranked ? { ...it, rank: i + 1 } : it));
    render();
    const fresh = (data.items || []).filter((x) => x.newToday).length;
    $('#updated').textContent = `Prices last updated ${new Date(data.updatedAt).toLocaleString()}.${fresh ? ` 🆕 ${fresh} new today.` : ''}`;
  } catch (err) {
    grid.innerHTML = `<p class="empty">${err.message || 'Something went wrong loading deals.'}</p>`;
  }
}

// Each list is its own page: / for the Top 100, /top/<id> for the others (For Her, For Him, Kids …).
const pageFor = (c) => (c.id === 'top' ? '/' : `/top/${c.id}`);

function renderCategories() {
  const nav = $('#categories');
  const current = state.categories.find((c) => c.id === state.category);
  const parentId = current?.parent ?? current?.id; // on /top/him-fishing the main row highlights For Him
  const chip = (c, text, on) => {
    const a = document.createElement('a');
    a.className = 'chip';
    a.href = pageFor(c);
    a.textContent = text;
    if (!state.query && on) a.setAttribute('aria-current', 'page');
    return a;
  };
  nav.replaceChildren(...state.categories.filter((c) => !c.parent).map((c) => chip(c, `${c.icon} ${c.label}`, c.id === parentId)));
  // Sub-lists (For Him: Sports, Fishing, FR Work Clothes) get their own smaller row under the main one.
  const sub = $('#subcategories');
  const kids = state.categories.filter((c) => c.parent && c.parent === parentId);
  if (sub) {
    sub.hidden = !kids.length;
    const parent = state.categories.find((c) => c.id === parentId);
    sub.replaceChildren(...(kids.length ? [chip(parent, `All ${parent.label}`, state.category === parentId), ...kids.map((c) => chip(c, `${c.icon} ${c.label}`, c.id === state.category))] : []));
  }
  // Bring the current chip into view sideways only (scrollIntoView would also scroll the page down).
  const cur = nav.querySelector('[aria-current]');
  if (cur) nav.scrollLeft = cur.offsetLeft - nav.offsetLeft - (nav.clientWidth - cur.offsetWidth) / 2;
}

// On a list page, the hero says which Top 100 this is.
function setPageHeader(cat) {
  if (cat.id === 'top') return;
  document.title = `${cat.title} | UBottega`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', cat.intro ?? cat.title);
  const h1 = $('.hero h1');
  // "Top 100 Deals for Her" -> "Top 100 " + highlighted "Deals for Her"; "Top 100 Gifts Under $10" -> "Top 100 " + "Gifts Under $10"
  const [, plain, hl] = cat.title.match(/^(.*?)((?:Deals|Gifts)\b.*)$/) ?? [null, cat.title, ''];
  h1.replaceChildren(`${cat.icon} ${plain}`, Object.assign(document.createElement('span'), { className: 'hl', textContent: hl }));
  if (cat.intro) $('.hero .lede').textContent = cat.intro;
}

function startCountdown() {
  const tick = () => {
    const now = new Date();
    const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
    const s = Math.floor((midnight - now) / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    $('#countdown').textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
  };
  tick();
  setInterval(tick, 1000);
}

$('#search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#search-input').value.trim();
  if (!q) return;
  state.query = q;
  $('#results-title').textContent = `Results for “${q}”`;
  renderCategories();
  load();
});

$('#sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
$('#f-price').addEventListener('change', (e) => { filters.price = e.target.value; render(); });
$('#f-off').addEventListener('change', (e) => { filters.off = Number(e.target.value) || 0; render(); });
$('#f-new').addEventListener('change', (e) => { filters.fresh = e.target.checked; render(); });
$('#f-clear').addEventListener('click', () => {
  Object.assign(filters, { price: '', off: 0, fresh: false });
  $('#f-price').value = ''; $('#f-off').value = ''; $('#f-new').checked = false;
  render();
});

// Today's Picks: the top 3 deals of the Top 100 (live from Amazon, updates hourly) first, then the hand-picked products.
const PICK_BADGES = ['🔥 Best deal today', '🥈 #2 today', '🥉 #3 today'];
async function loadPicks() {
  const cards = [];
  try {
    const top = await fetch('/api/deals?category=top').then((r) => r.json());
    // the owner's spotlighted products take the last slot(s) of the three
    const spot = (top.homePicks || []).slice(0, 2);
    const ids = new Set(spot.map((it) => it.asin));
    (top.items || []).filter((it) => !ids.has(it.asin)).slice(0, 3 - spot.length).forEach((item, i) => {
      const node = renderCard({ ...item, rank: null, dealBadge: PICK_BADGES[i] });
      if (i === 0) node.querySelector('.card').classList.add('best-deal');
      cards.push(node);
    });
    spot.forEach((item) => cards.push(renderCard({ ...item, rank: null, dealBadge: "💖 Data Darling's pick" })));
  } catch {}
  try {
    const { picks } = await fetch('/api/picks').then((r) => r.json());
    cards.push(...picks.map(pickCard));
  } catch {}
  if (!cards.length) return;
  $('#picks').replaceChildren(...cards);
  $('#picks-section').hidden = false;
}

// Deal bubbles around the portrait: the owner's featured deals first (e.g. the $1.99 tracksuit), then the biggest discounts.
const BUBBLE_SPOTS = [[-62, .4], [-14, .42], [34, .4], [146, .41], [196, .42], [244, .4]]; // [angle from top in degrees, distance from center]
async function loadBubbles() {
  const orbit = $('#orbit');
  if (!orbit) return;
  let items = [];
  try { items = (await fetch('/api/deals?category=top').then((r) => r.json())).items ?? []; } catch { return; }
  const withImg = items.filter((it) => it.image && it.url && it.url !== '#demo');
  const chosen = [...withImg.filter((it) => it.featured), ...withImg.filter((it) => !it.featured)].slice(0, BUBBLE_SPOTS.length);
  chosen.forEach((it, i) => {
    const [deg, r] = BUBBLE_SPOTS[i], rad = (deg * Math.PI) / 180;
    const a = document.createElement('a');
    a.className = 'bubble' + (it.featured ? ' hot' : '');
    a.href = goLink(it.url, { asin: it.asin, title: it.title });
    a.target = '_blank'; a.rel = 'nofollow sponsored noopener';
    a.title = it.title; a.setAttribute('aria-label', `${it.title}, ${it.price}`);
    a.style.left = `${50 + Math.sin(rad) * r * 100}%`;
    a.style.top = `${50 - Math.cos(rad) * r * 100}%`;
    a.style.animationDelay = `${0.9 + i * 0.12}s, ${i * 0.7}s`;
    const img = document.createElement('img'); img.src = it.image; img.alt = ''; img.loading = 'lazy';
    const tag = document.createElement('span'); tag.className = 'bubble-tag'; tag.textContent = (it.featured ? '🔥 ' : '') + it.price;
    a.append(img, tag);
    if (it.savingsPct) { const off = document.createElement('span'); off.className = 'bubble-off'; off.textContent = `-${it.savingsPct}%`; a.append(off); }
    orbit.append(a);
  });
}

async function init() {
  startCountdown();
  renderNav();
  loadBubbles();
  const config = await fetch('/api/config').then((r) => r.json());
  state.categories = config.categories;
  $('#site-name').textContent = config.siteName;
  $('#demo-banner').hidden = !config.demo;

  const param = location.pathname.match(/^\/top\/([\w-]+)/)?.[1] ?? new URLSearchParams(location.search).get('category');
  const initial = state.categories.find((c) => c.id === param) ?? state.categories[0];
  state.category = initial.id;
  $('#results-title').textContent = initial.id === 'top' ? 'Top 100 Deals' : `${initial.icon} ${initial.label}`;
  setPageHeader(initial);
  if (initial.id === 'top') loadPicks(); // Today's Picks only on the front page
  const q = new URLSearchParams(location.search).get('q');
  if (q) {
    state.query = q;
    $('#search-input').value = q;
    $('#results-title').textContent = `Results for “${q}”`;
  }
  renderCategories();
  load();
}

init();
