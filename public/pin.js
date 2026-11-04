// Daily Top 10 pin (1000x1500) for Pinterest, drawn from the live Top 50 with today's date.
// Product photos come through /api/img (our own address), so the finished canvas can be saved.
const W = 1000, H = 1500;
const C = { pink: '#ff3d7f', coral: '#ff8a3d', sun: '#ffd23f', plum: '#3b0f3a', white: '#fff', blush: '#fff5f8' };
const $ = (s) => document.querySelector(s);

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
const viaUs = (src) => (!src ? null : src.startsWith('data:') || src.startsWith('/') ? src : `/api/img?u=${encodeURIComponent(src)}`);

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function wrap(ctx, text, maxWidth) {
  const lines = []; let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const t = line ? `${line} ${word}` : word;
    if (ctx.measureText(t).width > maxWidth && line) { lines.push(line); line = word; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}
function fitLines(ctx, text, maxWidth, maxLines, max, min, weight = 700) {
  for (let size = max; size >= min; size -= 1) {
    ctx.font = `${weight} ${size}px Poppins, sans-serif`;
    const lines = wrap(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  const lines = wrap(ctx, text, maxWidth).slice(0, maxLines);
  let last = lines[maxLines - 1];
  while (ctx.measureText(`${last}…`).width > maxWidth && last.includes(' ')) last = last.replace(/\s+\S+$/, '');
  lines[maxLines - 1] = `${last}…`;
  return { size: min, lines };
}
// Amazon titles are long: keep the part before the first comma / dash / bracket.
function shortTitle(t) {
  let s = String(t).replace(/\s+/g, ' ').trim();
  const cut = s.search(/,| - | – | \| |\(|\[| with /i);
  if (cut > 18) s = s.slice(0, cut);
  return s.trim();
}
function star(ctx, x, y, r, color) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * .38 : r; ctx[i ? 'lineTo' : 'moveTo'](x + rr * Math.sin(a), y - rr * Math.cos(a)); }
  ctx.closePath(); ctx.fill();
}
function burst(ctx, x, y, r, color) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 28; i++) { const a = i * Math.PI / 14, rr = i % 2 ? r * .82 : r; ctx[i ? 'lineTo' : 'moveTo'](x + rr * Math.cos(a), y + rr * Math.sin(a)); }
  ctx.closePath(); ctx.fill();
}

async function draw(items, dateText) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const [logo, face, ...photos] = await Promise.all([loadImage('/img/logo-badge.png'), loadImage('/img/headshot.jpg'), ...items.map((it) => loadImage(viaUs(it.image)))]);

  // background
  const g = ctx.createLinearGradient(0, 0, W * .4, H); g.addColorStop(0, C.pink); g.addColorStop(1, C.coral);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.beginPath(); ctx.arc(900, 70, 230, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(60, 1420, 170, 0, Math.PI * 2); ctx.fill();

  // header: logo, title, date
  if (logo) ctx.drawImage(logo, 36, 34, 176, 176);
  ctx.fillStyle = C.white; ctx.font = '800 92px Poppins, sans-serif'; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(59,15,58,.25)'; ctx.shadowOffsetY = 6;
  ctx.fillText('Top 10 Deals', 236, 118);
  ctx.fillStyle = C.sun; ctx.font = '800 50px Poppins, sans-serif'; ctx.fillText('on Amazon today', 240, 178);
  ctx.shadowColor = 'transparent'; ctx.shadowOffsetY = 0;
  ctx.font = '800 30px Poppins, sans-serif';
  const dw = ctx.measureText(dateText).width + 56;
  ctx.save(); ctx.translate(240, 204); ctx.rotate(-0.02);
  roundRect(ctx, 0, 0, dw, 56, 28); ctx.fillStyle = C.plum; ctx.fill();
  ctx.fillStyle = C.sun; ctx.fillText(dateText, 28, 39); ctx.restore();
  star(ctx, 940, 200, 22, C.sun); star(ctx, 900, 250, 11, C.white);

  // grid: 2 columns x 5 rows
  const top = 292, gap = 18, cw = (W - 80 - gap) / 2, ch = 196;
  items.forEach((it, i) => {
    const x = 40 + (i % 2) * (cw + gap), y = top + Math.floor(i / 2) * (ch + gap);
    ctx.save(); ctx.shadowColor = 'rgba(59,15,58,.28)'; ctx.shadowOffsetY = 8; ctx.shadowBlur = 0;
    roundRect(ctx, x, y, cw, ch, 26); ctx.fillStyle = C.white; ctx.fill(); ctx.restore();
    // photo
    const ps = ch - 28, px = x + 14, py = y + 14, img = photos[i];
    roundRect(ctx, px, py, ps, ps, 18); ctx.fillStyle = '#fff'; ctx.fill();
    if (img) {
      const k = Math.min(ps / img.width, ps / img.height), iw = img.width * k, ih = img.height * k;
      ctx.save(); roundRect(ctx, px, py, ps, ps, 18); ctx.clip(); ctx.drawImage(img, px + (ps - iw) / 2, py + (ps - ih) / 2, iw, ih); ctx.restore();
    }
    // rank badge
    ctx.fillStyle = C.plum; ctx.beginPath(); ctx.arc(x + 26, y + 26, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.white; ctx.font = '800 24px Poppins, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`#${i + 1}`, x + 26, y + 35);
    // discount burst
    const tx = px + ps + 16, tw = x + cw - tx - 14;
    if (it.savingsPct > 0) {
      burst(ctx, tx + 44, y + 50, 42, C.sun);
      ctx.fillStyle = C.plum; ctx.font = '800 25px Poppins, sans-serif'; ctx.fillText(`-${it.savingsPct}%`, tx + 44, y + 59);
    }
    ctx.textAlign = 'left';
    // title
    const { size, lines } = fitLines(ctx, shortTitle(it.title), tw, 3, 25, 18);
    ctx.fillStyle = C.plum; ctx.font = `700 ${size}px Poppins, sans-serif`;
    lines.forEach((l, j) => ctx.fillText(l, tx, y + 118 + j * (size + 5)));
  });

  // footer
  const fy = 1365;
  if (face) {
    ctx.save(); ctx.beginPath(); ctx.arc(100, fy + 58, 56, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    ctx.drawImage(face, 44, fy + 2, 112, 112); ctx.restore();
    ctx.strokeStyle = C.white; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(100, fy + 58, 56, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = C.white; ctx.font = '800 38px Poppins, sans-serif'; ctx.fillText('See all 50 → www.ubottega.com', 180, fy + 52);
  ctx.font = '600 26px Poppins, sans-serif'; ctx.fillText('Picked & price-checked by Data Darling', 182, fy + 94);
  return cv;
}

function texts(items, longDate) {
  const title = `Top 10 Amazon Deals Today (${longDate}): Biggest Markdowns`;
  const list = items.map((it, i) => `${i + 1}. ${shortTitle(it.title)}${it.savingsPct ? ` (-${it.savingsPct}%)` : ''}`).join('\n');
  const desc = `Today's top 10 Amazon deals, ${longDate}, ranked by how much they're marked down from their usual price:\n${list}\nPrices change fast, so tap to check today's price and see all 50 deals. #amazondeals #dealsoftheday #giftideas\nAs an Amazon Associate I earn from qualifying purchases. #ad`;
  return { title, desc };
}

async function run() {
  $('#status').textContent = 'Loading today’s Top 10…';
  await Promise.all(['800 40px Poppins', '700 40px Poppins', '600 40px Poppins'].map((f) => document.fonts.load(f)));
  const data = await fetch('/api/deals?category=top').then((r) => r.json()).catch(() => ({ items: [] }));
  const items = (data.items ?? []).slice(0, 10);
  if (items.length < 10) { $('#status').textContent = 'Today’s deals aren’t loaded yet. Try Refresh in a minute.'; return; }
  const now = new Date();
  const dateText = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  const longDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const cv = await draw(items, dateText);
  const url = cv.toDataURL('image/png');
  $('#pin').src = url;
  const a = $('#download'); a.href = url; a.download = `ubottega-top10-${now.toISOString().slice(0, 10)}.png`;
  const t = texts(items, longDate); $('#title').value = t.title; $('#desc').value = t.desc;
  $('#status').textContent = `Built from the live Top 50 · ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

$('#redo').addEventListener('click', run);
$('#copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(`${$('#title').value}\n\n${$('#desc').value}`); $('#copy').textContent = '✅ Copied'; } catch { $('#desc').select(); }
  setTimeout(() => { $('#copy').textContent = '📋 Copy title + description'; }, 2000);
});
run();
