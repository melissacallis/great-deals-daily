// Hand-picked product cards (Today's Picks and campaign pages), added in /admin.
// They carry no price; the photo is the owner's own or an Amazon-hosted image.
export function pickCard(pick) {
  const a = document.createElement('a');
  a.className = 'pick';
  a.href = pick.url;
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

// Header menu: a ☰ button that drops down the site's pages: Top 50 (the front page), Black Friday,
// then every campaign marked "Show in menu" in /admin.
export async function renderNav() {
  const nav = document.querySelector('#nav');
  if (!nav) return;
  try {
    const { campaigns, topDeals } = await fetch('/api/campaigns').then((r) => r.json());
    const bf = campaigns.find((c) => c.id === 'black-friday');
    const links = [
      ...(topDeals ? [{ href: '/', text: '🔥 Top 50 Deals' }] : []),
      { href: topDeals ? '/black-friday' : '/', text: `${bf?.emoji || '🛍️'} ${bf?.title || 'Black Friday'}` },
      ...campaigns.filter((c) => c.id !== 'black-friday')
        .map((c) => ({ href: c.id === 'gift-guide' ? '/gift-guide' : `/c/${c.id}`, text: `${c.emoji} ${c.title}`.trim() })),
      { href: '/swipe', text: '📱 Swipe every list' },
    ];
    const here = location.pathname.replace(/\/$/, '') || '/';
    const panel = Object.assign(document.createElement('div'), { className: 'menu-panel', id: 'menu-panel', hidden: true });
    panel.append(...links.map((l) => Object.assign(document.createElement('a'), {
      className: 'menu-link', href: l.href, textContent: l.text, ariaCurrent: here === l.href ? 'page' : null,
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
