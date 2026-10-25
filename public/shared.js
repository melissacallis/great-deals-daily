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
    const { campaigns } = await fetch('/api/campaigns').then((r) => r.json());
    nav.replaceChildren(...campaigns.map((c) => Object.assign(document.createElement('a'), {
      className: 'nav-link',
      href: c.id === 'gift-guide' ? '/gift-guide' : `/c/${c.id}`,
      textContent: `${c.emoji} ${c.title}`.trim(),
    })));
  } catch {}
}
