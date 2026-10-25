import { pickCard, renderNav } from '/shared.js';

const $ = (sel) => document.querySelector(sel);
const grid = $('#grid');
const tpl = $('#card-tpl');

const state = { categories: [], category: 'top', query: '', items: [], sort: 'discount' };

const SORTERS = {
  discount: (a, b) => b.savingsPct - a.savingsPct,
  'price-asc': (a, b) => a.priceAmount - b.priceAmount,
  'price-desc': (a, b) => b.priceAmount - a.priceAmount,
  rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0),
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
  link.href = item.url;
  if (item.url === '#demo') { link.removeAttribute('target'); link.addEventListener('click', (e) => e.preventDefault()); }

  const img = node.querySelector('img');
  if (item.image) { img.src = item.image; img.alt = item.title; } else img.remove();

  const rank = node.querySelector('.rank');
  if (item.rank) rank.textContent = `#${item.rank}`; else rank.remove();

  const off = node.querySelector('.badge-off');
  if (item.savingsPct > 0) off.textContent = `-${item.savingsPct}%`; else off.remove();

  if (item.dealBadge) { const b = node.querySelector('.deal-badge'); b.textContent = item.dealBadge; b.hidden = false; }
  node.querySelector('.title').textContent = item.title;

  if (item.rating) {
    const r = node.querySelector('.rating');
    r.hidden = false;
    r.querySelector('.stars').textContent = stars(item.rating);
    r.querySelector('.count').textContent = `${item.rating.toFixed(1)}${item.reviewCount ? ` (${item.reviewCount.toLocaleString()})` : ''}`;
  }

  node.querySelector('.price').textContent = item.price;
  const list = node.querySelector('.list');
  if (item.listPrice) list.textContent = `${item.listPriceLabel}: ${item.listPrice}`; else list.remove();
  const save = node.querySelector('.save');
  if (item.savingsAmount > 0) save.textContent = `You save ${item.savingsDisplay ?? `$${item.savingsAmount.toFixed(2)}`}`; else save.remove();

  const left = item.dealEndsAt && timeLeft(item.dealEndsAt);
  if (left) { const e = node.querySelector('.ends'); e.textContent = left; e.hidden = false; }
  return node;
}

function render() {
  $('.sort').hidden = false;
  grid.replaceChildren();
  const items = [...state.items].sort(SORTERS[state.sort]);
  if (!items.length) {
    grid.innerHTML = '<p class="empty">No deals found right now. Try another category or search.</p>';
    return;
  }
  items.forEach((it) => grid.appendChild(renderCard(it)));
}

// Shown while the Amazon account is not yet approved for API access: send
// visitors to Amazon's own deals pages with the affiliate tag instead.
function renderFallback(url) {
  $('.sort').hidden = true;
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
    $('#updated').textContent = `Prices last updated ${new Date(data.updatedAt).toLocaleString()}.`;
  } catch (err) {
    grid.innerHTML = `<p class="empty">${err.message || 'Something went wrong loading deals.'}</p>`;
  }
}

function renderCategories() {
  const nav = $('#categories');
  nav.replaceChildren(...state.categories.map((c) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = `${c.icon} ${c.label}`;
    b.setAttribute('aria-pressed', String(!state.query && c.id === state.category));
    b.addEventListener('click', () => {
      state.category = c.id;
      state.query = '';
      $('#search-input').value = '';
      $('#results-title').textContent = c.label;
      history.replaceState(null, '', c.id === 'top' ? '/deals' : `/deals?category=${c.id}`);
      renderCategories();
      load();
    });
    return b;
  }));
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

async function loadPicks() {
  try {
    const { picks } = await fetch('/api/picks').then((r) => r.json());
    if (!picks.length) return;
    $('#picks').replaceChildren(...picks.map(pickCard));
    $('#picks-section').hidden = false;
  } catch {}
}

async function init() {
  startCountdown();
  loadPicks();
  renderNav();
  const config = await fetch('/api/config').then((r) => r.json());
  state.categories = config.categories;
  $('#site-name').textContent = config.siteName;
  $('#demo-banner').hidden = !config.demo;

  const param = new URLSearchParams(location.search).get('category');
  const initial = state.categories.find((c) => c.id === param) ?? state.categories[0];
  state.category = initial.id;
  $('#results-title').textContent = initial.label;
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
