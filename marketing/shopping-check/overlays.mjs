// Transparent doodle-boil overlay frames (1080x1920, 12 fps) for the "Shopping my Top 50" video.
// Layout of the base video: 0-180 headline band, 180-1314 browser, 1314-1920 webcam.
// node overlays.mjs <outDir> <fontDir> <edl.json>
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, outDir, fontDir, edlFile] = process.argv;
const edl = JSON.parse(readFileSync(edlFile, 'utf8'));
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
const html = `<style>
@font-face { font-family: P; font-weight: 600; src: url(data:font/ttf;base64,${font('SemiBold')}); }
@font-face { font-family: P; font-weight: 800; src: url(data:font/ttf;base64,${font('ExtraBold')}); }
html,body{margin:0;width:1080px;height:1920px;background:transparent;overflow:hidden}</style>
<svg id="s" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"></svg>
<script>
let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); const j = (a) => (rnd() - .5) * 2 * a;
const INK = '#2b0b3a', PINK = '#ff3d7f', SUN = '#ffd23f', MINT = '#1fc79a', SKY = '#3fb8ff', RED = '#e0344f';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const P = (pts) => 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L');
function stroke(pts, c, w, p = 1, extra = '') {
  return '<path d="' + P(pts) + '" fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="' + (1 - p) + '" ' + extra + '/>';
}
function wob(x0, y0, x1, y1, n, a) { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t + j(a), y0 + (y1 - y0) * t + j(a)]); } return pts; }
function box(x, y, w, h, a) { return [...wob(x, y, x + w, y, 6, a), ...wob(x + w, y, x + w, y + h, 4, a).slice(1), ...wob(x + w, y + h, x, y + h, 6, a).slice(1), ...wob(x, y + h, x, y, 4, a).slice(1)]; }
function star(x, y, r, c, rot = 0) { const pts = []; for (let i = 0; i <= 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = (i % 2 ? r * .45 : r) + j(r * .06); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } return '<path d="' + P(pts) + 'Z" fill="' + c + '" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/>'; }
function sparkle(x, y, r, c) { return stroke([[x, y - r + j(3)], [x + j(2), y], [x + j(2), y + r + j(3)]], c, 7) + stroke([[x - r + j(3), y], [x, y + j(2)], [x + r + j(3), y + j(2)]], c, 7); }
function burst(x, y, r, c, n = 14) { const pts = []; for (let i = 0; i <= n * 2; i++) { const a = i * Math.PI / n, rr = (i % 2 ? r * .78 : r) + j(r * .05); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } return '<path d="' + P(pts) + 'Z" fill="' + c + '" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>'; }
const ease = (t) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const pop = (t) => { if (t <= 0) return 0; if (t > .45) return 1; const k = t / .45; return 1 + Math.sin(k * Math.PI) * .25 * (1 - k) + (ease(k) - 1); };

// the always-on frame: webcam border, divider squiggle, name tag, corner doodles
function frame(b) {
  seed = 300 + b * 17; let s = '';
  s += stroke(wob(10, 182, 1070, 182, 14, 4), INK, 9) + stroke(wob(14, 1322, 1066, 1322, 14, 5), INK, 10);
  s += stroke(wob(18, 1334, 1062, 1334, 14, 4), PINK, 6);
  s += '<path d="' + P(box(18, 1340, 1044, 566, 5)) + 'Z" fill="none" stroke="' + INK + '" stroke-width="9" stroke-linejoin="round"/>';
  s += '<g transform="rotate(' + (-4 + j(.6)) + ' 160 1858)"><rect x="40" y="1826" width="250" height="62" rx="20" fill="' + SUN + '" stroke="' + INK + '" stroke-width="5"/><text x="165" y="1868" text-anchor="middle" font-family="P" font-weight="800" font-size="30" fill="' + INK + '">Data Darling</text></g>';
  s += sparkle(1010 + j(3), 1392 + j(3), 22, SUN) + sparkle(970 + j(3), 1440 + j(3), 12, PINK);
  return s;
}
// headline band: big doodle card with the product name, chip and discount starburst
function head(seg, t, b) {
  seed = 1000 + b * 7 + (seg.n || 0) * 31; let s = '';
  const e = ease(t / .4), y = (1 - e) * -150;
  s += '<g transform="translate(0 ' + y.toFixed(1) + ')">';
  s += '<path d="' + P(box(26, 18, 1028, 146, 4)) + 'Z" fill="#ffffff" stroke="' + INK + '" stroke-width="7" stroke-linejoin="round"/>';
  if (seg.chip) s += '<g transform="rotate(-3 150 26)"><rect x="46" y="4" width="' + (40 + seg.chip.length * 17) + '" height="46" rx="16" fill="' + (seg.chipColour || PINK) + '" stroke="' + INK + '" stroke-width="4"/><text x="' + (66) + '" y="37" font-family="P" font-weight="800" font-size="26" fill="#fff">' + esc(seg.chip) + '</text></g>';
  const fs = seg.title.length > 24 ? 48 : seg.title.length > 18 ? 56 : 62;
  s += '<text x="58" y="' + (seg.sub ? 112 : 124) + '" font-family="P" font-weight="800" font-size="' + fs + '" fill="' + INK + '">' + esc(seg.title) + '</text>';
  if (seg.sub) s += '<text x="60" y="150" font-family="P" font-weight="600" font-size="28" fill="#6b4a78">' + esc(seg.sub) + '</text>';
  // underline scribble
  s += stroke(wob(58, (seg.sub ? 124 : 140), 58 + Math.min(700, seg.title.length * fs * .56), (seg.sub ? 124 : 140), 8, 3), SUN, 9, ease((t - .3) / .5));
  s += '</g>';
  if (seg.off) { const k = pop(t - .35); s += '<g transform="translate(958 102) rotate(' + (8 + j(2)) + ') scale(' + k.toFixed(3) + ')">' + burst(0, 0, 88, PINK) + '<text x="0" y="16" text-anchor="middle" font-family="P" font-weight="800" font-size="' + (seg.off.length > 4 ? 40 : 48) + '" fill="#fff">' + esc(seg.off) + '</text></g>'; }
  return s;
}
// stickers that pop in over the browser area at a given time
function sticker(st, t) {
  const k = pop(t - st.at); if (!k) return '';
  const out = st.until && t > st.until ? Math.max(0, 1 - (t - st.until) / .25) : 1; if (!out) return '';
  const c = st.colour || SUN, tc = st.text_colour || (c === SUN ? INK : '#fff'); const w = Math.max(160, st.text.length * (st.size || 44) * .6 + 70), h = (st.size || 44) * 1.9;
  let s = '<g opacity="' + out + '" transform="translate(' + st.x + ' ' + st.y + ') rotate(' + ((st.rot ?? -5) + j(.8)) + ') scale(' + k.toFixed(3) + ')">';
  s += '<path d="' + P(box(-w / 2, -h / 2, w, h, 3)) + 'Z" fill="' + c + '" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>';
  s += '<text x="0" y="' + ((st.size || 44) * .36) + '" text-anchor="middle" font-family="P" font-weight="800" font-size="' + (st.size || 44) + '" fill="' + tc + '">' + esc(st.text) + '</text>';
  if (st.emoji) s += '<text x="' + (w / 2 - 6) + '" y="' + (-h / 2 + 8) + '" font-size="60" text-anchor="middle">' + st.emoji + '</text>';
  return s + '</g>';
}
// a hand-drawn circle around a spot (browser coords already mapped to frame coords)
function ring(r, t) {
  const p = ease((t - r.at) / .5); if (p <= 0) return ''; const pts = [];
  for (let i = 0; i <= 36; i++) { const a = -2.2 + i / 36 * Math.PI * 2.15; pts.push([r.x + Math.cos(a) * (r.rx + j(5)), r.y + Math.sin(a) * (r.ry + j(5))]); }
  return stroke(pts, r.colour || PINK, 11, p);
}
function arrow(a, t) {
  const p = ease((t - a.at) / .4); if (p <= 0) return '';
  const [x0, y0, x1, y1] = a.pts, c = a.colour || PINK; let s = stroke(wob(x0, y0, x1, y1, 5, 4), c, 12, p);
  if (p > .9) { const ang = Math.atan2(y1 - y0, x1 - x0); for (const d of [2.5, -2.5]) s += stroke([[x1, y1], [x1 + Math.cos(ang + d) * 50, y1 + Math.sin(ang + d) * 50]], c, 12); }
  return s;
}
function verdict(v, t) {
  if (t < v.at) return ''; const tt = t - v.at; let s = '';
  const cx = v.x || 540, cy = v.y || 720;
  s += '<rect x="0" y="180" width="1080" height="1134" fill="rgba(43,11,58,' + (.42 * ease(tt / .25)) + ')"/>';
  if (v.kind === 'yes') {
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (190 + j(4)) + '" fill="#fff" stroke="' + MINT + '" stroke-width="14" opacity="' + ease(tt / .2) + '"/>';
    s += stroke([[cx - 105 + j(4), cy + 5 + j(4)], [cx - 38 + j(4), cy + 80 + j(4)], [cx + 115 + j(5), cy - 100 + j(5)]], MINT, 40, ease(tt / .5));
  } else {
    s += stroke(wob(cx - 170, cy - 170, cx + 170, cy + 170, 7, 6), RED, 54, ease(tt / .3));
    s += stroke(wob(cx + 170, cy - 170, cx - 170, cy + 170, 7, 6), RED, 54, ease((tt - .25) / .3));
  }
  if (tt > .5) for (const [x, y, r] of [[cx - 240, cy - 160, 32], [cx + 245, cy - 140, 24], [cx + 220, cy + 180, 28], [cx - 230, cy + 150, 20]]) s += sparkle(x + j(5), y + j(5), r, SUN);
  if (tt > .4) { const k = pop(tt - .4); s += '<g transform="translate(540 ' + (cy + 290) + ') rotate(-3) scale(' + k + ')"><rect x="-360" y="-56" width="720" height="104" rx="30" fill="' + (v.kind === 'yes' ? MINT : RED) + '" stroke="' + INK + '" stroke-width="6"/><text x="0" y="18" text-anchor="middle" font-family="P" font-weight="800" font-size="52" fill="#fff">' + esc(v.label) + '</text></g>';
    if (v.line) s += '<text x="540" y="' + (cy + 400) + '" text-anchor="middle" font-family="P" font-weight="800" font-size="38" fill="#fff" stroke="' + INK + '" stroke-width="8" paint-order="stroke" opacity="' + ease((tt - .6) / .3) + '">' + esc(v.line) + '</text>'; }
  return s;
}
// full-screen title card (hook / outro), drawn over the browser area
function card(seg, t, b) {
  seed = 9000 + b * 5; const e = ease(t / .4); let s = '';
  s += '<rect x="0" y="180" width="1080" height="1134" fill="rgba(43,11,58,' + (.6 * e) + ')"/>';
  s += '<g opacity="' + e + '" transform="translate(0 ' + ((1 - e) * 60) + ')">';
  s += '<path d="' + P(box(70, 360, 940, 120 + seg.lines.length * 104, 5)) + 'Z" fill="#fff" stroke="' + INK + '" stroke-width="8" stroke-linejoin="round"/>';
  seg.lines.forEach((l, i) => s += '<text x="540" y="' + (470 + i * 104) + '" text-anchor="middle" font-family="P" font-weight="800" font-size="' + (l.size || 64) + '" fill="' + (l.colour || INK) + '">' + esc(l.text) + '</text>');
  s += star(120 + j(3), 360 + j(3), 54, SUN, .2) + star(965 + j(3), 470 + seg.lines.length * 104 + j(3), 44, PINK, .5) + sparkle(990 + j(3), 340 + j(3), 26, SKY) + sparkle(100 + j(3), 520 + seg.lines.length * 100, 20, MINT) + '</g>';
  return s;
}
function skim(seg, t, b) { // fast-forward badge
  seed = 7000 + b * 3; const k = pop(t);
  return '<g transform="translate(900 270) rotate(' + (6 + j(1)) + ') scale(' + k + ')"><rect x="-120" y="-44" width="240" height="88" rx="26" fill="' + SKY + '" stroke="' + INK + '" stroke-width="6"/><text x="0" y="16" text-anchor="middle" font-family="P" font-weight="800" font-size="44" fill="#fff">' + esc(seg.badge || '▶▶ x4') + '</text></g>';
}
window.render = (seg, t, b) => {
  let s = '<g filter="url(#boil' + b + ')">' + frame(b);
  if (seg.title) s += head(seg, t, b);
  if (seg.kind === 'skim') s += skim(seg, t, b);
  for (const r of seg.rings || []) s += ring(r, t);
  for (const a of seg.arrows || []) s += arrow(a, t);
  for (const st of seg.stickers || []) { seed = 4000 + b * 11 + st.at * 7; s += sticker(st, t); }
  if (seg.verdict) { seed = 5000 + b * 13; s += verdict(seg.verdict, t); }
  if (seg.lines) s += card(seg, t, b);
  s += '</g>';
  const defs = [0, 1, 2].map(i => '<filter id="boil' + i + '" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="' + (i * 7 + 3) + '"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter>').join('');
  document.getElementById('s').innerHTML = '<defs>' + defs + '</defs>' + s;
};
</script>`;
const FPS = 12;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const seg of edl.segments) {
  if (only && !only.includes(seg.id)) continue;
  const dir = path.join(outDir, seg.id); mkdirSync(dir, { recursive: true });
  for (let f = 0; f < Math.ceil(seg.secs * FPS) + 1; f++) {
    await p.evaluate(([sg, t, bb]) => window.render(sg, t, bb), [seg, f / FPS, Math.floor(f * 8 / FPS) % 3]);
    await p.screenshot({ path: path.join(dir, String(f).padStart(4, '0') + '.png'), omitBackground: true });
  }
}
await b.close(); console.log('ok');
