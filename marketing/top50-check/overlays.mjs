// Transparent overlay frames (1080x1920, 12 fps) for the "I checked the Top 50" video:
// a doodle title banner per product, then an animated verdict: green check (boiling sparkles), red X, or "?".
// node overlays.mjs <outDir> <fontDir> <deals.json>
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, outDir, fontDir, dealsFile] = process.argv;
const deals = JSON.parse(readFileSync(dealsFile, 'utf8'));
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
const html = `<style>
@font-face { font-family: P; font-weight: 600; src: url(data:font/ttf;base64,${font('SemiBold')}); }
@font-face { font-family: P; font-weight: 800; src: url(data:font/ttf;base64,${font('ExtraBold')}); }
html,body{margin:0;width:1080px;height:1920px;background:transparent;overflow:hidden}</style>
<svg id="s" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"></svg>
<script>
let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); const j = (a) => (rnd() - .5) * 2 * a;
const pathOf = (pts) => 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L');
function stroke(pts, colour, w, p = 1) {
  const d = pathOf(pts), id = 'p' + Math.floor(rnd() * 1e9);
  return '<path id="' + id + '" d="' + d + '" fill="none" stroke="' + colour + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="' + (1 - p) + '"/>';
}
function line(x0, y0, x1, y1, n, a) { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t + j(a), y0 + (y1 - y0) * t + j(a)]); } return pts; }
function sparkle(x, y, r, c) { return stroke([[x, y - r + j(3)], [x + j(2), y], [x + j(2), y + r + j(3)]], c, 8) + stroke([[x - r + j(3), y], [x, y + j(2)], [x + r + j(3), y + j(2)]], c, 8); }
function banner(d, t, b) {
  seed = 1000 + b * 7;
  const a = Math.min(1, t / .35), e = 1 - Math.pow(1 - a, 3);
  const y = 40 - (1 - e) * 60;
  let s = '<g opacity="' + e + '" transform="translate(0 ' + y + ')">';
  s += '<path d="M' + (40 + j(4)) + ',' + (20 + j(3)) + ' L' + (1040 + j(4)) + ',' + (14 + j(3)) + ' L' + (1036 + j(4)) + ',' + (176 + j(3)) + ' L' + (44 + j(4)) + ',' + (170 + j(3)) + ' Z" fill="#ffffff" stroke="#3b0f3a" stroke-width="7" stroke-linejoin="round"/>';
  s += '<rect x="66" y="40" width="210" height="50" rx="16" fill="#ff3d7f"/><text x="171" y="75" text-anchor="middle" font-family="P" font-weight="800" font-size="27" fill="#fff">DEAL ' + d.n + ' OF ' + d.total + '</text>';
  s += '<text x="66" y="146" font-family="P" font-weight="800" font-size="' + (d.title.length > 26 ? 46 : 54) + '" fill="#3b0f3a">' + d.title + '</text>';
  s += '<text x="1010" y="78" text-anchor="end" font-family="P" font-weight="800" font-size="40" fill="#ff3d7f">' + d.off + '</text>';
  s += sparkle(1000 + j(3), 150 + j(3), 18, '#ffd23f') + '</g>';
  return s;
}
function verdict(d, t, b) {
  seed = 5000 + b * 13 + d.n * 3;
  const cx = 540, cy = 590; let s = '';
  const draw = Math.min(1, t / .55);
  s += '<rect x="0" y="0" width="1080" height="1120" fill="rgba(59,15,58,' + (.45 * Math.min(1, t / .25)) + ')"/>';
  if (d.verdict === 'yes') {
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (215 + j(4)) + '" fill="#ffffff" stroke="#1fa971" stroke-width="14" opacity="' + Math.min(1, t / .2) + '"/>';
    s += stroke([[cx - 120 + j(4), cy + 5 + j(4)], [cx - 45 + j(4), cy + 90 + j(4)], [cx + 130 + j(5), cy - 110 + j(5)]], '#1fa971', 42, draw);
    if (t > .5) for (const [x, y, r] of [[cx - 250, cy - 170, 34], [cx + 255, cy - 150, 26], [cx + 230, cy + 190, 30], [cx - 240, cy + 160, 22]]) s += sparkle(x + j(5), y + j(5), r, '#ffd23f');
  } else if (d.verdict === 'no') {
    s += stroke(line(cx - 200, cy - 200, cx + 200, cy + 200, 8, 6), '#e0344f', 58, Math.min(1, t / .3));
    s += stroke(line(cx + 200, cy - 200, cx - 200, cy + 200, 8, 6), '#e0344f', 58, Math.max(0, Math.min(1, (t - .25) / .3)));
  } else {
    s += '<text x="' + (cx + j(4)) + '" y="' + (cy + 120) + '" text-anchor="middle" font-family="P" font-weight="800" font-size="380" fill="#ffd23f" stroke="#3b0f3a" stroke-width="10" opacity="' + Math.min(1, t / .25) + '">?</text>';
  }
  if (t > .45) {
    const k = Math.min(1, (t - .45) / .3), col = d.verdict === 'yes' ? '#1fa971' : d.verdict === 'no' ? '#e0344f' : '#3b0f3a';
    const label = d.verdict === 'yes' ? 'REAL DEAL' : d.verdict === 'no' ? 'SKIP IT' : 'NOT CHECKED';
    s += '<g opacity="' + k + '"><rect x="190" y="' + (cy + 260) + '" width="700" height="96" rx="30" fill="' + col + '" stroke="#3b0f3a" stroke-width="6"/>';
    s += '<text x="540" y="' + (cy + 326) + '" text-anchor="middle" font-family="P" font-weight="800" font-size="56" fill="#fff">' + label + '</text>';
    s += '<text x="540" y="' + (cy + 420) + '" text-anchor="middle" font-family="P" font-weight="800" font-size="38" fill="#fff" stroke="#3b0f3a" stroke-width="7" paint-order="stroke">' + d.line + '</text></g>';
  }
  return s;
}
function card(lines, t, b) {
  seed = 9000 + b * 5; const e = 1 - Math.pow(1 - Math.min(1, t / .4), 3);
  let s = '<rect x="0" y="0" width="1080" height="1120" fill="rgba(59,15,58,' + (.55 * e) + ')"/><g opacity="' + e + '" transform="translate(0 ' + ((1 - e) * 50) + ')">';
  s += '<rect x="' + (70 + j(3)) + '" y="' + (300 + j(3)) + '" width="940" height="520" rx="44" fill="#fff" stroke="#3b0f3a" stroke-width="8"/>';
  lines.forEach((l, i) => s += '<text x="540" y="' + (410 + i * 92) + '" text-anchor="middle" font-family="P" font-weight="800" font-size="' + (l.size || 56) + '" fill="' + (l.colour || '#3b0f3a') + '">' + l.text + '</text>');
  s += sparkle(130 + j(4), 300 + j(4), 32, '#ffd23f') + sparkle(960 + j(4), 820 + j(4), 28, '#ffd23f') + sparkle(980 + j(3), 290 + j(3), 18, '#ff3d7f') + '</g>';
  return s;
}
window.render = (kind, d, t, b) => { document.getElementById('s').innerHTML = kind === 'banner' ? banner(d, t, b) : kind === 'verdict' ? verdict(d, t, b) : card(d, t, b); };
</script>`;
const FPS = 12;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
async function seq(name, kind, d, secs) {
  const dir = path.join(outDir, name); mkdirSync(dir, { recursive: true });
  for (let f = 0; f < Math.round(secs * FPS); f++) {
    await p.evaluate(([k, dd, t, bb]) => window.render(k, dd, t, bb), [kind, d, f / FPS, Math.floor(f * 8 / FPS) % 3]);
    await p.screenshot({ path: path.join(dir, String(f).padStart(4, '0') + '.png'), omitBackground: true });
  }
}
const yes = deals.items.filter((x) => x.verdict === 'yes').length, no = deals.items.filter((x) => x.verdict === 'no').length;
await seq('intro', 'card', [{ text: 'I checked the price' }, { text: 'history on today’s' }, { text: 'Top 50 "deals"', colour: '#ff3d7f' }, { text: 'Real deal or not?', size: 44 }], deals.introSecs);
for (const d of deals.items) {
  await seq('banner' + d.n, 'banner', d, d.bannerSecs);
  await seq('verdict' + d.n, 'verdict', d, d.verdictSecs);
}
await seq('outro', 'card', [{ text: yes + ' real deals ✓', colour: '#1fa971' }, { text: no + ' to skip ✗', colour: '#e0344f' }, { text: 'Links in my bio', size: 50 }, { text: '#ad · I earn from qualifying purchases', size: 30 }], deals.outroSecs);
await b.close(); console.log('ok');
