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

// Header menu: campaigns marked "Show in menu" in /admin.
export async function renderNav() {
  const nav = document.querySelector('#nav');
  if (!nav) return;
  try {
    const { campaigns, topDeals } = await fetch('/api/campaigns').then((r) => r.json());
    const links = [
      ...campaigns.map((c) => ({ href: c.id === 'gift-guide' ? '/gift-guide' : `/c/${c.id}`, text: `${c.emoji} ${c.title}`.trim() })),
      ...(topDeals ? [{ href: '/deals', text: '🔥 Top Deals' }] : []),
    ];
    nav.replaceChildren(...links.map((l) => Object.assign(document.createElement('a'), {
      className: 'nav-link', href: l.href, textContent: l.text,
      ariaCurrent: location.pathname === l.href ? 'page' : null,
    })));
  } catch {}
}
