// Hand-picked product cards (Today's Picks and the Gift Guide). These come
// from content/*.json, so they carry no price or Amazon photo.
export function pickCard(pick) {
  const a = document.createElement('a');
  a.className = 'pick';
  a.href = pick.url;
  a.target = '_blank';
  a.rel = 'nofollow sponsored noopener';
  a.innerHTML = '<span class="pick-emoji"></span><span class="pick-body"><strong class="pick-title"></strong><span class="pick-why"></span><span class="pick-cta">Check today\'s price on Amazon →</span></span>';
  a.querySelector('.pick-emoji').textContent = pick.emoji;
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
    const { campaigns } = await fetch('/api/campaigns').then((r) => r.json());
    nav.replaceChildren(...campaigns.map((c) => Object.assign(document.createElement('a'), {
      className: 'nav-link',
      href: c.id === 'gift-guide' ? '/gift-guide' : `/c/${c.id}`,
      textContent: `${c.emoji} ${c.title}`.trim(),
    })));
  } catch {}
}
