// TikTok "link in bio" page. Each campaign is a row of product cards that
// swipes sideways; tapping a card opens a full-size viewer where visitors
// swipe through that campaign's products one at a time.
// /swipe#<campaign-id> scrolls straight to that campaign.
const $ = (sel) => document.querySelector(sel);

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.filter(Boolean));
  return node;
}

// A photo with an emoji fallback if it's missing or fails to load.
function media(className, item) {
  const box = el('div', { className });
  const emoji = el('span', { className: 'emoji', textContent: item.emoji || '🛍️' });
  if (item.image) {
    const img = el('img', { src: item.image, alt: item.title, loading: 'lazy' });
    img.onerror = () => { img.replaceWith(emoji); box.classList.add('no-img'); };
    box.append(img);
  } else {
    box.append(emoji);
    box.classList.add('no-img');
  }
  return box;
}

// Flatten a campaign into one list: its products, then a "browse on Amazon"
// card for each section that has a search.
function itemsFor(campaign) {
  const items = [];
  for (const s of campaign.sections) {
    const label = s.title ? `${s.emoji} ${s.title}`.trim() : '';
    for (const p of s.picks) items.push({ kind: 'pick', section: label, ...p });
  }
  for (const s of campaign.sections) {
    if (s.browseUrl) items.push({ kind: 'browse', section: s.title ? `${s.emoji} ${s.title}`.trim() : '', emoji: s.emoji || '🔎', title: s.picks.length ? `More ${s.title || 'ideas'}` : (s.title || 'Find ideas'), search: s.search, url: s.browseUrl });
  }
  return items;
}

const external = { target: '_blank', rel: 'nofollow sponsored noopener' };

function tile(item, onOpen) {
  if (item.kind === 'browse') {
    return el('a', { className: 'tile browse-tile', href: item.url, ...external },
      el('span', { className: 'emoji', textContent: item.emoji }),
      el('strong', { textContent: item.title }),
      el('span', { textContent: `Shop “${item.search}” on Amazon →` }));
  }
  return el('button', { className: 'tile', type: 'button', onclick: onOpen, ariaLabel: `${item.title}, open` },
    media('tile-media', item),
    el('div', { className: 'tile-body' },
      item.section ? el('span', { className: 'tile-section', textContent: item.section }) : null,
      el('span', { className: 'tile-title', textContent: item.title }),
      el('span', { className: 'tile-tap', textContent: 'Tap to see more →' })));
}

function viewerSlide(item) {
  if (item.kind === 'browse') {
    return el('section', { className: 'viewer-slide' },
      el('div', { className: 'viewer-card' },
        el('div', { className: 'viewer-media no-img' }, el('span', { className: 'emoji', textContent: item.emoji })),
        item.section ? el('span', { className: 'viewer-section', textContent: item.section }) : null,
        el('h3', { textContent: item.title }),
        el('p', { textContent: `See popular picks for “${item.search}” on Amazon.` }),
        el('a', { className: 'cta', href: item.url, ...external, textContent: 'Browse on Amazon →' })));
  }
  return el('section', { className: 'viewer-slide' },
    el('div', { className: 'viewer-card' },
      media('viewer-media', item),
      item.section ? el('span', { className: 'viewer-section', textContent: item.section }) : null,
      el('h3', { textContent: item.title }),
      item.why ? el('p', { textContent: item.why }) : null,
      el('a', { className: 'cta', href: item.url, ...external, textContent: 'Shop on Amazon →' })));
}

// --- Full-size viewer ---------------------------------------------------

const viewer = { items: [], index: 0, observer: null };
const track = $('#viewer-track');

function showViewerIndex(i) {
  viewer.index = i;
  $('#viewer-count').textContent = `${i + 1} of ${viewer.items.length}`;
  [...$('#viewer-dots').children].forEach((d, j) => d.classList.toggle('on', j === i));
  $('#prev').disabled = i === 0;
  $('#next').disabled = i === viewer.items.length - 1;
  if (i > 0) hideHint();
}

function goViewer(i, smooth = true) {
  i = Math.max(0, Math.min(viewer.items.length - 1, i));
  track.scrollTo({ left: i * track.clientWidth, behavior: smooth ? 'smooth' : 'instant' });
}

function openViewer(campaign, items, start) {
  viewer.items = items;
  $('#viewer-title').textContent = `${campaign.emoji} ${campaign.title}`.trim();
  track.replaceChildren(...items.map(viewerSlide));
  $('#viewer-dots').replaceChildren(...(items.length <= 20 ? items.map(() => el('i')) : []));
  $('#viewer').hidden = false;
  document.body.classList.add('viewer-open');

  viewer.observer?.disconnect();
  viewer.observer = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) showViewerIndex([...track.children].indexOf(e.target));
  }, { root: track, threshold: 0.6 });
  [...track.children].forEach((s) => viewer.observer.observe(s));

  showViewerIndex(start);
  requestAnimationFrame(() => goViewer(start, false));
  $('#viewer-close').focus();

  // So the phone's Back button closes the viewer instead of leaving the page.
  history.pushState({ viewer: true }, '');

  let seen = false;
  try { seen = localStorage.getItem('viewer-hint-seen') === '1'; } catch {}
  if (!seen && items.length > 1) {
    $('#hint').hidden = false;
    setTimeout(hideHint, 5000);
  }
}

function closeViewer() {
  if ($('#viewer').hidden) return;
  $('#viewer').hidden = true;
  document.body.classList.remove('viewer-open');
  viewer.observer?.disconnect();
  track.replaceChildren();
  hideHint();
}

function hideHint() {
  if ($('#hint').hidden) return;
  $('#hint').hidden = true;
  try { localStorage.setItem('viewer-hint-seen', '1'); } catch {}
}

$('#viewer-close').addEventListener('click', () => history.back());
window.addEventListener('popstate', closeViewer);
$('#prev').addEventListener('click', () => goViewer(viewer.index - 1));
$('#next').addEventListener('click', () => goViewer(viewer.index + 1));
document.addEventListener('keydown', (e) => {
  if ($('#viewer').hidden) return;
  if (e.key === 'Escape') history.back();
  if (e.key === 'ArrowRight') goViewer(viewer.index + 1);
  if (e.key === 'ArrowLeft') goViewer(viewer.index - 1);
});
window.addEventListener('resize', () => { if (!$('#viewer').hidden) goViewer(viewer.index, false); });

// --- Campaign rows ------------------------------------------------------

function row(campaign) {
  const items = itemsFor(campaign);
  const picks = items.filter((i) => i.kind === 'pick');
  return el('section', { className: 'row', id: campaign.id, ariaLabel: campaign.title },
    el('div', { className: 'row-head' },
      el('h2', { textContent: `${campaign.emoji} ${campaign.title}`.trim() }),
      picks.length ? el('span', { className: 'row-count', textContent: `${picks.length} pick${picks.length === 1 ? '' : 's'} · swipe →` }) : null),
    campaign.intro ? el('p', { className: 'row-intro', textContent: campaign.intro }) : null,
    el('div', { className: 'strip' }, ...items.map((item, i) => tile(item, () => openViewer(campaign, items, i)))));
}

function highlightTab(id) {
  [...$('#tabs').children].forEach((t) => {
    const on = t.dataset.id === id;
    t.ariaCurrent = String(on);
    if (on) t.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  });
}

async function init() {
  const { slides } = await fetch('/api/swipe').then((r) => r.json());
  // Skip campaigns with nothing to show.
  const campaigns = slides.filter((c) => itemsFor(c).length);
  if (!campaigns.length) {
    $('#rows').replaceChildren(el('p', { className: 'empty-rows', textContent: 'New picks are coming soon. Check back shortly!' }));
    return;
  }
  $('#rows').replaceChildren(...campaigns.map(row));
  $('#tabs').replaceChildren(...campaigns.map((c) => el('button', {
    className: 'tab', type: 'button', textContent: `${c.emoji} ${c.title}`.trim(),
    onclick: () => {
      document.getElementById(c.id).scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(history.state, '', `#${c.id}`);
    },
  })));
  [...$('#tabs').children].forEach((t, i) => { t.dataset.id = campaigns[i].id; });

  // Highlight the campaign sitting just under the menu bar as the visitor scrolls.
  const rows = [...document.querySelectorAll('.row')];
  let ticking = false;
  const update = () => {
    ticking = false;
    const line = $('.swipe-header').offsetHeight + 40;
    const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    const current = atBottom ? rows.at(-1) : rows.filter((r) => r.getBoundingClientRect().top <= line).at(-1) ?? rows[0];
    highlightTab(current.id);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });

  const start = location.hash.slice(1);
  if (start && document.getElementById(start)) document.getElementById(start).scrollIntoView({ block: 'start' });
  requestAnimationFrame(update);
}

init();
