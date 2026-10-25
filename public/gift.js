import { pickCard } from '/picks.js';

const $ = (sel) => document.querySelector(sel);

// The header search box sends visitors to the main page's search.
$('#search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#search-input').value.trim();
  if (q) location.href = `/?q=${encodeURIComponent(q)}`;
});

function renderSection(s) {
  const section = document.createElement('section');
  section.className = 'guide-section';
  section.id = s.id;
  section.innerHTML = '<h2></h2><div class="picks-grid"></div><div class="browse"><p></p><a class="cta" target="_blank" rel="nofollow sponsored noopener">Browse on Amazon →</a></div>';
  section.querySelector('h2').textContent = `${s.emoji} ${s.title}`;
  const grid = section.querySelector('.picks-grid');
  if (s.picks.length) grid.replaceChildren(...s.picks.map(pickCard)); else grid.remove();
  section.querySelector('.browse p').textContent = `${s.picks.length ? 'More ideas' : 'Find ideas'}: shop “${s.search}” on Amazon`;
  section.querySelector('.browse a').href = s.browseUrl;
  return section;
}

async function init() {
  const res = await fetch('/api/gift-guide');
  const guide = await res.json();
  if (!res.ok) { $('#guide').innerHTML = `<p class="empty">${guide.error}</p>`; return; }
  $('#guide-title').textContent = guide.title;
  $('#guide-intro').textContent = guide.intro;
  $('#guide-nav').replaceChildren(...guide.sections.map((s) => Object.assign(document.createElement('a'), {
    className: 'chip', href: `#${s.id}`, textContent: `${s.emoji} ${s.title}`,
  })));
  $('#guide').replaceChildren(...guide.sections.map(renderSection));
}

init();
