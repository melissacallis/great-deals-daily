// Post Studio: turns a campaign into on-brand Instagram images (carousel
// slides or stories) plus a caption, drawn on <canvas> in the browser.
//
// Only the owner's own uploaded photos (/uploads/...) are drawn. Amazon's
// product photos may not be reused in social posts, so products without an
// uploaded photo show their emoji instead.

const C = {
  pink: '#ff3d7f', pinkDark: '#e8286b', coral: '#ff8a3d', mid: '#ff5f6d',
  sun: '#ffd23f', plum: '#3b0f3a', ink: '#2a1030', muted: '#7b5b6e',
  blush: '#fff5f8', line: '#f5d6e2', white: '#ffffff',
};
const DISPLAY = 'Poppins, Inter, sans-serif';
const BODY = 'Inter, system-ui, sans-serif';
const FORMATS = {
  post: { label: 'Carousel post', w: 1080, h: 1350 },
  story: { label: 'Story', w: 1080, h: 1920 },
};
const M = 96; // outer margin, ~9% of the short side

// --- drawing helpers ------------------------------------------------------

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Curly apostrophes and quotes for display text.
const smart = (s) => String(s).replace(/(\w)'(\w)/g, '$1’$2').replace(/"([^"]*)"/g, '“$1”');

const isOwnPhoto = (src) => typeof src === 'string' && src.startsWith('/uploads/');

function wrap(ctx, text, maxWidth) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

// Largest font size (down to min) at which text fits in maxLines.
function fit(ctx, text, { weight, family, max, min, maxWidth, maxLines }) {
  for (let size = max; size >= min; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrap(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = `${weight} ${min}px ${family}`;
  return { size: min, lines: clamp(ctx, wrap(ctx, text, maxWidth), maxLines, maxWidth) };
}

function clamp(ctx, lines, maxLines, maxWidth) {
  if (lines.length <= maxLines) return lines;
  const out = lines.slice(0, maxLines);
  let last = out[maxLines - 1];
  while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
  out[maxLines - 1] = `${last.trimEnd()}…`;
  return out;
}

function drawLines(ctx, lines, x, y, lineHeight) {
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// A text pill; returns its width. (x, y) is the top-left of the pill.
function pill(ctx, text, x, y, { bg, color, size = 30, weight = 800, family = BODY, padX = 28, padY = 16, tracking = 0, upper = false, align = 'left', gradient = false }) {
  const label = upper ? text.toUpperCase() : text;
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.letterSpacing = `${tracking}px`;
  const tw = ctx.measureText(label).width;
  const w = tw + padX * 2, h = size + padY * 2;
  const left = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  if (gradient) {
    const g = ctx.createLinearGradient(left, 0, left + w, 0);
    g.addColorStop(0, C.pink); g.addColorStop(0.5, C.mid); g.addColorStop(1, C.coral);
    ctx.fillStyle = g;
  } else ctx.fillStyle = bg;
  roundRect(ctx, left, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, left + padX, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '0px';
  return { w, h };
}

function gradientBg(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, C.pink); g.addColorStop(0.55, C.mid); g.addColorStop(1, C.coral);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // soft decorative circles
  ctx.globalAlpha = 0.16; ctx.fillStyle = C.white;
  ctx.beginPath(); ctx.arc(60, 40, 260, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.22; ctx.fillStyle = C.sun;
  ctx.beginPath(); ctx.arc(w - 40, h - 60, 330, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

function blushBg(ctx, w, h) {
  ctx.fillStyle = C.blush;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255, 61, 127, 0.12)';
  for (let y = 18; y < h; y += 36) for (let x = 18; x < w; x += 36) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill(); }
}

function sparkle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
  ctx.fill();
}

function lockup(ctx, assets, x, y, color) {
  if (assets.logo) ctx.drawImage(assets.logo, x, y, 64, 64);
  ctx.fillStyle = color;
  ctx.font = `800 32px ${DISPLAY}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('Great Deals Daily', x + 80, y + 33);
  ctx.textBaseline = 'alphabetic';
}

// --- slides -----------------------------------------------------------------

function drawCover(ctx, f, campaign, count, assets) {
  const { w, h } = f;
  gradientBg(ctx, w, h);
  const story = h > 1500;
  const artW = story ? 880 : 600;
  if (assets.art) ctx.drawImage(assets.art, w - artW - 20, h - artW * 0.69 - (story ? 180 : 0), artW, artW * 0.69);
  lockup(ctx, assets, M, M, C.white);

  let y = story ? 360 : 290;
  const eb = pill(ctx, `${count} hand-picked finds`, M, y, { bg: C.sun, color: C.plum, size: 28, tracking: 3.4, upper: true });
  y += eb.h + 44;

  ctx.fillStyle = C.white;
  const title = fit(ctx, smart(campaign.title), { weight: 800, family: DISPLAY, max: 150, min: 84, maxWidth: w - 2 * M, maxLines: 3 });
  y = drawLines(ctx, title.lines, M, y + title.size * 0.85, title.size * 1.02) - title.size * 0.85 + 36;

  const intro = smart(campaign.intro || 'Our favorite finds, all in one place.');
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  const sub = fit(ctx, intro, { weight: 600, family: BODY, max: 38, min: 30, maxWidth: story ? 820 : 640, maxLines: 4 });
  y = drawLines(ctx, sub.lines, M, y + sub.size, sub.size * 1.38) + 40;

  pill(ctx, 'Swipe to see them  →', M, y, { bg: C.plum, color: C.white, size: 32, padX: 32, padY: 18 });
  sparkle(ctx, w - 150, story ? 300 : 230, 26, C.white);
  sparkle(ctx, w - 230, story ? 400 : 330, 14, C.sun);
}

function drawProduct(ctx, f, item, index, total, assets) {
  const { w, h } = f;
  const story = h > 1500;
  blushBg(ctx, w, h);
  lockup(ctx, assets, M, 80, C.plum);
  pill(ctx, `${index} / ${total}`, w - M, 78, { bg: C.plum, color: C.sun, size: 28, padX: 22, padY: 16, align: 'right', family: DISPLAY });

  // Lay the text out first so the card can be sized to its content.
  const pad = 56;
  const cx = 64, cw = w - 128, mx = cx + pad, mw = cw - pad * 2;
  const mediaH = story ? 860 : 560;
  const top = story ? 210 : 180, bottom = h - (story ? 250 : 170);
  const sectionH = item.section ? 52 : 0;
  const t = fit(ctx, smart(item.title), { weight: 800, family: DISPLAY, max: 60, min: 44, maxWidth: mw, maxLines: 2 });
  const titleH = t.lines.length * t.size * 1.12;
  const fixedH = pad + mediaH + 52 + sectionH + titleH + 22 + pad;
  let whyLines = [];
  if (item.why) {
    ctx.font = `500 34px ${BODY}`;
    const room = Math.max(1, Math.floor((bottom - top - fixedH) / (34 * 1.45)));
    whyLines = clamp(ctx, wrap(ctx, smart(item.why), mw), Math.min(room, story ? 6 : 3), mw);
  }
  const ch = fixedH + whyLines.length * 34 * 1.45;
  const cy = top + Math.max(0, (bottom - top - ch) / 2);

  ctx.save();
  ctx.shadowColor = 'rgba(255, 61, 127, 0.28)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
  ctx.fillStyle = C.white; roundRect(ctx, cx, cy, cw, ch, 48); ctx.fill();
  ctx.restore();

  const my = cy + pad;
  ctx.save();
  roundRect(ctx, mx, my, mw, mediaH, 32); ctx.clip();
  if (item.photo) {
    ctx.fillStyle = '#fff8fb'; ctx.fillRect(mx, my, mw, mediaH);
    const s = Math.min(mw / item.photo.width, mediaH / item.photo.height);
    const iw = item.photo.width * s, ih = item.photo.height * s;
    ctx.drawImage(item.photo, mx + (mw - iw) / 2, my + (mediaH - ih) / 2, iw, ih);
  } else {
    const g = ctx.createLinearGradient(mx, my, mx + mw, my + mediaH);
    g.addColorStop(0, '#fff1c9'); g.addColorStop(1, '#ffd9e6');
    ctx.fillStyle = g; ctx.fillRect(mx, my, mw, mediaH);
    ctx.font = `${story ? 300 : 240}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(item.emoji || '🛍️', mx + mw / 2, my + mediaH / 2 + 10);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();

  let y = my + mediaH + 52;
  if (item.section) {
    ctx.fillStyle = C.pinkDark;
    ctx.font = `800 26px ${BODY}`;
    ctx.letterSpacing = '3px';
    ctx.fillText(smart(item.section).toUpperCase(), mx, y + 22);
    ctx.letterSpacing = '0px';
    y += sectionH;
  }
  ctx.fillStyle = C.ink;
  ctx.font = `800 ${t.size}px ${DISPLAY}`;
  y = drawLines(ctx, t.lines, mx, y + t.size * 0.9, t.size * 1.12) - t.size * 0.9 + 22;
  if (whyLines.length) {
    ctx.fillStyle = C.muted;
    ctx.font = `500 34px ${BODY}`;
    drawLines(ctx, whyLines, mx, y + 34, 34 * 1.45);
  }

  pill(ctx, '🔗  Link in bio to shop', w / 2, h - (story ? 170 : 118), { color: C.white, size: 34, padX: 40, padY: 20, align: 'center', gradient: true });
}

function drawCta(ctx, f, campaign, assets, siteUrl) {
  const { w, h } = f;
  const story = h > 1500;
  gradientBg(ctx, w, h);
  lockup(ctx, assets, M, M, C.white);
  let y = h * (story ? 0.3 : 0.27);
  pill(ctx, 'Shop every pick', M, y, { bg: C.sun, color: C.plum, size: 28, tracking: 3.4, upper: true });
  y += 120;
  ctx.fillStyle = C.white;
  const t = fit(ctx, 'Tap the link in our bio', { weight: 800, family: DISPLAY, max: 132, min: 80, maxWidth: w - 2 * M, maxLines: 3 });
  y = drawLines(ctx, t.lines, M, y + t.size * 0.85, t.size * 1.02) - t.size * 0.85 + 40;
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.font = `600 38px ${BODY}`;
  y = drawLines(ctx, wrap(ctx, `Every product from “${smart(campaign.title)}” is waiting for you, with today’s prices on Amazon.`, w - 2 * M - 80), M, y + 38, 38 * 1.38) + 46;
  pill(ctx, siteUrl, M, y, { bg: C.white, color: C.pinkDark, size: 32, padX: 32, padY: 18, family: DISPLAY, weight: 700 });

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `500 26px ${BODY}`;
  drawLines(ctx, wrap(ctx, '#ad · As an Amazon Associate I earn from qualifying purchases.', w - 2 * M), M, h - M - 20, 26 * 1.4);
  sparkle(ctx, w - 170, story ? 420 : 300, 30, C.white);
  sparkle(ctx, w - 250, story ? 520 : 400, 16, C.sun);
}

// --- caption ----------------------------------------------------------------

function hashtags(campaign) {
  const words = campaign.title.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !/^\d+$/.test(w));
  const own = words.length ? [`#${words.join('')}`] : [];
  const extra = /gift|holiday|christmas/i.test(campaign.title) ? ['#giftideas', '#holidaygifts', '#giftguide'] : ['#dealoftheday', '#savemoney'];
  return [...new Set([...own, '#amazonfinds', '#amazonmusthaves', ...extra, '#greatdealsdaily', '#ad', '#amazonaffiliate'])].join(' ');
}

function caption(campaign, items) {
  const list = items.slice(0, 10).map((it, i) => `${i + 1}. ${it.emoji || '⭐'} ${it.title}`).join('\n');
  return [
    `${campaign.emoji ? `${campaign.emoji} ` : ''}${campaign.title}`,
    '',
    campaign.intro || 'Our favorite finds, all in one place.',
    '',
    list,
    '',
    '🔗 Tap the link in our bio to shop every pick.',
    '💾 Save this post for later and share it with a friend who needs it!',
    '',
    'As an Amazon Associate I earn from qualifying purchases. Prices change, so check Amazon for the current price.',
    '',
    hashtags(campaign),
  ].join('\n');
}

// --- UI -----------------------------------------------------------------------

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children.flat().filter(Boolean));
  return node;
}

function download(canvas, name) {
  canvas.toBlob((blob) => {
    const a = el('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, 'image/png');
}

export async function openStudio(campaign) {
  const items = [];
  for (const s of campaign.sections) {
    const section = s.title ? s.title : '';
    for (const p of s.picks) items.push({ ...p, section });
  }

  const overlay = el('div', { className: 'studio' });
  const close = () => { overlay.remove(); document.body.classList.remove('studio-open'); };
  const grid = el('div', { className: 'studio-grid' });
  const notice = el('p', { className: 'studio-notice', hidden: true });
  const captionBox = el('textarea', { className: 'studio-caption', rows: 12, value: caption(campaign, items) });
  const copyBtn = el('button', { className: 'btn', type: 'button', textContent: 'Copy caption', onclick: async () => {
    try { await navigator.clipboard.writeText(captionBox.value); copyBtn.textContent = 'Copied ✓'; } catch { captionBox.select(); document.execCommand('copy'); copyBtn.textContent = 'Copied ✓'; }
    setTimeout(() => { copyBtn.textContent = 'Copy caption'; }, 1800);
  } });
  let format = 'post';
  const formatBtns = Object.entries(FORMATS).map(([key, f]) => el('button', {
    className: 'chip', type: 'button', textContent: `${f.label} · ${f.w}×${f.h}`, ariaPressed: String(key === format),
    onclick: () => { format = key; formatBtns.forEach((b, i) => { b.ariaPressed = String(Object.keys(FORMATS)[i] === key); }); draw(); },
  }));
  const downloadAll = el('button', { className: 'btn primary', type: 'button', textContent: 'Download all', onclick: async () => {
    const cards = [...grid.querySelectorAll('canvas')];
    for (const [i, cv] of cards.entries()) { download(cv, cv.dataset.file); if (i < cards.length - 1) await new Promise((r) => setTimeout(r, 400)); }
  } });

  overlay.append(el('div', { className: 'studio-inner' },
    el('div', { className: 'studio-head' },
      el('div', {}, el('h1', { textContent: `🎨 Post Studio: ${campaign.title}` }),
        el('p', { className: 'muted', textContent: 'Instagram-ready images and a caption for this campaign. Download, then post from your phone.' })),
      el('button', { className: 'btn', type: 'button', textContent: '✕ Close', onclick: close })),
    el('div', { className: 'studio-bar' }, ...formatBtns, downloadAll),
    notice,
    grid,
    el('div', { className: 'panel studio-caption-panel' },
      el('h2', { textContent: '✍️ Caption' }),
      el('p', { className: 'muted', textContent: 'Edit it to sound like you. Keep the #ad and Amazon disclosure lines: they are required.' }),
      captionBox,
      el('div', { className: 'actions' }, copyBtn))));
  document.body.append(overlay);
  document.body.classList.add('studio-open');

  if (!items.length) {
    grid.replaceChildren(el('p', { className: 'muted', textContent: 'Add some products to this campaign first, then come back to make posts.' }));
    return;
  }

  // Load fonts and brand art before drawing, so text measures correctly.
  await Promise.all([
    document.fonts.load(`800 100px Poppins`), document.fonts.load(`700 40px Poppins`),
    document.fonts.load(`600 40px Inter`), document.fonts.load(`800 30px Inter`), document.fonts.load(`500 30px Inter`),
  ]).catch(() => {});
  const [logo, art] = await Promise.all([loadImage('/img/logo.svg'), loadImage('/img/hero-art.svg')]);
  const assets = { logo, art };
  let skipped = 0;
  for (const it of items) {
    if (isOwnPhoto(it.image)) it.photo = await loadImage(it.image);
    else if (it.image) skipped++;
  }
  if (skipped) {
    notice.hidden = false;
    notice.textContent = `${skipped} product${skipped === 1 ? ' uses an Amazon' : 's use Amazon'} photo, which Amazon doesn't allow in social posts, so ${skipped === 1 ? 'it shows' : 'they show'} the emoji instead. Upload your own photo to use a picture.`;
  }
  const siteUrl = `${location.host}/swipe#${campaign.id}`;
  const slug = campaign.id;

  function draw() {
    const f = FORMATS[format];
    const slides = [
      { name: 'cover', paint: (ctx) => drawCover(ctx, f, campaign, items.length, assets) },
      ...items.map((it, i) => ({ name: `product-${i + 1}`, paint: (ctx) => drawProduct(ctx, f, it, i + 1, items.length, assets) })),
      { name: 'shop-link', paint: (ctx) => drawCta(ctx, f, campaign, assets, siteUrl) },
    ];
    grid.replaceChildren(...slides.map((s, i) => {
      const canvas = el('canvas', { width: f.w, height: f.h });
      canvas.dataset.file = `${slug}-${format}-${String(i + 1).padStart(2, '0')}-${s.name}.png`;
      s.paint(canvas.getContext('2d'));
      return el('figure', { className: 'studio-card' }, canvas,
        el('figcaption', {}, el('span', { textContent: `${i + 1}. ${s.name.replace('-', ' ')}` }),
          el('button', { className: 'btn small', type: 'button', textContent: '⬇ Download', onclick: () => download(canvas, canvas.dataset.file) })));
    }));
  }
  draw();
}
