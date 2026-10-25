// Admin page: pick a campaign, add products to it, edit or reorder them.
// Every change is saved automatically to /api/admin/content.
const $ = (sel) => document.querySelector(sel);
const HOME = 'todays-picks';

const state = { doc: null, current: HOME, password: '', partnerTag: '', marketplace: '' };

// Small DOM helper: h('div', { className: 'x', onclick }, child, 'text', ...)
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v !== undefined && v !== null && v !== false) el[k] = v;
  }
  el.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
  return el;
}

function slugify(text) {
  return String(text).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '')
    .trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 60) || 'campaign';
}

const campaign = () => state.doc.campaigns.find((c) => c.id === state.current) ?? state.doc.campaigns[0];
const pickCount = (c) => c.sections.reduce((n, s) => n + s.picks.length, 0);
const publicUrl = (c) => (c.id === HOME ? '/' : c.id === 'gift-guide' ? '/gift-guide' : `/c/${c.id}`);

// --- Saving -------------------------------------------------------------

let saveTimer = null;
function status(text, isError = false) {
  const el = $('#save-status');
  el.textContent = text;
  el.classList.toggle('error', isError);
}

async function api(method, body) {
  const res = await fetch('/api/admin/content', {
    method,
    headers: { Authorization: `Bearer ${state.password}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong.'), { status: res.status });
  return data;
}

function save() {
  status('Saving…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await api('PUT', { campaigns: state.doc.campaigns });
      status('All changes saved ✓');
    } catch (err) {
      if (err.status === 401) return logout('Your session expired. Please sign in again.');
      status(`Not saved: ${err.message}`, true);
    }
  }, 600);
}

// --- Link checks --------------------------------------------------------

function checkLink(value) {
  if (!value) return { level: '', text: 'Paste the link from SiteStripe → Get Link on the Amazon product page.' };
  let url;
  try { url = new URL(value); } catch { return { level: 'bad', text: 'That doesn’t look like a web link.' }; }
  const host = url.hostname.toLowerCase();
  if (host === 'amzn.to') return { level: '', text: '✓ SiteStripe short link (your tag is built in).' };
  if (host === 'amazon.com' || host.endsWith('.amazon.com') || host === state.marketplace) {
    const tag = url.searchParams.get('tag');
    if (!tag) return { level: '', text: `✓ Amazon link. Your tag ${state.partnerTag || ''} will be added automatically.` };
    if (state.partnerTag && tag !== state.partnerTag) return { level: 'warn', text: `This link has the tag “${tag}”, not yours (${state.partnerTag}).` };
    return { level: '', text: '✓ Amazon link with your tag.' };
  }
  return { level: 'bad', text: 'Only Amazon links are allowed. This product won’t show on the site.' };
}

function linkField(value, onInput) {
  const hint = h('small');
  const show = (v) => { const r = checkLink(v); hint.textContent = r.text; hint.className = r.level; };
  const input = h('input', { type: 'url', value, placeholder: 'https://amzn.to/…', oninput: (e) => { show(e.target.value); onInput(e.target.value.trim()); } });
  show(value);
  return h('label', { className: 'field full' }, 'Amazon link', input, hint);
}

// Photo: upload your own, or paste the SiteStripe "Image" code / an Amazon image link.
const AMAZON_IMAGE_HOSTS = /(^|\.)(amazon-adsystem\.com|media-amazon\.com|ssl-images-amazon\.com|images-amazon\.com)$/;

function parseImage(text) {
  const raw = text.trim();
  if (!raw) return { image: '' };
  const src = raw.includes('<img') ? (raw.match(/<img[^>]+src=["']([^"']+)["']/i) ?? [])[1] : raw;
  if (!src) return { error: 'Couldn’t find a picture in that code. Copy the whole SiteStripe Image code.' };
  try {
    const url = new URL(src.startsWith('//') ? `https:${src}` : src);
    if (AMAZON_IMAGE_HOSTS.test(url.hostname)) return { image: url.toString().replace(/^http:/, 'https:') };
  } catch {}
  return { error: 'Only Amazon-hosted images (from SiteStripe) or your own uploaded photos are allowed.' };
}

function imageField(value, onChange) {
  const preview = h('img', { className: 'img-preview', alt: '' });
  const hint = h('small');
  const remove = h('button', { className: 'btn small danger', type: 'button', onclick: () => set('') }, 'Remove photo');
  const paste = h('input', { placeholder: 'Or paste SiteStripe Image code / Amazon image link', oninput: (e) => {
    const r = parseImage(e.target.value);
    if (r.error) { hint.textContent = r.error; hint.className = 'bad'; return; }
    set(r.image);
  } });
  const file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif', className: 'file-input', onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5_000_000) { hint.textContent = 'That photo is over 5 MB. Try a smaller one.'; hint.className = 'bad'; return; }
    hint.textContent = 'Uploading…'; hint.className = '';
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', headers: { Authorization: `Bearer ${state.password}`, 'Content-Type': f.type }, body: f });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      set(data.image);
    } catch (err) {
      hint.textContent = err.message || 'Upload failed.'; hint.className = 'bad';
    }
    e.target.value = '';
  } });
  function set(image) {
    value = image;
    preview.hidden = !image;
    if (image) preview.src = image;
    remove.hidden = !image;
    if (!image) paste.value = '';
    hint.textContent = image ? '✓ Photo added.' : 'Optional. Use your own photo or Amazon’s SiteStripe image, not a copied Amazon photo.';
    hint.className = '';
    onChange(image);
  }
  preview.hidden = !value;
  if (value) preview.src = value;
  remove.hidden = !value;
  hint.textContent = value ? '' : 'Optional. Use your own photo or Amazon’s SiteStripe image, not a copied Amazon photo.';
  return h('div', { className: 'field full' }, 'Photo',
    h('div', { className: 'image-field' }, preview,
      h('div', { className: 'image-inputs' },
        h('label', { className: 'btn small upload-btn' }, '📷 Upload photo', file), paste, remove)),
    hint);
}

const textField = (label, value, onInput, opts = {}) => h('label', { className: `field${opts.full ? ' full' : ''}` }, label,
  h(opts.multiline ? 'textarea' : 'input', { value, placeholder: opts.placeholder ?? '', maxLength: opts.max ?? 200, oninput: (e) => onInput(e.target.value) }),
  opts.hint ? h('small', {}, opts.hint) : null);

// --- Rendering ----------------------------------------------------------

function renderCampaignList() {
  $('#campaign-list').replaceChildren(...state.doc.campaigns.map((c) => h('button', {
    className: 'campaign-btn',
    type: 'button',
    ariaCurrent: String(c.id === state.current),
    onclick: () => { state.current = c.id; render(); },
  }, `${c.emoji || '📁'} ${c.title}`, h('span', { className: 'count' }, String(pickCount(c))))));
}

function addProductCard(c) {
  const draft = { title: '', why: '', url: '', emoji: '', image: '' };
  const sectionSelect = h('select', {}, ...c.sections.map((s, i) => h('option', { value: s.id, selected: i === 0 }, s.title ? `${s.emoji} ${s.title}`.trim() : 'Main list')));
  const error = h('p', { className: 'error', hidden: true });
  const form = h('form', { className: 'panel add-product', onsubmit: (e) => {
    e.preventDefault();
    if (!draft.title.trim() || !draft.url) { error.textContent = 'Add at least a title and an Amazon link.'; error.hidden = false; return; }
    if (checkLink(draft.url).level === 'bad') { error.textContent = checkLink(draft.url).text; error.hidden = false; return; }
    const section = c.sections.find((s) => s.id === sectionSelect.value) ?? c.sections[0];
    section.picks.unshift({ id: crypto.randomUUID(), title: draft.title.trim(), why: draft.why.trim(), url: draft.url, emoji: draft.emoji.trim() || '⭐', image: draft.image });
    save();
    render();
    status('Product added. Saving…');
  } },
    h('h2', {}, `➕ Add a product to “${c.title}”`),
    h('div', { className: 'fields' },
      linkField('', (v) => { draft.url = v; }),
      textField('Product name', '', (v) => { draft.title = v; }, { placeholder: 'e.g. Cozy Sherpa Throw Blanket', max: 140 }),
      c.sections.length > 1 ? h('label', { className: 'field' }, 'Section', sectionSelect) : textField('Emoji', '', (v) => { draft.emoji = v; }, { placeholder: '🛋️', max: 8, hint: 'Shown instead of a photo.' }),
      textField('Why it’s a good deal', '', (v) => { draft.why = v; }, { full: true, multiline: true, max: 600, placeholder: 'In your own words. Don’t include prices: they change and Amazon’s rules don’t allow copied prices.' }),
      imageField('', (v) => { draft.image = v; }),
      c.sections.length > 1 ? textField('Emoji', '', (v) => { draft.emoji = v; }, { placeholder: '🛋️', max: 8, hint: 'Shown instead of a photo.' }) : null,
    ),
    error,
    h('div', { className: 'actions' }, h('button', { className: 'btn primary', type: 'submit' }, 'Add product')));
  return form;
}

function settingsCard(c) {
  const isHome = c.id === HOME;
  return h('details', { className: 'panel' },
    h('summary', {}, h('h3', { style: 'display:inline' }, '⚙️ Campaign settings')),
    h('div', { className: 'fields', style: 'margin-top:14px' },
      textField('Title', c.title, (v) => { c.title = v; save(); renderCampaignList(); $('#editor-title').textContent = v; }, { max: 100 }),
      textField('Emoji', c.emoji, (v) => { c.emoji = v; save(); renderCampaignList(); }, { max: 8 }),
      isHome ? null : textField('Intro text', c.intro, (v) => { c.intro = v; save(); }, { full: true, multiline: true, max: 600 }),
      isHome ? null : h('label', { className: 'field check full' },
        h('input', { type: 'checkbox', checked: c.nav, onchange: (e) => { c.nav = e.target.checked; save(); } }),
        'Show this campaign in the site’s top menu'),
    ),
    isHome ? h('p', { className: 'muted', style: 'margin-top:12px' }, 'These products appear in “Today’s Picks” on the front page.') : h('div', { className: 'actions' },
      h('button', { className: 'btn', type: 'button', onclick: () => {
        c.sections.push({ id: `section-${Date.now()}`, title: 'New section', emoji: '', search: '', picks: [] });
        save(); render();
      } }, '+ Add section'),
      h('button', { className: 'btn danger', type: 'button', onclick: () => {
        if (!confirm(`Delete the campaign “${c.title}” and all ${pickCount(c)} products in it? This can’t be undone.`)) return;
        state.doc.campaigns = state.doc.campaigns.filter((x) => x !== c);
        state.current = HOME;
        save(); render();
      } }, 'Delete campaign')));
}

function move(list, item, delta) {
  const i = list.indexOf(item);
  const j = i + delta;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  save(); render();
}

function pickRow(c, section, pick) {
  const name = h('span', { className: 'pick-name' }, pick.title);
  const emoji = h('span', { className: 'emoji' });
  const thumb = () => emoji.replaceChildren(pick.image ? h('img', { className: 'thumb', src: pick.image, alt: '' }) : pick.emoji);
  thumb();
  const otherSections = c.sections.filter((s) => s !== section);
  return h('details', { className: 'pick-row' },
    h('summary', {}, emoji, name,
      h('button', { className: 'btn small', type: 'button', title: 'Move up', onclick: (e) => { e.preventDefault(); move(section.picks, pick, -1); } }, '↑'),
      h('button', { className: 'btn small', type: 'button', title: 'Move down', onclick: (e) => { e.preventDefault(); move(section.picks, pick, 1); } }, '↓')),
    h('div', { className: 'pick-edit' },
      h('div', { className: 'fields' },
        linkField(pick.url, (v) => { pick.url = v; save(); }),
        textField('Product name', pick.title, (v) => { pick.title = v; name.textContent = v; save(); }, { max: 140 }),
        textField('Emoji', pick.emoji, (v) => { pick.emoji = v; thumb(); save(); }, { max: 8, hint: 'Shown when there’s no photo.' }),
        textField('Why it’s a good deal', pick.why, (v) => { pick.why = v; save(); }, { full: true, multiline: true, max: 600 }),
        imageField(pick.image ?? '', (v) => { pick.image = v; thumb(); save(); })),
      h('div', { className: 'actions' },
        otherSections.length ? h('select', { className: 'btn small', style: 'width:auto', onchange: (e) => {
          const target = c.sections.find((s) => s.id === e.target.value);
          section.picks = section.picks.filter((p) => p !== pick);
          target.picks.unshift(pick);
          save(); render();
        } }, h('option', { value: '' }, 'Move to section…'), ...otherSections.map((s) => h('option', { value: s.id }, s.title || 'Main list'))) : null,
        h('button', { className: 'btn small danger', type: 'button', onclick: () => {
          if (!confirm(`Remove “${pick.title}”?`)) return;
          section.picks = section.picks.filter((p) => p !== pick);
          save(); render();
        } }, 'Remove'))));
}

function sectionCard(c, section) {
  const multi = c.sections.length > 1 || c.id !== HOME;
  return h('div', { className: 'panel section-card' },
    multi ? h('div', { className: 'section-fields' },
      textField('Emoji', section.emoji, (v) => { section.emoji = v; save(); }, { max: 8 }),
      textField('Section title', section.title, (v) => { section.title = v; save(); }, { max: 80, placeholder: 'e.g. Gifts for Her' }),
      textField('Amazon search for “Browse” button', section.search, (v) => { section.search = v; save(); }, { max: 80, placeholder: 'e.g. gifts for women' }),
      h('div', { className: 'actions', style: 'margin:0' },
        h('button', { className: 'btn small', type: 'button', title: 'Move section up', onclick: () => move(c.sections, section, -1) }, '↑'),
        h('button', { className: 'btn small', type: 'button', title: 'Move section down', onclick: () => move(c.sections, section, 1) }, '↓'),
        c.sections.length > 1 ? h('button', { className: 'btn small danger', type: 'button', onclick: () => {
          if (!confirm(`Delete the section “${section.title || 'untitled'}”${section.picks.length ? ` and its ${section.picks.length} products` : ''}?`)) return;
          c.sections = c.sections.filter((s) => s !== section);
          save(); render();
        } }, 'Delete') : null))
      : h('h2', {}, `Products (${section.picks.length})`),
    section.picks.length
      ? section.picks.map((p) => pickRow(c, section, p))
      : h('p', { className: 'empty-section' }, 'No products yet. Add one above.'));
}

function render() {
  renderCampaignList();
  const c = campaign();
  state.current = c.id;
  $('#editor').replaceChildren(
    h('div', { className: 'editor-head' },
      h('h1', { id: 'editor-title' }, c.title),
      h('a', { href: publicUrl(c), target: '_blank' }, 'View on site ↗')),
    addProductCard(c),
    settingsCard(c),
    ...c.sections.map((s) => sectionCard(c, s)));
}

// --- Sign in / out ------------------------------------------------------

function logout(message) {
  sessionStorage.removeItem('admin-password');
  state.password = '';
  $('#app').hidden = true;
  $('#logout').hidden = true;
  $('#login').hidden = false;
  status('');
  const err = $('#login-error');
  err.textContent = message ?? '';
  err.hidden = !message;
}

async function signIn(password) {
  state.password = password;
  try {
    const data = await api('GET');
    sessionStorage.setItem('admin-password', password);
    state.doc = { campaigns: data.campaigns };
    state.partnerTag = data.partnerTag;
    state.marketplace = data.marketplace;
    $('#storage-warning').hidden = data.storage.persistent;
    $('#login').hidden = true;
    $('#app').hidden = false;
    $('#logout').hidden = false;
    render();
  } catch (err) {
    logout(err.message);
  }
}

$('#login').addEventListener('submit', (e) => { e.preventDefault(); signIn($('#password').value); });
$('#logout').addEventListener('click', () => logout());

$('#new-campaign').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = $('#new-campaign-title').value.trim();
  if (!title) return;
  const base = slugify(title);
  let id = base;
  for (let n = 2; state.doc.campaigns.some((c) => c.id === id); n++) id = `${base}-${n}`;
  state.doc.campaigns.push({ id, title, emoji: '🛍️', intro: '', nav: true, sections: [{ id: 'main', title: '', emoji: '', search: '', picks: [] }] });
  state.current = id;
  $('#new-campaign-title').value = '';
  save(); render();
});

window.addEventListener('beforeunload', (e) => {
  if ($('#save-status').textContent.startsWith('Saving')) { e.preventDefault(); e.returnValue = ''; }
});

const saved = sessionStorage.getItem('admin-password');
if (saved) signIn(saved); else logout();
