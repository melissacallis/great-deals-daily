import { pickCard, renderNav } from '/shared.js';

const $ = (sel) => document.querySelector(sel);

// The header search box sends visitors to the main page's search.
$('#search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#search-input').value.trim();
  if (q) location.href = `/deals?q=${encodeURIComponent(q)}`;
});

function renderSection(s) {
  const section = document.createElement('section');
  section.className = 'guide-section';
  section.id = s.id;
  section.innerHTML = '<h2></h2><div class="picks-grid"></div><div class="browse"><p></p><a class="cta" target="_blank" rel="nofollow sponsored noopener">Browse on Amazon →</a></div>';
  if (s.title) section.querySelector('h2').textContent = `${s.emoji} ${s.title}`.trim(); else section.querySelector('h2').remove();
  const grid = section.querySelector('.picks-grid');
  if (s.picks.length) grid.replaceChildren(...s.picks.map(pickCard)); else grid.remove();
  if (s.browseUrl) {
    section.querySelector('.browse p').textContent = `${s.picks.length ? 'More ideas' : 'Find ideas'}: shop “${s.search}” on Amazon`;
    section.querySelector('.browse a').href = s.browseUrl;
  } else {
    section.querySelector('.browse').remove();
  }
  return section;
}

// /gift-guide is the gift guide campaign; every other campaign lives at /c/<id>.
const campaignId = location.pathname === '/gift-guide' ? 'gift-guide' : location.pathname.split('/').filter(Boolean)[1];

async function init() {
  renderNav();
  const res = await fetch(`/api/campaign/${encodeURIComponent(campaignId)}`);
  const guide = await res.json();
  if (!res.ok) { $('#guide-title').textContent = 'Page not found'; $('#guide').innerHTML = `<p class="empty">${guide.error}</p>`; return; }
  document.title = `${guide.title} | Great Deals Daily`;
  $('#guide-eyebrow').textContent = guide.emoji ? `${guide.emoji} Hand-picked` : 'Hand-picked';
  $('#guide-title').textContent = guide.title;
  $('#guide-intro').textContent = guide.intro;
  const titled = guide.sections.filter((s) => s.title);
  $('#guide-nav').hidden = titled.length < 2;
  $('#guide-nav').replaceChildren(...titled.map((s) => Object.assign(document.createElement('a'), {
    className: 'chip', href: `#${s.id}`, textContent: `${s.emoji} ${s.title}`,
  })));
  $('#guide').replaceChildren(...guide.sections.map(renderSection));
}

init();
