// The site counts product taps (which deal, on which page) without slowing the trip to Amazon.
// Only with cookie consent does it also remember and report which app/site the visitor came from (e.g. a Pinterest pin).
import { hasConsent } from '/consent.js';
let landingSource = '';
function rememberSource() {
  if (!hasConsent()) return;
  try {
    landingSource = sessionStorage.getItem('src') ?? '';
    if (!landingSource && document.referrer && new URL(document.referrer).host !== location.host) {
      landingSource = document.referrer; sessionStorage.setItem('src', landingSource);
    }
  } catch {}
}
rememberSource();
document.addEventListener('consentchange', rememberSource);
// Product links point straight at Amazon, so a tap opens the product itself (on iPhone an extra redirect hop
// can make the Amazon app open on its home page). The tap is counted in the background with a beacon to /go/t.
const tapInfo = new Map();
export function goLink(url, { asin = '', title = '' } = {}) {
  if (!url || !/^https:\/\/((www\.)?amazon\.com|amzn\.to|a\.co)\//.test(url)) return url;
  tapInfo.set(url, { asin, title });
  return url;
}
function recordTap(e) {
  const a = e.target.closest?.('a[href]');
  if (!a || !tapInfo.has(a.href) && !tapInfo.has(a.getAttribute('href'))) return;
  const href = a.getAttribute('href'), { asin, title } = tapInfo.get(href) ?? tapInfo.get(a.href);
  const q = new URLSearchParams({ u: href, a: asin, t: String(title).slice(0, 80), from: location.pathname });
  if (hasConsent()) { q.set('s', landingSource.slice(0, 200)); q.set('c', '1'); }
  try { if (navigator.sendBeacon?.(`/go/t?${q}`)) return; } catch {}
  fetch(`/go/t?${q}`, { method: 'POST', keepalive: true }).catch(() => {});
}
document.addEventListener('click', recordTap, true);
document.addEventListener('auxclick', (e) => { if (e.button === 1) recordTap(e); }, true);

// Hand-picked product cards (Today's Picks and campaign pages), added in /admin.
// They carry no price; the photo is the owner's own or an Amazon-hosted image.
export function pickCard(pick) {
  const a = document.createElement('a');
  a.className = 'pick';
  a.href = goLink(pick.url, { title: pick.title });
  a.target = '_blank';
  a.rel = 'nofollow sponsored noopener';
  a.innerHTML = '<span class="pick-emoji"></span><span class="pick-body"><strong class="pick-title"></strong><span class="pick-why"></span><span class="pick-cta">See it on Amazon →</span></span>';
  const emoji = a.querySelector('.pick-emoji');
  if (pick.image) {
    const img = Object.assign(document.createElement('img'), { className: 'pick-img', src: pick.image, alt: pick.title, loading: 'lazy' });
    emoji.textContent = pick.emoji;
    img.onerror = () => img.replaceWith(emoji); // fall back to the emoji if the photo can't load
    emoji.replaceWith(img);
  } else {
    emoji.textContent = pick.emoji;
  }
  a.querySelector('.pick-title').textContent = pick.title;
  const why = a.querySelector('.pick-why');
  if (pick.why) why.textContent = pick.why; else why.remove();
  return a;
}

// Header menu: a ☰ button that drops down the site's pages: Top 100 (the front page), Black Friday,
// then every campaign marked "Show in menu" in /admin.
export async function renderNav() {
  const nav = document.querySelector('#nav');
  if (!nav) return;
  try {
    const { campaigns, topDeals, topLists = [] } = await fetch('/api/campaigns').then((r) => r.json());
    const bf = campaigns.find((c) => c.id === 'black-friday');
    const links = [
      ...(topDeals ? [{ href: '/', text: '🔥 Top 100 Deals' }] : []),
      ...topLists.map((t) => ({ href: `/top/${t.id}`, text: `${t.icon} Top 100 ${t.label}`, sub: true })),
      { href: topDeals ? '/black-friday' : '/', text: `${bf?.emoji || '🛍️'} ${bf?.title || 'Black Friday'}` },
      ...campaigns.filter((c) => c.id !== 'black-friday')
        .map((c) => ({ href: c.id === 'gift-guide' ? '/gift-guide' : `/c/${c.id}`, text: `${c.emoji} ${c.title}`.trim() })),
      { href: '/swipe', text: '📱 Swipe every list' },
    ];
    const here = location.pathname.replace(/\/$/, '') || '/';
    const panel = Object.assign(document.createElement('div'), { className: 'menu-panel', id: 'menu-panel', hidden: true });
    panel.append(...links.map((l) => Object.assign(document.createElement('a'), {
      className: l.sub ? 'menu-link menu-sub' : 'menu-link', href: l.href, textContent: l.text, ariaCurrent: here === l.href ? 'page' : null,
    })));
    const btn = Object.assign(document.createElement('button'), { className: 'menu-btn', type: 'button', innerHTML: '<span class="burger" aria-hidden="true"><i></i><i></i><i></i></span>Menu' });
    btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'menu-panel');
    const toggle = (open) => { panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(panel.hidden); });
    document.addEventListener('click', (e) => { if (!nav.contains(e.target)) toggle(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
    nav.replaceChildren(btn, panel);
  } catch {}
}
