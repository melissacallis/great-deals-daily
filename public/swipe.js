// Story-style campaign browser for TikTok: one slide per campaign, swiped
// sideways; the tab bar mirrors the slide in view. /swipe#<campaign-id>
// opens straight on that campaign.
const $ = (sel) => document.querySelector(sel);
const track = $('#track');
const tabs = $('#tabs');

const DISCLOSURE = 'As an Amazon Associate I earn from qualifying purchases. Prices and availability change; check Amazon for the current price.';

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.filter(Boolean));
  return node;
}

function productCard(pick) {
  const media = el('div', { className: 'product-media' });
  const emoji = el('span', { className: 'big-emoji', textContent: pick.emoji });
  if (pick.image) {
    const img = el('img', { src: pick.image, alt: pick.title, loading: 'lazy' });
    img.onerror = () => { img.replaceWith(emoji); media.classList.add('no-img'); };
    media.append(img);
  } else {
    media.append(emoji);
    media.classList.add('no-img');
  }
  return el('a', { className: 'product', href: pick.url, target: '_blank', rel: 'nofollow sponsored noopener' },
    media,
    el('div', { className: 'product-body' },
      el('strong', { textContent: pick.title }),
      pick.why ? el('p', { textContent: pick.why }) : null,
      el('span', { className: 'cta', textContent: 'Shop on Amazon →' })));
}

function browseBox(section) {
  if (!section.browseUrl) return null;
  return el('div', { className: 'browse' },
    el('p', { textContent: `${section.picks.length ? 'More ideas' : 'Find ideas'}: shop “${section.search}” on Amazon` }),
    el('a', { className: 'cta', href: section.browseUrl, target: '_blank', rel: 'nofollow sponsored noopener', textContent: 'Browse on Amazon →' }));
}

function slideFor(campaign, i, all) {
  const body = [];
  const hasPicks = campaign.sections.some((s) => s.picks.length);
  for (const s of campaign.sections) {
    if (!s.picks.length && !s.browseUrl) continue;
    if (s.title) body.push(el('h2', { textContent: `${s.emoji} ${s.title}`.trim() }));
    body.push(...s.picks.map(productCard));
    body.push(browseBox(s));
  }
  if (!hasPicks && !body.some(Boolean)) body.push(el('div', { className: 'slide-empty', textContent: 'New picks coming soon. Swipe for more deals →' }));

  const next = all[i + 1];
  return el('section', { className: 'slide', id: `slide-${campaign.id}`, ariaLabel: campaign.title },
    el('div', { className: 'slide-inner' },
      el('div', { className: 'slide-head' },
        el('h1', { textContent: `${campaign.emoji} ${campaign.title}`.trim() }),
        campaign.intro ? el('p', { textContent: campaign.intro }) : null),
      ...body,
      next ? el('button', { className: 'next-up', type: 'button', textContent: `Next: ${next.emoji} ${next.title} →`, onclick: () => go(i + 1) }) : null,
      el('div', { className: 'slide-foot' },
        el('a', { href: '/', textContent: 'See all of today’s deals →' }),
        el('div', { textContent: DISCLOSURE }))));
}

let slides = [];
let current = 0;

function go(i, smooth = true) {
  i = Math.max(0, Math.min(slides.length - 1, i));
  track.scrollTo({ left: i * track.clientWidth, behavior: smooth ? 'smooth' : 'instant' });
}

function setCurrent(i) {
  if (i === current && tabs.children[i]?.ariaCurrent === 'true') return;
  current = i;
  [...tabs.children].forEach((t, j) => { t.ariaCurrent = String(j === i); });
  tabs.children[i]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  $('#count').textContent = `${i + 1} / ${slides.length}`;
  $('#prev').disabled = i === 0;
  $('#next').disabled = i === slides.length - 1;
  history.replaceState(null, '', `#${slides[i].id}`);
  if (i > 0) hideHint();
}

function hideHint() {
  $('#hint').hidden = true;
  try { localStorage.setItem('swipe-hint-seen', '1'); } catch {}
}

async function init() {
  const { slides: data } = await fetch('/api/swipe').then((r) => r.json());
  slides = data;
  track.replaceChildren(...slides.map(slideFor));
  tabs.replaceChildren(...slides.map((c, i) => el('button', {
    className: 'tab', type: 'button', textContent: `${c.emoji} ${c.title}`.trim(), onclick: () => go(i),
  })));

  // Track which slide is in view as the visitor swipes.
  const observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) setCurrent([...track.children].indexOf(e.target));
    }
  }, { root: track, threshold: 0.6 });
  [...track.children].forEach((s) => observer.observe(s));

  $('#prev').addEventListener('click', () => go(current - 1));
  $('#next').addEventListener('click', () => go(current + 1));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(current + 1);
    if (e.key === 'ArrowLeft') go(current - 1);
  });
  window.addEventListener('resize', () => go(current, false));

  const start = Math.max(0, slides.findIndex((s) => s.id === location.hash.slice(1)));
  setCurrent(start);
  requestAnimationFrame(() => go(start, false));

  let seen = false;
  try { seen = localStorage.getItem('swipe-hint-seen') === '1'; } catch {}
  if (!seen && slides.length > 1) {
    $('#hint').hidden = false;
    setTimeout(hideHint, 6000);
  }
}

init();
