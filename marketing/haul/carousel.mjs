// Instagram carousel (1080x1350) for the Amazon Haul finds, drawn with the doodle stickers.
// node carousel.mjs <outDir> <fontDir> <headshot>
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { icons, items, notes } from './icons.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, outDir, fontDir, headshot] = process.argv;
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
const face = `data:image/png;base64,${readFileSync(headshot).toString('base64')}`;
mkdirSync(outDir, { recursive: true });
const W = 1080, H = 1350;
const sticker = (it, size) => `<svg width="${size}" height="${size}" viewBox="-110 -110 220 220"><defs><filter id="b${it.key}"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="2"/><feDisplacementMap in="SourceGraphic" scale="6"/></filter></defs>
  <g filter="url(#b${it.key})"><circle r="92" fill="${it.colour}" stroke="#3b0f3a" stroke-width="7"/><g fill="none" stroke="#3b0f3a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${icons[it.key]}</g></g></svg>`;
const css = `
@font-face { font-family: P; font-weight: 600; src: url(data:font/ttf;base64,${font('SemiBold')}); }
@font-face { font-family: P; font-weight: 800; src: url(data:font/ttf;base64,${font('ExtraBold')}); }
* { box-sizing: border-box; margin: 0; }
body { width: ${W}px; height: ${H}px; overflow: hidden; font-family: Inter, sans-serif; color: #3b0f3a; }
.slide { position: relative; width: ${W}px; height: ${H}px; padding: 90px 80px; display: flex; flex-direction: column; justify-content: center; gap: 34px;
  background: radial-gradient(circle at -5% 35%, rgba(138,111,240,.85), rgba(138,111,240,0) 60%), radial-gradient(circle at 60% 5%, rgba(255,176,119,.85), rgba(255,176,119,0) 55%),
    radial-gradient(circle at 35% 85%, rgba(255,195,154,.85), rgba(255,195,154,0) 50%), radial-gradient(circle at 92% 60%, rgba(255,140,186,.85), rgba(255,140,186,0) 45%),
    radial-gradient(circle at 105% 105%, rgba(157,176,255,.85), rgba(157,176,255,0) 40%), linear-gradient(135deg, #b48cf0, #ffb48c 45%, #f79cc4); }
.eyebrow { font: 800 30px P; letter-spacing: .14em; text-transform: uppercase; color: #fff; }
h1, h2 { font-family: P; font-weight: 800; letter-spacing: -.02em; color: #fff; text-shadow: 0 4px 24px rgba(59,15,58,.25); }
h1 { font-size: 120px; line-height: 1; } h2 { font-size: 92px; line-height: 1.02; }
.card { background: #fff; border-radius: 44px; padding: 50px 54px; box-shadow: 0 30px 60px rgba(59,15,58,.18); font-size: 40px; line-height: 1.42; }
.card b { font-family: P; font-weight: 800; }
.tag { display: inline-block; align-self: flex-start; background: #ff3d7f; color: #fff; font: 800 32px P; padding: 12px 30px; border-radius: 16px; border: 5px solid #3b0f3a; transform: rotate(-3deg); }
.row { display: flex; flex-wrap: wrap; gap: 6px; }
.foot { position: absolute; left: 80px; right: 80px; bottom: 50px; display: flex; justify-content: space-between; font: 600 28px P; color: #fff; }
.me { display: flex; align-items: center; gap: 26px; } .me img { width: 130px; height: 130px; border-radius: 50%; object-fit: cover; border: 7px solid #fff; }
.me div { font: 800 38px P; color: #fff; }`;
const foot = (r) => `<div class="foot"><span>@datadarling33 · #ad</span><span>${r}</span></div>`;
const slides = [
  ['1-cover', `<div class="slide"><div class="me"><img src="${face}"><div>Amazon Haul finds</div></div>
    <div class="row">${items.map((it) => sticker(it, 170)).join('')}</div>
    <h1>Keep or skip?</h1><p class="card" style="font-size:38px">5 small finds from <b>Amazon's budget store</b>, with an honest note for each.</p>${foot('Swipe →')}</div>`],
  ...items.map((it, i) => [`${i + 2}-${it.key}`, `<div class="slide"><div class="eyebrow">Haul find ${i + 1} of ${items.length}</div>
    ${sticker(it, 300)}<h2>${it.label}</h2><span class="tag">${it.tag}</span>
    <div class="card">${notes[it.key]}</div>${foot(`${i + 1} / ${items.length}`)}</div>`]),
  ['7-tips', `<div class="slide"><div class="eyebrow">Before you order from Haul</div><h2>3 quick checks</h2>
    <div class="card"><b>1.</b> Pick <b>4+ stars</b> with lots of reviews.<br><b>2.</b> Read the <b>photo reviews</b>: they show the real size.<br><b>3.</b> Order early: Haul usually <b>ships slower</b> than Prime.</div>${foot('Save this')}</div>`],
  ['8-cta', `<div class="slide"><div class="me"><img src="${face}"><div>Which would you keep?</div></div>
    <h2>Tell me in the comments.</h2><div class="card"><b>All 5 are in my Haul finds list.</b><br>Tap the link in my bio, and check today's price.</div>
    <p style="font: 600 30px P; color:#fff">#ad · As an Amazon Associate I earn from qualifying purchases.</p>${foot('')}</div>`],
];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
for (const [name, html] of slides) {
  await page.setContent(`<style>${css}</style>${html}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(outDir, `${name}.jpg`), type: 'jpeg', quality: 92 });
}
await browser.close();
