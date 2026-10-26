// Renders the "Why I started Great Deals Daily" intro carousel for Instagram, TikTok and Pinterest.
// node render.mjs <outDir> <fontDir> <headshot>
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, outDir, fontDir, headshot] = process.argv;
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
const face = `data:image/png;base64,${readFileSync(headshot).toString('base64')}`;

const formats = {
  instagram: { w: 1080, h: 1350, handle: '@datadarling33', pad: [90, 80, 90, 80] },
  tiktok: { w: 1080, h: 1920, handle: '@datadarling', pad: [230, 230, 480, 80] }, // TikTok safe zone
  pinterest: { w: 1000, h: 1500, handle: '@datadarling', pad: [80, 70, 80, 70] },
};

const css = (f) => `
@font-face { font-family: P; font-weight: 600; src: url(data:font/ttf;base64,${font('SemiBold')}); }
@font-face { font-family: P; font-weight: 800; src: url(data:font/ttf;base64,${font('ExtraBold')}); }
* { box-sizing: border-box; margin: 0; }
body { width: ${f.w}px; height: ${f.h}px; overflow: hidden; font-family: Inter, sans-serif; color: #3b0f3a; }
.slide { position: relative; width: ${f.w}px; height: ${f.h}px; padding: ${f.pad.map((p) => p + 'px').join(' ')};
  display: flex; flex-direction: column; justify-content: center; gap: 40px;
  background:
    radial-gradient(circle at -5% 35%, rgba(138,111,240,.85), rgba(138,111,240,0) 60%),
    radial-gradient(circle at 60% 5%, rgba(255,176,119,.85), rgba(255,176,119,0) 55%),
    radial-gradient(circle at 35% 85%, rgba(255,195,154,.85), rgba(255,195,154,0) 50%),
    radial-gradient(circle at 92% 60%, rgba(255,140,186,.85), rgba(255,140,186,0) 45%),
    radial-gradient(circle at 105% 105%, rgba(157,176,255,.85), rgba(157,176,255,0) 40%),
    linear-gradient(135deg, #b48cf0, #ffb48c 45%, #f79cc4); }
.eyebrow { font: 800 30px P; letter-spacing: .14em; text-transform: uppercase; color: #fff; }
h1, h2 { font-family: P; font-weight: 800; letter-spacing: -.02em; color: #fff; text-shadow: 0 4px 24px rgba(59,15,58,.25); }
h1 { font-size: ${Math.round(f.w * 0.115)}px; line-height: 1.02; }
h2 { font-size: ${Math.round(f.w * 0.085)}px; line-height: 1.05; }
.lead { font: 600 44px/1.35 P; color: #fff; text-shadow: 0 3px 16px rgba(59,15,58,.25); }
.card { background: #fff; border-radius: 48px; padding: 56px 56px; box-shadow: 0 30px 60px rgba(59,15,58,.18); font-size: 40px; line-height: 1.42; }
.card b { font-family: P; font-weight: 800; }
.grad { background: linear-gradient(135deg, #ff3d7f, #ff8a3d); -webkit-background-clip: text; color: transparent; }
.strike { position: relative; display: inline-block; }
.strike::after { content: ''; position: absolute; left: -6px; right: -6px; top: 52%; height: 10px; border-radius: 6px; background: #ff3d7f; transform: rotate(-4deg); }
.me { display: flex; align-items: center; gap: 28px; }
.me img { width: 150px; height: 150px; border-radius: 50%; object-fit: cover; border: 7px solid #fff; box-shadow: 0 16px 36px rgba(59,15,58,.25); }
.me .n { font: 800 40px P; color: #fff; } .me .h { font: 600 30px P; color: #fff; opacity: .95; }
.steps { display: grid; gap: 30px; }
.step { display: flex; gap: 28px; align-items: flex-start; }
.step i { flex: none; width: 76px; height: 76px; border-radius: 50%; background: linear-gradient(135deg, #ff3d7f, #ff8a3d); color: #fff; display: grid; place-items: center; font: 800 38px P; font-style: normal; }
.foot { position: absolute; left: ${f.pad[3]}px; right: ${f.pad[1]}px; bottom: ${Math.min(f.pad[2], 200) - 40}px;
  display: flex; justify-content: space-between; font: 600 28px P; color: #fff; }
`;
const foot = (f, right) => `<div class="foot"><span>${f.handle}</span><span>${right}</span></div>`;
const me = (f) => `<div class="me"><img src="${face}"><div><div class="n">Hi, I'm Data Darling</div><div class="h">${f.handle} · Great Deals Daily</div></div></div>`;

const slides = {
  cover: (f) => `<div class="slide">${me(f)}
    <h1>A lot of Amazon "sales" aren't <span class="grad" style="text-shadow:none">real deals.</span></h1>
    <p class="lead">So I started checking them for you. Here's how it works →</p>${foot(f, f.w === 1000 ? 'Tap to see how →' : 'Swipe →')}</div>`,
  problem: (f) => `<div class="slide"><div class="eyebrow">The problem</div>
    <h2>A crossed-out price isn't proof.</h2>
    <div class="card">Lots of "deals" are the <b>normal price</b> with a bigger number crossed out next to it.<br><br>The badge says <b class="grad">-60%</b>. The price never moved.</div>${foot(f, '1 / 5')}</div>`,
  check: (f) => `<div class="slide"><div class="eyebrow">What I do</div>
    <h2>I check every price first.</h2>
    <div class="card steps">
      <div class="step"><i>1</i><span>Compare it to its <b>usual price</b>, not the "list price".</span></div>
      <div class="step"><i>2</i><span>Look at the <b>price history</b>. Flat for months? Skip.</span></div>
      <div class="step"><i>3</i><span>Only real markdowns make my list.</span></div>
    </div>${foot(f, '2 / 5')}</div>`,
  fewer: (f) => `<div class="slide"><div class="eyebrow">What you get</div>
    <h2>Fewer picks.<br>Each with a reason.</h2>
    <div class="card">No lists of 100 "Amazon finds". Every pick says <b>who it's for</b>, and when to <b>skip it</b>.<br><br>Plus gift guides for her, him, kids and everyone in between.</div>${foot(f, '3 / 5')}</div>`,
  paid: (f) => `<div class="slide"><div class="eyebrow">Honestly</div>
    <h2>How I get paid</h2>
    <div class="card">When you buy through my links, Amazon pays me a <b>small commission</b>. It costs you <b>nothing extra</b>.<br><br>That's why every post says <b class="grad">#ad</b>. I'd rather tell you than hide it.</div>${foot(f, '4 / 5')}</div>`,
  cta: (f) => `<div class="slide">${me(f)}
    <h2>Follow for deals that are actually worth it.</h2>
    <div class="card"><b>Black Friday is Fri, Nov 27.</b><br>My watchlist is up now: tap the link in my bio.</div>
    <p class="lead" style="font-size:30px">#ad · As an Amazon Associate I earn from qualifying purchases.</p>${foot(f, '5 / 5')}</div>`,
};

const browser = await chromium.launch();
for (const [name, f] of Object.entries(formats)) {
  const dir = path.join(outDir, name); mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: f.w, height: f.h } });
  const list = name === 'pinterest' ? [['1-pin', slides.cover]] : Object.entries(slides).map(([k, fn], i) => [`${i + 1}-${k}`, fn]);
  for (const [file, fn] of list) {
    await page.setContent(`<style>${css(f)}</style>${fn(f)}`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(dir, `${file}.jpg`), type: 'jpeg', quality: 92 });
  }
  await page.close();
}
await browser.close();
