// Doodle-boil overlay frames (1080x1920, 12 fps) for the daily "Top deals" screen-recording video.
// Layout of the base video: 0-300 headline band, 300-1237 browser, 1237-1920 info area.
// node overlays.mjs <outDir> <fontDir> <edl.json> <logo.svg>
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, outDir, fontDir, edlFile, logoFile] = process.argv;
const edl = JSON.parse(readFileSync(edlFile, 'utf8'));
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
const logo = readFileSync(logoFile).toString('base64');
const html = `<style>
@font-face { font-family: P; font-weight: 600; src: url(data:font/ttf;base64,${font('SemiBold')}); }
@font-face { font-family: P; font-weight: 800; src: url(data:font/ttf;base64,${font('ExtraBold')}); }
html,body{margin:0;width:1080px;height:1920px;background:transparent;overflow:hidden}</style>
<svg id="s" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg>
<script>
const LOGO = 'data:image/svg+xml;base64,${logo}';
const edl = { date: ${JSON.stringify(edl.date)}, weekday: ${JSON.stringify(edl.weekday)} };
let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); const j = (a) => (rnd() - .5) * 2 * a;
const INK = '#3b0f3a', PINK = '#ff3d7f', SUN = '#ffd23f', MINT = '#1fc79a', SKY = '#3fb8ff';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const P = (pts) => 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L');
const ease = (t) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const pop = (t) => { if (t <= 0) return 0; if (t > .45) return 1; const k = t / .45; return ease(k) + Math.sin(k * Math.PI) * .22 * (1 - k); };
function stroke(pts, c, w, p = 1) { return '<path d="' + P(pts) + '" fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="' + (1 - p) + '"/>'; }
function wob(x0, y0, x1, y1, n, a) { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t + j(a), y0 + (y1 - y0) * t + j(a)]); } return pts; }
function box(x, y, w, h, a) { return [...wob(x, y, x + w, y, 6, a), ...wob(x + w, y, x + w, y + h, 4, a).slice(1), ...wob(x + w, y + h, x, y + h, 6, a).slice(1), ...wob(x, y + h, x, y, 4, a).slice(1)]; }
function sparkle(x, y, r, c) { return stroke([[x, y - r + j(3)], [x + j(2), y], [x + j(2), y + r + j(3)]], c, 7) + stroke([[x - r + j(3), y], [x, y + j(2)], [x + r + j(3), y + j(2)]], c, 7); }
function burst(x, y, r, c) { const pts = []; for (let i = 0; i <= 28; i++) { const a = i * Math.PI / 14, rr = (i % 2 ? r * .8 : r) + j(r * .04); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } return '<path d="' + P(pts) + 'Z" fill="' + c + '" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>'; }

function band(seg, t) {
  let s = '';
  s += stroke(wob(10, 300, 1070, 300, 14, 4), INK, 9) + stroke(wob(10, 1237, 1070, 1237, 14, 4), INK, 9);
  s += '<image href="' + LOGO + '" x="' + (28 + j(1)) + '" y="' + (40 + j(1)) + '" width="220" height="220"/>';
  s += '<text x="272" y="138" font-family="P" font-weight="800" font-size="76" fill="' + INK + '">Top Deals</text>';
  s += '<text x="274" y="214" font-family="P" font-weight="800" font-size="48" fill="' + PINK + '">on Amazon today</text>';
  s += stroke(wob(274, 236, 690, 236, 8, 3), SUN, 10);
  s += '<g transform="translate(905 150) rotate(' + (8 + j(1.2)) + ')">' + burst(0, 0, 118, SUN) + '<text x="0" y="-12" text-anchor="middle" font-family="P" font-weight="800" font-size="32" fill="' + INK + '">' + esc(edl.weekday) + '</text><text x="0" y="40" text-anchor="middle" font-family="P" font-weight="800" font-size="62" fill="' + INK + '">' + esc(edl.date) + '</text></g>';
  s += sparkle(250 + j(3), 50 + j(3), 20, PINK);
  return s;
}
function idle(t) { // info area while scrolling
  let s = '<text x="540" y="1420" text-anchor="middle" font-family="P" font-weight="800" font-size="62" fill="' + INK + '">Real deals, checked daily</text>';
  s += '<text x="540" y="1500" text-anchor="middle" font-family="P" font-weight="600" font-size="40" fill="#6b4a78">Scrolling today’s Top 50…</text>';
  const k = (t * 1.6) % 1; s += stroke(wob(330, 1560, 330 + 420 * k, 1560, 6, 3), PINK, 10);
  s += sparkle(170 + j(3), 1420 + j(3), 26, SUN) + sparkle(910 + j(3), 1400 + j(3), 20, PINK);
  s += '<rect x="290" y="1650" width="500" height="96" rx="48" fill="' + INK + '"/><text x="540" y="1713" text-anchor="middle" font-family="P" font-weight="800" font-size="40" fill="#fff">www.ubottega.com</text>';
  return s;
}
function highlight(seg, t) {
  let s = '';
  // the info card: category sticker, product name, discount
  const e = ease((t - .2) / .45);
  s += '<g opacity="' + e + '" transform="translate(0 ' + ((1 - e) * 60) + ')">';
  s += '<path d="' + P(box(60, 1300, 960, 420, 5)) + 'Z" fill="#fff" stroke="' + INK + '" stroke-width="8" stroke-linejoin="round"/>';
  s += '<g transform="translate(110 1295) rotate(-4)"><rect x="0" y="-40" width="' + (60 + seg.cat.length * 31) + '" height="76" rx="26" fill="' + seg.colour + '" stroke="' + INK + '" stroke-width="5"/><text x="30" y="14" font-family="P" font-weight="800" font-size="44" fill="#fff">' + esc(seg.cat) + '</text></g>';
  seg.name.forEach((l, i) => s += '<text x="110" y="' + (1440 + i * 74) + '" font-family="P" font-weight="800" font-size="60" fill="' + INK + '">' + esc(l) + '</text>');
  s += '<text x="110" y="' + (1440 + seg.name.length * 74 + 20) + '" font-family="P" font-weight="600" font-size="38" fill="#6b4a78">' + esc(seg.note) + '</text>';
  s += '</g>';
  s += '<g opacity="' + e + '"><rect x="290" y="1770" width="500" height="90" rx="45" fill="' + INK + '"/><text x="540" y="1830" text-anchor="middle" font-family="P" font-weight="800" font-size="38" fill="#fff">www.ubottega.com</text></g>';
  const k = pop(t - .7); if (k) s += '<g transform="translate(905 1600) rotate(' + (10 + j(1.5)) + ') scale(' + k + ')">' + burst(0, 0, 105, PINK) + '<text x="0" y="-6" text-anchor="middle" font-family="P" font-weight="800" font-size="56" fill="#fff">' + esc(seg.off) + '</text><text x="0" y="40" text-anchor="middle" font-family="P" font-weight="800" font-size="30" fill="#fff">OFF</text></g>';
  // boiling circle around the price, drawn once the zoom has landed
  if (seg.ring && t > seg.ringAt && t < seg.secs - .5) {
    const p = ease((t - seg.ringAt) / .5), r = seg.ring, pts = [];
    for (let i = 0; i <= 40; i++) { const a = -2.4 + i / 40 * Math.PI * 2.2; pts.push([r.x + Math.cos(a) * (r.rx + j(6)), r.y + Math.sin(a) * (r.ry + j(6))]); }
    s += stroke(pts, SUN, 16, p) + stroke(pts.map(([x, y]) => [x + j(2), y + j(2)]), PINK, 7, p);
  }
  return s;
}
function outro(seg, t) {
  const e = ease(t / .4); let s = '<rect x="0" y="300" width="1080" height="1620" fill="rgba(59,15,58,' + (.75 * e) + ')"/>';
  s += '<g opacity="' + e + '"><image href="' + LOGO + '" x="340" y="420" width="400" height="400"/>';
  s += '<text x="540" y="960" text-anchor="middle" font-family="P" font-weight="800" font-size="72" fill="#fff">See all 50 deals</text>';
  s += '<text x="540" y="1050" text-anchor="middle" font-family="P" font-weight="800" font-size="56" fill="' + SUN + '">www.ubottega.com</text>';
  s += '<text x="540" y="1150" text-anchor="middle" font-family="P" font-weight="600" font-size="36" fill="#fff">Prices change fast: check today’s price</text>';
  s += sparkle(250 + j(3), 520 + j(3), 30, SUN) + sparkle(840 + j(3), 760 + j(3), 24, PINK) + '</g>';
  return s;
}
window.render = (seg, t, b) => {
  seed = 100 + b * 31 + (seg.n || 0) * 7;
  let s = band(seg, t);
  if (seg.kind === 'scroll' || seg.kind === 'intro') s += idle(t);
  if (seg.kind === 'highlight') s += highlight(seg, t);
  if (seg.kind === 'outro') s += outro(seg, t);
  if (seg.kind === 'scroll') { const k = pop(t); s += '<g transform="translate(930 360) rotate(6) scale(' + k + ')"><rect x="-95" y="-38" width="190" height="76" rx="24" fill="' + SKY + '" stroke="' + INK + '" stroke-width="5"/><text x="0" y="14" text-anchor="middle" font-family="P" font-weight="800" font-size="38" fill="#fff">▶▶ x2</text></g>'; }
  const defs = [0, 1, 2].map(i => '<filter id="b' + i + '" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="' + (i * 7 + 3) + '"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter>').join('');
  document.getElementById('s').innerHTML = '<defs>' + defs + '</defs><g filter="url(#b' + b + ')">' + s + '</g>';
};
</script>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
for (const seg of edl.segments) {
  const dir = path.join(outDir, seg.id); mkdirSync(dir, { recursive: true });
  for (let f = 0; f < Math.ceil(seg.secs * 12) + 1; f++) {
    await p.evaluate(([sg, t, bb]) => window.render(sg, t, bb), [seg, f / 12, Math.floor(f * 8 / 12) % 3]);
    await p.screenshot({ path: path.join(dir, String(f).padStart(4, '0') + '.png'), omitBackground: true });
  }
}
await b.close(); console.log('ok');
