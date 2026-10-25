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
