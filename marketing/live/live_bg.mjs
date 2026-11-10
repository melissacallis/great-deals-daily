// TikTok LIVE background (1080x1920): today's top deals from the live site, numbered, with photos and % OFF.
// Two layouts: "sides" (5 deals down each side, centre clear for the host) and "grid" (2x5, for green screen
// with the host small at the bottom). Keeps clear of LIVE overlays: top ~180 px (host/viewers), bottom ~520 px
// (comments), right ~110 px lower half (gift buttons).
// node live_bg.mjs <deals.json> <outDir> <fontDir> <date label> [skip indexes, e.g. 6]
// env: PICK=1,3,4 (use only these list positions), TITLE, SUB, THEME=xmas, NAME (output file prefix)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, dealsFile, outDir, fontDir, dateLabel, skip = ''] = process.argv;
const skipSet = new Set(skip.split(',').filter(Boolean).map(Number));
const all = JSON.parse(readFileSync(dealsFile, 'utf8')).items;
const pick = (process.env.PICK || '').split(',').filter(Boolean).map(Number);
const deals = pick.length ? pick.map((n) => all[n - 1]) : all.filter((_, i) => !skipSet.has(i + 1)).slice(0, 10);
const TITLE = process.env.TITLE || 'Top 10 Deals', SUB = process.env.SUB || 'on Amazon right now', XMAS = process.env.THEME === 'xmas';
const NAME = process.env.NAME || 'live-top10';
const logo = readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '../../public/img/logo-badge.svg')).toString('base64');
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
const short = (t) => { let s = t.replace(/\s+/g, ' ').trim(); const c = s.search(/,| - | – | \| |\(|\[| with /i); if (c > 14) s = s.slice(0, c); return s.length > 34 ? s.slice(0, 32).replace(/\s+\S*$/, '') + '…' : s; };
const img = (u) => (u || '').replace(/_SL\d+_/, '_SL600_');
const card = (d, n, cls) => `<div class="card ${cls}"><span class="n">${n}</span><div class="ph"><img src="${img(d.image)}"></div>
  <div class="tx"><div class="nm">${short(d.title)}</div><div class="pr">${d.price}</div></div><div class="off">-${d.savingsPct}%<small>OFF</small></div></div>`;
const html = (layout) => `<!doctype html><style>
@font-face{font-family:P;font-weight:600;src:url(data:font/ttf;base64,${font('SemiBold')})}
@font-face{font-family:P;font-weight:800;src:url(data:font/ttf;base64,${font('ExtraBold')})}
*{box-sizing:border-box} html,body{margin:0;width:1080px;height:1920px;overflow:hidden;font-family:P}
body{background:${XMAS ? 'radial-gradient(circle at 20% 12%,#e8364f 0,transparent 50%),radial-gradient(circle at 85% 85%,#1f9d6b 0,transparent 50%),linear-gradient(160deg,#b3122e,#0f6b47)' : 'radial-gradient(circle at 20% 15%,#ff7aa8 0,transparent 45%),radial-gradient(circle at 85% 80%,#ffb36b 0,transparent 45%),linear-gradient(160deg,#ff3d7f,#ff8a3d)'}}
.lights{position:absolute;top:105px;left:0;width:1080px;height:60px}
.snow{position:absolute;color:rgba(255,255,255,.55);font-size:28px}
.head{position:absolute;top:190px;left:0;right:0;text-align:center;color:#fff}
.head img{width:120px;height:120px;vertical-align:middle;filter:drop-shadow(0 6px 10px rgba(59,15,58,.35))}
.head h1{display:inline-block;vertical-align:middle;margin:0 0 0 14px;font-size:76px;line-height:.95;text-align:left;text-shadow:0 5px 0 rgba(59,15,58,.18)}
.head h1 span{display:block;font-size:40px;color:#ffd45c}
.date{display:inline-block;margin-top:14px;background:#3b0f3a;color:#ffd45c;font-weight:800;font-size:34px;padding:8px 26px;border-radius:999px}
.card{position:absolute;background:#fff;border-radius:26px;box-shadow:0 10px 0 rgba(59,15,58,.18),0 14px 30px rgba(59,15,58,.25);display:flex;align-items:center;gap:12px;padding:10px 12px}
.n{position:absolute;top:-14px;left:-10px;background:#3b0f3a;color:#fff;font-weight:800;font-size:28px;width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:4px solid #fff}
.ph{flex:none;background:#fff;border-radius:18px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.ph img{max-width:100%;max-height:100%;object-fit:contain}
.nm{color:#3b0f3a;font-weight:800;line-height:1.12;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden} .pr{color:#ff3d7f;font-weight:800;margin-top:4px}
.off{position:absolute;background:#ffd45c;color:#3b0f3a;font-weight:800;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;border:4px solid #fff;transform:rotate(10deg);box-shadow:0 4px 8px rgba(59,15,58,.25)}
.off small{font-size:.45em;margin-top:-4px}
/* sides: 5 down each side, centre clear */
.side{width:300px;height:184px;flex-direction:column;gap:4px;padding:10px 12px} .side .ph{width:150px;height:84px} .side .tx{text-align:center} .side .nm{font-size:19px} .side .pr{font-size:24px;margin-top:2px}
.side .off{width:96px;height:96px;font-size:30px;top:-18px;right:-14px}
/* grid: 2 x 5 */
.grid{width:470px;height:150px} .grid .ph{width:126px;height:126px} .grid .tx{padding-right:78px} .grid .nm{font-size:24px} .grid .pr{font-size:30px}
.grid .off{width:104px;height:104px;font-size:32px;top:-16px;right:-16px}
.foot{position:absolute;left:0;right:0;text-align:center;color:#fff;font-weight:800;font-size:40px;text-shadow:0 3px 0 rgba(59,15,58,.25)}
</style><body>
${['10%,40%', '88%,30%', '6%,62%', '92%,58%', '50%,93%', '20%,88%', '80%,90%'].map((p) => `<span class="snow" style="left:${p.split(',')[0]};top:${p.split(',')[1]}">❄</span>`).join('')}
${XMAS ? `<svg class="lights" viewBox="0 0 1080 60"><path d="M0 8 Q270 50 540 10 T1080 8" fill="none" stroke="#173d2a" stroke-width="4"/>${[...Array(14)].map((_, i) => { const x = 20 + i * 79, y = 8 + Math.abs(Math.sin((x / 540) * Math.PI)) * 22; return `<ellipse cx="${x}" cy="${y + 14}" rx="9" ry="13" fill="${['#ffd45c', '#ff5a6e', '#3fe08f', '#3fb8ff', '#ff7ac0'][i % 5]}"/>`; }).join('')}</svg>` : ''}
<div class="head"><img src="data:image/svg+xml;base64,${logo}"><h1>${TITLE}<span>${SUB}</span></h1><br><span class="date">${dateLabel}</span></div>
${layout === 'sides'
  ? deals.map((d, i) => card(d, i + 1, 'side').replace('class="card side"', `class="card side" style="left:${i < 5 ? 28 : 752}px;top:${470 + (i % 5) * 196}px"`)).join('')
  : deals.map((d, i) => card(d, i + 1, 'grid').replace('class="card grid"', `class="card grid" style="left:${i % 2 ? 562 : 48}px;top:${470 + Math.floor(i / 2) * 176}px"`)).join('')}
<div class="foot" style="top:${layout === 'sides' ? 1462 : 1360}px">🔗 Links in my bio</div>
</body>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
for (const layout of ['sides', 'grid']) {
  await p.setContent(html(layout), { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(outDir, `${NAME}-${layout}.png`) });
}
await b.close(); console.log(deals.map((d, i) => `${i + 1}. -${d.savingsPct}% ${d.price} ${short(d.title)}`).join('\n'));
