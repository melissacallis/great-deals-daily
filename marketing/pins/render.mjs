// Pinterest pins (1000x1500) for the Top 50 list pages. No prices and no Amazon product photos.
// node render.mjs <outDir> <fontDir>
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, outDir, fontDir] = process.argv;
mkdirSync(outDir, { recursive: true });
const here = path.dirname(new URL(import.meta.url).pathname);
const logo = readFileSync(path.join(here, '../../public/img/logo-badge.svg')).toString('base64');
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');

const PINS = [
  { file: '1-gifts-for-her.png', kicker: 'HOLIDAY 2026', top: 'Top 50', big: 'Gift Deals', hl: 'for Her', path: '/top/her',
    items: [['🧶', 'Sweaters'], ['💍', 'Jewelry'], ['🧴', 'Beauty sets'], ['🛋️', 'Soft blankets']], bg: ['#ff3d7f', '#ff8a4c'] },
  { file: '2-gifts-for-him.png', kicker: 'HOLIDAY 2026', top: 'Top 50', big: 'Gift Deals', hl: 'for Him', path: '/top/him',
    items: [['🧰', 'Tool sets'], ['🎧', 'Gadgets'], ['🧥', 'Jackets'], ['🏋️', 'Fitness gear']], bg: ['#3b0f3a', '#ff3d7f'] },
  { file: '3-gifts-for-kids.png', kicker: 'HOLIDAY 2026', top: 'Top 50', big: 'Gift Deals', hl: 'for Kids', path: '/top/kids',
    items: [['🧸', 'Toys'], ['🧱', 'LEGO sets'], ['🎮', 'Games'], ['🎨', 'Craft kits']], bg: ['#ff8a4c', '#e0344f'] },
];

const html = (p) => `<!doctype html><html><head><style>
@font-face { font-family: P; font-weight: 600; src: url(data:font/ttf;base64,${font('SemiBold')}); }
@font-face { font-family: P; font-weight: 800; src: url(data:font/ttf;base64,${font('ExtraBold')}); }
html,body{margin:0;width:1000px;height:1500px;overflow:hidden;font-family:P,sans-serif}
.pin{position:relative;width:1000px;height:1500px;background:linear-gradient(160deg,${p.bg[0]},${p.bg[1]});color:#fff;overflow:hidden}
.blob{position:absolute;border-radius:50%;background:#fff;opacity:.10}
.kicker{position:absolute;left:80px;top:96px;background:#ffd23f;color:#3b0f3a;font-weight:800;font-size:30px;letter-spacing:3px;padding:12px 26px;border-radius:999px;transform:rotate(-3deg)}
h1{position:absolute;left:80px;top:190px;margin:0;font-weight:800;line-height:.98;font-size:150px;letter-spacing:-3px;text-shadow:0 8px 0 rgba(59,15,58,.18)}
h1 .t{display:block;font-size:96px;letter-spacing:0;opacity:.95;margin-bottom:26px}
h1 .hl{color:#ffd23f}
.squig{position:absolute;left:80px;top:705px}
.sub{position:absolute;left:84px;top:750px;font-size:40px;font-weight:600;line-height:1.3;max-width:820px}
.card{position:absolute;left:60px;right:60px;top:880px;background:#fff;border:6px solid #3b0f3a;border-radius:44px;padding:36px 40px;display:grid;grid-template-columns:1fr 1fr;gap:22px 30px;transform:rotate(-1.2deg);box-shadow:0 18px 0 rgba(59,15,58,.25)}
.it{display:flex;align-items:center;gap:18px;color:#3b0f3a;font-weight:800;font-size:38px}
.it span{font-size:62px;line-height:1}
.cta{position:absolute;left:80px;top:1215px;background:#3b0f3a;color:#fff;font-weight:800;font-size:44px;padding:22px 40px;border-radius:999px}
.url{position:absolute;left:84px;top:1325px;font-weight:800;font-size:38px;color:#fff}
.ad{position:absolute;left:84px;top:1385px;font-size:24px;font-weight:600;opacity:.95;max-width:560px;line-height:1.35}
.logo{position:absolute;right:60px;bottom:70px;width:250px;height:250px;filter:drop-shadow(0 10px 16px rgba(59,15,58,.35));transform:rotate(6deg)}
.spark{position:absolute;color:#ffd23f;font-size:60px}
</style></head><body><div class="pin">
<div class="blob" style="width:520px;height:520px;right:-160px;top:-140px"></div>
<div class="blob" style="width:300px;height:300px;left:-120px;top:620px"></div>
<div class="kicker">${p.kicker}</div>
<h1><span class="t">${p.top}</span>${p.big}<br><span class="hl">${p.hl}</span></h1>
<svg class="squig" width="320" height="30"><path d="M4 18 Q 30 0 56 15 T 108 15 T 160 15 T 212 15 T 264 15 T 316 12" fill="none" stroke="#ffd23f" stroke-width="10" stroke-linecap="round"/></svg>
<div class="sub">Real markdowns, checked against their usual price. Updated every day.</div>
<div class="card">${p.items.map(([e, t]) => `<div class="it"><span>${e}</span>${t}</div>`).join('')}</div>
<div class="cta">Tap to see all 50 →</div>
<div class="url">www.ubottega.com${p.path}</div>
<div class="ad">#ad · As an Amazon Associate<br>I earn from qualifying purchases</div>
<span class="spark" style="right:110px;top:120px">✦</span><span class="spark" style="right:250px;top:560px;font-size:40px">✦</span><span class="spark" style="left:860px;top:820px;font-size:34px;color:#fff">✦</span>
<img class="logo" src="data:image/svg+xml;base64,${logo}">
</div></body></html>`;

const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1000, height: 1500 } });
for (const p of PINS) {
  await page.setContent(html(p)); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(outDir, p.file) });
}
await b.close(); console.log('ok');
