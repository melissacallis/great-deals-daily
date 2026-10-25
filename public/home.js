// Front page: the featured campaign (the Black Friday Watchlist by default),
// with a countdown to Black Friday while it's still ahead.
import { renderNav } from '/shared.js';

const $ = (sel) => document.querySelector(sel);
const BLACK_FRIDAY = new Date(2026, 10, 27); // Nov 27, 2026, local midnight

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.filter(Boolean));
  return node;
}

function smart(s) {
  return String(s).replace(/(\w)'(\w)/g, '$1’$2');
}

function card(pick, i) {
  const media = el('div', { className: 'watch-media' }, el('span', { className: 'watch-num', textContent: `#${i + 1}` }));
  const emoji = el('span', { className: 'emoji', textContent: pick.emoji || '🛍️' });
  if (pick.image) {
    const img = el('img', { src: pick.image, alt: pick.title, loading: 'lazy' });
    img.onerror = () => img.replaceWith(emoji);
    media.prepend(img);
  } else media.prepend(emoji);
  return el('a', { className: 'watch-card', href: pick.url, target: '_blank', rel: 'nofollow sponsored noopener' },
    media,
    el('div', { className: 'watch-body' },
      el('h3', { textContent: smart(pick.title) }),
      pick.why ? el('p', { textContent: smart(pick.why) }) : null,
      el('span', { className: 'cta', textContent: 'Check today’s price →' })));
}

function countdown() {
  const days = Math.ceil((BLACK_FRIDAY - new Date()) / 86_400_000);
  const box = $('#bf-countdown');
  if (days > 1) { $('#bf-time').textContent = `${days} days`; box.hidden = false; }
  else if (days === 1) { $('#bf-time').textContent = 'Tomorrow'; box.hidden = false; }
  else if (days === 0) { box.querySelector('.countdown-label').textContent = '🎉 It’s'; $('#bf-time').textContent = 'Black Friday'; box.hidden = false; }
  else box.hidden = true;
}

async function init() {
  renderNav();
  $('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#search-input').value.trim();
    if (q) location.href = `/deals?q=${encodeURIComponent(q)}`;
  });

  const res = await fetch('/api/featured');
  if (!res.ok) { location.replace('/deals'); return; }
  const c = await res.json();
  const isBlackFriday = /black friday/i.test(c.title) || c.id === 'black-friday';
  if (isBlackFriday) countdown();
  document.title = `${smart(c.title)} | Great Deals Daily`;
  $('#feat-eyebrow').textContent = isBlackFriday ? '🛍️ Black Friday 2026' : `${c.emoji || '⭐'} Featured`;
  const words = smart(c.title).split(' ');
  const last = words.pop();
  $('#feat-title').replaceChildren(document.createTextNode(words.length ? `${words.join(' ')} ` : ''), el('span', { className: 'hl', textContent: last }));
  if (c.intro) $('#feat-intro').textContent = smart(c.intro);
  $('#feat-heading').textContent = isBlackFriday ? 'On my watchlist' : `${c.emoji ? `${c.emoji} ` : ''}${smart(c.title)}`;

  const picks = c.sections.flatMap((s) => s.picks);
  $('#watch-grid').replaceChildren(...(picks.length
    ? picks.map(card)
    : [el('p', { className: 'empty', textContent: 'New picks are coming soon. Check back shortly!' })]));
}

init();
