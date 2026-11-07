// Paper-cut overlay frames (1080x1920, 12 fps, stop-motion feel) for the daily deals video.
// Everything except the browser window is paper: layered torn sheets, cut-out letters, paper snowflakes,
// tape, and cut-paper stickers. The browser shows through a torn window (PX,PY,PW,PH from the edl).
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
<svg id="s" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"></svg>
<script>
const LOGO = 'data:image/svg+xml;base64,${logo}';
const E = ${JSON.stringify({ PX: edl.PX, PY: edl.PY, PW: edl.PW, PH: edl.PH, date: edl.date, weekday: edl.weekday, cta: edl.cta, ctaEnd: edl.ctaEnd })};
let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); const j = (a) => (rnd() - .5) * 2 * a;
const INK = '#3b1f2b', CREAM = '#fbf1e1', KRAFT = '#e9d3b4', PINK = '#ff6f9c', CORAL = '#ff9a6b', SUN = '#ffd45c', MINT = '#7fd6b8', SKY = '#8cc8ff', RED = '#e8505b', PLUM = '#5b2a4e';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const P = (pts) => 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L') + 'Z';
// stop-motion: snap animation progress to 1/6 steps
const step = (t, n = 6) => Math.round(Math.max(0, Math.min(1, t)) * n) / n;
const ease = (t) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
// torn edge between (x0,y0) and (x1,y1): small random teeth
function torn(x0, y0, x1, y1, n, a) { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t + j(a * .3), y0 + (y1 - y0) * t + j(a)]); } return pts; }
function tornRect(x, y, w, h, a, n = 18) {
  return [...torn(x, y, x + w, y, n, a), ...torn(x + w, y, x + w, y + h, Math.max(4, n * h / w | 0), a).slice(1).map(([px, py]) => [px + j(a) - j(a * .3), py]),
          ...torn(x + w, y + h, x, y + h, n, a).slice(1), ...torn(x, y + h, x, y, Math.max(4, n * h / w | 0), a).slice(1).map(([px, py]) => [px + j(a), py])];
}
const sheet = (pts, fill, sh = 'sh') => '<path d="' + P(pts) + '" fill="' + fill + '" filter="url(#' + sh + ')"/>' + '<path d="' + P(pts) + '" fill="url(#grain)" opacity=".5"/>';
function tape(x, y, w, rot) { return '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')"><path d="' + P(tornRect(-w / 2, -16, w, 32, 2, 6)) + '" fill="rgba(255,248,220,.75)" filter="url(#sh2)"/></g>'; }
function flake(x, y, r, rot) { // paper snowflake: six cut arms
  let d = ''; for (let i = 0; i < 6; i++) { const a = rot + i * Math.PI / 3, c = Math.cos(a), s = Math.sin(a);
    d += '<path d="M' + (x + c * r * .15) + ',' + (y + s * r * .15) + ' L' + (x + c * r) + ',' + (y + s * r) + '" stroke="#fff" stroke-width="' + (r * .16) + '" stroke-linecap="round"/>';
    for (const k of [.5, .72]) { const bx = x + c * r * k, by = y + s * r * k; for (const sg of [1, -1]) { const a2 = a + sg * .7; d += '<path d="M' + bx + ',' + by + ' L' + (bx + Math.cos(a2) * r * .28) + ',' + (by + Math.sin(a2) * r * .28) + '" stroke="#fff" stroke-width="' + (r * .11) + '" stroke-linecap="round"/>'; } } }
  return '<g filter="url(#sh2)">' + d + '<circle cx="' + x + '" cy="' + y + '" r="' + (r * .18) + '" fill="#fff"/></g>';
}
function star(x, y, r, fill, rot = 0) { const pts = []; for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .45 : r; pts.push([x + Math.cos(a) * rr + j(1), y + Math.sin(a) * rr + j(1)]); } return sheet(pts, fill, 'sh2'); }
function burst(x, y, r, fill) { const pts = []; for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, rr = i % 2 ? r * .8 : r; pts.push([x + Math.cos(a) * rr + j(1.5), y + Math.sin(a) * rr + j(1.5)]); } return sheet(pts, fill); }
// cut-out letters: each letter on its own scrap of paper, ransom-note style
function cutWord(text, x, y, size, colours, b) {
  let s = '', cx = x; seed = 900 + text.length * 7 + b * 13;
  for (const [i, ch] of [...text].entries()) {
    if (ch === ' ') { cx += size * .38; continue; }
    const w = size * (ch.match(/[mwMW]/) ? .95 : ch.match(/[il1I\\.\\-]/) ? .45 : .72), bg = colours[i % colours.length], rot = j(7);
    s += '<g transform="translate(' + (cx + w / 2) + ' ' + (y + j(3)) + ') rotate(' + rot + ')">' + sheet(tornRect(-w / 2 - 6, -size * .78, w + 12, size * 1.02, 2.5, 5), bg, 'sh2')
       + '<text x="0" y="0" text-anchor="middle" font-family="P" font-weight="800" font-size="' + size * .82 + '" fill="' + (bg === INK || bg === PLUM ? '#fff' : INK) + '">' + esc(ch) + '</text></g>';
    cx += w + size * .1;
  }
  return s;
}

function backdrop(b) { // all the paper around the browser window, with a torn hole for it
  seed = 77 + b; let s = '';
  const { PX, PY, PW, PH } = E;
  const hole = tornRect(PX + 6, PY + 6, PW - 12, PH - 12, 3, 30);
  s += '<defs><mask id="win"><rect width="1080" height="1920" fill="#fff"/><path d="' + P(hole) + '" fill="#000"/></mask></defs>';
  s += '<g mask="url(#win)"><rect width="1080" height="1920" fill="' + KRAFT + '"/><rect width="1080" height="1920" fill="url(#grain)" opacity=".7"/>';
  // big layered torn sheets
  s += sheet([...torn(-20, 380, 1100, 330, 22, 9), [1100, -20], [-20, -20]], PINK);
  s += sheet([...torn(-20, 300, 1100, 270, 22, 8), [1100, -20], [-20, -20]], CORAL);
  s += sheet([...torn(-20, 1290, 1100, 1250, 22, 9), [1100, 1940], [-20, 1940]], CREAM);
  s += sheet([...torn(-20, 1780, 1100, 1820, 22, 8), [1100, 1940], [-20, 1940]], MINT);
  // frame of the window: a white paper mat with torn inner edge
  s += sheet(tornRect(PX - 18, PY - 18, PW + 36, PH + 36, 4, 30), '#fffaf2');
  s += '</g>';
  s += tape(PX + 40, PY - 4, 150, -12) + tape(PX + PW - 40, PY - 4, 150, 10) + tape(PX + 40, PY + PH + 4, 140, 9) + tape(PX + PW - 40, PY + PH + 4, 140, -8);
  // paper snowflakes and stars, gently stepping
  s += flake(70 + j(1), 120 + j(1), 46, .2 + b * .05) + flake(1010 + j(1), 220 + j(1), 34, .5 - b * .05) + flake(980, 1840, 40, b * .08) + flake(80, 1700, 30, .3 + b * .06);
  return s;
}
function header(b) {
  let s = '<image href="' + LOGO + '" x="' + (24 + j(1)) + '" y="' + (36 + j(1)) + '" width="190" height="190" filter="url(#sh)"/>';
  s += cutWord('TOP DEALS', 236, 132, 92, [CREAM, SUN, '#fff', MINT, SKY, CREAM, SUN, '#fff', MINT], b);
  seed = 600 + b;
  s += '<g transform="translate(250 205) rotate(' + (-2 + j(.6)) + ')">' + sheet(tornRect(0, -38, 450, 66, 2.5, 10), INK) + '<text x="22" y="10" font-family="P" font-weight="800" font-size="36" fill="#fff">on Amazon today</text></g>';
  // date tag on a string
  s += '<path d="M905 0 L912 60" stroke="' + INK + '" stroke-width="3"/>';
  s += '<g transform="translate(912 150) rotate(' + (7 + j(1.5)) + ')">' + sheet([[-80, -70], [80, -70], [80, 70], [-80, 70], [-80, -70]].map(([x, y]) => [x + j(2), y + j(2)]), SUN) + '<circle cx="0" cy="-48" r="10" fill="' + KRAFT + '"/>'
     + '<text x="0" y="0" text-anchor="middle" font-family="P" font-weight="800" font-size="34" fill="' + INK + '">' + esc(E.weekday) + '</text><text x="0" y="50" text-anchor="middle" font-family="P" font-weight="800" font-size="56" fill="' + INK + '">' + esc(E.date) + '</text></g>';
  return s;
}
function note(text, sub, t, b) { // bottom paper note while scrolling
  const k = step(t / .5); seed = 300 + b;
  let s = '<g transform="translate(540 ' + (1430 + (1 - k) * 260) + ') rotate(' + (-1.5 + j(.5)) + ')">' + sheet(tornRect(-430, -95, 860, 190, 4, 16), '#fff');
  s += '<text x="0" y="-8" text-anchor="middle" font-family="P" font-weight="800" font-size="54" fill="' + INK + '">' + esc(text) + '</text>';
  if (sub) s += '<text x="0" y="52" text-anchor="middle" font-family="P" font-weight="600" font-size="36" fill="' + PLUM + '">' + esc(sub) + '</text>';
  return s + '</g>' + tape(540, 1430 + (1 - k) * 260 - 92, 170, -3);
}
function ffwd(t, b) { const k = step(t / .4, 4); seed = 40 + b; if (!k) return ''; return '<g transform="translate(950 ' + (E.PY + 70) + ') rotate(' + (8 + j(1)) + ') scale(' + k + ')">' + sheet(tornRect(-85, -40, 170, 80, 3, 8), SKY) + '<text x="0" y="16" text-anchor="middle" font-family="P" font-weight="800" font-size="40" fill="' + INK + '">▶▶ x3</text></g>'; }
function highlight(seg, t, b) {
  let s = '';
  // paper ring (cut from yellow card) around the price, pops in stop-motion style
  if (seg.ring && t > seg.ringAt && t < seg.secs - .4) {
    const k = step((t - seg.ringAt) / .35, 4), r = seg.ring; seed = 500 + b;
    const outer = [], inner = [];
    for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; outer.push([r.x + Math.cos(a) * (r.rx + 18) * k + j(2), r.y + Math.sin(a) * (r.ry + 18) * k + j(2)]); inner.push([r.x + Math.cos(-a) * r.rx * k + j(1.5), r.y + Math.sin(-a) * r.ry * k + j(1.5)]); }
    if (k > 0) s += '<path d="' + P(outer) + ' ' + P(inner) + '" fill="' + SUN + '" fill-rule="evenodd" filter="url(#sh)"/><path d="' + P(outer) + ' ' + P(inner) + '" fill="url(#grain)" fill-rule="evenodd" opacity=".5"/>';
    if (k === 1) s += tape(r.x + r.rx + 10, r.y - r.ry - 6, 90, 35);
  }
  // header card at the bottom
  const k = step((t - .15) / .5); seed = 700 + seg.n * 11 + b;
  const y = 1440 + (1 - k) * 330;
  s += '<g transform="translate(540 ' + y + ') rotate(' + (seg.n % 2 ? -1.5 : 1.5) + ')">' + sheet(tornRect(-470, -160, 940, 320, 4, 18), '#fff');
  s += '<g transform="translate(-420 -150) rotate(-4)">' + sheet(tornRect(0, -36, 30 + seg.cat.length * 30, 72, 3, 8), seg.colour) + '<text x="18" y="14" font-family="P" font-weight="800" font-size="42" fill="' + (seg.colour === PLUM ? '#fff' : INK) + '">' + esc(seg.cat) + '</text></g>';
  seg.name.forEach((l, i) => s += '<text x="-420" y="' + (-30 + i * 66) + '" font-family="P" font-weight="800" font-size="' + (l.length > 18 ? 46 : 54) + '" fill="' + INK + '">' + esc(l) + '</text>');
  s += '<text x="-420" y="' + (-30 + seg.name.length * 66 + 6) + '" font-family="P" font-weight="600" font-size="34" fill="' + PLUM + '">' + esc(seg.note) + '</text></g>';
  s += tape(540, y - 156, 180, 2);
  const kb = step((t - .7) / .3, 3);
  if (kb) s += '<g transform="translate(905 ' + (y + 40) + ') rotate(' + (10 + j(1)) + ') scale(' + kb + ')">' + burst(0, 0, 112, RED) + '<text x="0" y="0" text-anchor="middle" font-family="P" font-weight="800" font-size="56" fill="#fff">' + esc(seg.off) + '</text><text x="0" y="44" text-anchor="middle" font-family="P" font-weight="800" font-size="30" fill="#fff">OFF</text></g>';
  // little scissors cut-out near the ring
  return s;
}
function outro(t, b) {
  const k = step(t / .5); seed = 1300 + b; const { PX, PY, PW, PH } = E;
  let s = '<g transform="translate(0 ' + ((1 - k) * 1400) + ')">' + sheet(tornRect(PX - 10, PY - 10, PW + 20, PH + 20, 6, 30), CREAM);
  s += '<image href="' + LOGO + '" x="340" y="' + (PY + 90) + '" width="400" height="400" filter="url(#sh)"/>';
  s += cutWord('SEE ALL 50', 190, PY + 600, 84, [PINK, SUN, MINT, SKY, CORAL, '#fff', PINK, SUN, MINT, SKY], b);
  s += '<g transform="translate(540 ' + (PY + 720) + ') rotate(-2)">' + sheet(tornRect(-280, -48, 560, 92, 3, 10), INK) + '<text x="0" y="16" text-anchor="middle" font-family="P" font-weight="800" font-size="44" fill="' + SUN + '">' + esc(E.ctaEnd) + '</text></g>';
  return s + '</g>';
}
window.render = (seg, t, b) => {
  let s = backdrop(b) + header(b);
  if (seg.kind === 'addr') s += note('Where I find today’s deals', 'Real markdowns, checked daily', t, b);
  if (seg.kind === 'scroll') s += note('Scrolling today’s Top 50…', E.cta, t, b) + ffwd(t, b);
  if (seg.kind === 'highlight') s += highlight(seg, t, b);
  if (seg.kind === 'outro') s += outro(t, b);
  const defs = '<defs><filter id="sh" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#3b1f2b" flood-opacity=".35"/></filter>'
    + '<filter id="sh2" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#3b1f2b" flood-opacity=".3"/></filter>'
    + '<filter id="gn"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .2  0 0 0 0 .15  0 0 0 .35 0"/></filter>'
    + '<pattern id="grain" width="300" height="300" patternUnits="userSpaceOnUse"><rect width="300" height="300" filter="url(#gn)"/></pattern></defs>';
  document.getElementById('s').innerHTML = defs + s;
};
</script>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
for (const seg of edl.segments) {
  const dir = path.join(outDir, seg.id); mkdirSync(dir, { recursive: true });
  for (let f = 0; f < Math.ceil(seg.secs * 12) + 1; f++) {
    await p.evaluate(([sg, t, bb]) => window.render(sg, t, bb), [seg, f / 12, Math.floor(f * 6 / 12) % 3]);
    await p.screenshot({ path: path.join(dir, String(f).padStart(4, '0') + '.png'), omitBackground: true });
  }
}
await b.close(); console.log('ok');
