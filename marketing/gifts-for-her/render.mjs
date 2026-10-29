// "6 gifts for her she'll actually use": carousel (Instagram 1080x1350), TikTok photo mode (1080x1920),
// a Pinterest list pin (1000x1500) and a story poll (1080x1920). Doodle stickers, no product photos or prices.
// node render.mjs <outDir> <fontDir> <headshot>
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, outDir, fontDir, headshot] = process.argv;
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
const face = `data:image/png;base64,${readFileSync(headshot).toString('base64')}`;

const gifts = [
  { label: 'Heated throw blanket', tag: 'always cold?', colour: '#ffd0e0', why: 'For the one who’s always cold. Look for <b>auto shut-off</b> and a machine-washable cover.', skip: 'she runs hot',
    icon: '<rect x="-52" y="-30" width="104" height="22" rx="10"/><rect x="-52" y="-6" width="104" height="22" rx="10"/><rect x="-52" y="18" width="104" height="22" rx="10"/><path d="M52,30 Q70,30 66,48 Q62,62 46,58"/>' },
  { label: 'Insulated tumbler', tag: 'used daily', colour: '#c9f0e4', why: 'Keeps coffee hot through the commute and water cold all day. <b>Check it fits her cup holder.</b>', skip: 'she already has three',
    icon: '<path d="M-30,-40 L30,-40 L22,52 L-22,52 Z"/><path d="M-34,-40 L34,-40 M30,-20 Q56,-20 54,4 Q52,22 26,20"/><path d="M8,-40 L16,-62"/>' },
  { label: 'Satin pillowcases', tag: 'small luxury', colour: '#e3d4ff', why: 'Gentler on hair and skin, and feels fancier than it costs. <b>Get a 2-pack.</b>', skip: 'she prefers cotton',
    icon: '<rect x="-56" y="-32" width="112" height="64" rx="26"/><path d="M-30,-10 Q-10,-22 10,-10 M-20,10 Q0,-2 24,10"/>' },
  { label: 'Kindle Paperwhite', tag: 'on my watchlist', colour: '#ffe08a', why: 'For the reader: glare-free, weeks of battery, waterproof. <b>Check the price history before Black Friday.</b>', skip: 'she only reads paper books',
    icon: '<rect x="-36" y="-50" width="72" height="100" rx="10"/><rect x="-26" y="-38" width="52" height="66" rx="4"/><path d="M-18,-24 L18,-24 M-18,-12 L18,-12 M-18,0 L10,0 M-18,12 L18,12"/>' },
  { label: 'Portable phone charger', tag: 'used weekly', colour: '#ffcfae', why: 'The gift she’ll use every week. <b>Make sure the cable fits her phone.</b>', skip: 'she’s never away from an outlet',
    icon: '<rect x="-30" y="-48" width="60" height="96" rx="12"/><path d="M6,-26 L-12,4 L2,4 L-6,28 L14,-4 L0,-4 Z"/>' },
  { label: 'Memory foam slippers', tag: 'cozy pick', colour: '#ffd0e0', why: 'Everyday comfort. <b>Pick a hard sole</b> so she can step outside to grab a package.', skip: 'she lives in socks',
    icon: '<path d="M-50,10 Q-52,-24 -20,-26 L20,-26 Q50,-24 54,6 Q56,30 30,32 L-30,32 Q-50,30 -50,10 Z"/><path d="M-20,-26 Q-4,-2 20,-26"/>' },
];
const sticker = (g, size, i) => `<svg width="${size}" height="${size}" viewBox="-110 -110 220 220"><defs><filter id="b${i}"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${i + 2}"/><feDisplacementMap in="SourceGraphic" scale="6"/></filter></defs>
  <g filter="url(#b${i})"><circle r="92" fill="${g.colour}" stroke="#3b0f3a" stroke-width="7"/><g fill="none" stroke="#3b0f3a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${g.icon}</g></g></svg>`;

const formats = {
  instagram: { w: 1080, h: 1350, handle: '@datadarling33', pad: [90, 80, 90, 80] },
  tiktok: { w: 1080, h: 1920, handle: '@datadarling', pad: [230, 230, 480, 80] },
};
// top half of a split-screen video (animation frames only)
const splitFormats = {
  'split-tiktok': { w: 1080, h: 1120, handle: '@datadarling', pad: [150, 170, 70, 70] },
  'split-reel': { w: 1080, h: 1120, handle: '@datadarling33', pad: [150, 170, 70, 70] },
};
const css = (f) => `
@font-face { font-family: P; font-weight: 600; src: url(data:font/ttf;base64,${font('SemiBold')}); }
@font-face { font-family: P; font-weight: 800; src: url(data:font/ttf;base64,${font('ExtraBold')}); }
* { box-sizing: border-box; margin: 0; }
body { width: ${f.w}px; height: ${f.h}px; overflow: hidden; font-family: Inter, sans-serif; color: #3b0f3a; }
.slide { position: relative; width: ${f.w}px; height: ${f.h}px; padding: ${f.pad.map((p) => p + 'px').join(' ')}; display: flex; flex-direction: column; justify-content: center; gap: 32px;
  background: radial-gradient(circle at -5% 35%, rgba(138,111,240,.85), rgba(138,111,240,0) 60%), radial-gradient(circle at 60% 5%, rgba(255,176,119,.85), rgba(255,176,119,0) 55%),
    radial-gradient(circle at 35% 85%, rgba(255,195,154,.85), rgba(255,195,154,0) 50%), radial-gradient(circle at 92% 60%, rgba(255,140,186,.85), rgba(255,140,186,0) 45%),
    radial-gradient(circle at 105% 105%, rgba(157,176,255,.85), rgba(157,176,255,0) 40%), linear-gradient(135deg, #b48cf0, #ffb48c 45%, #f79cc4); }
.eyebrow { font: 800 30px P; letter-spacing: .14em; text-transform: uppercase; color: #fff; }
h1, h2 { font-family: P; font-weight: 800; letter-spacing: -.02em; color: #fff; text-shadow: 0 4px 24px rgba(59,15,58,.25); }
h1 { font-size: ${f.h < 1300 ? 96 : 112}px; line-height: 1; } h2 { font-size: ${f.h < 1300 ? 74 : 84}px; line-height: 1.04; }
${f.h < 1300 ? '.foot { display: none !important; }' : ''}
.card { background: #fff; border-radius: 44px; padding: 46px 52px; box-shadow: 0 30px 60px rgba(59,15,58,.18); font-size: 39px; line-height: 1.42; }
.card b { font-family: P; font-weight: 800; }
.tag { display: inline-block; align-self: flex-start; background: #ff3d7f; color: #fff; font: 800 30px P; padding: 10px 28px; border-radius: 16px; border: 5px solid #3b0f3a; transform: rotate(-3deg); }
.skip { margin-top: 18px; font: 600 32px P; color: #ff3d7f; }
.row { display: flex; flex-wrap: wrap; gap: 4px; }
.foot { position: absolute; left: ${f.pad[3]}px; right: ${f.pad[1]}px; bottom: ${Math.min(f.pad[2], 200) - 40}px; display: flex; justify-content: space-between; font: 600 28px P; color: #fff; }
.me { display: flex; align-items: center; gap: 24px; } .me img { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 7px solid #fff; } .me div { font: 800 36px P; color: #fff; }
.steps { display: grid; gap: 24px; } .step { display: flex; gap: 24px; align-items: flex-start; }
.step i { flex: none; width: 66px; height: 66px; border-radius: 50%; background: linear-gradient(135deg, #ff3d7f, #ff8a3d); color: #fff; display: grid; place-items: center; font: 800 32px P; font-style: normal; }`;
const foot = (f, r) => `<div class="foot"><span>${f.handle} · #ad</span><span>${r}</span></div>`;
const slides = (f) => [
  ['01-cover', `<div class="slide"><div class="me"><img src="${face}"><div>Gift guide · for her</div></div>
    <div class="row">${gifts.map((g, i) => sticker(g, f.h < 1300 ? 124 : 150, i)).join('')}</div>
    <h1>6 gifts she’ll <span data-dd="underline" data-dd-colour="#ffd23f">actually use</span></h1><p class="card" style="font-size:36px">No junk drawer gifts. Each one has a <b>“skip it if…”</b> so you buy the right one.</p>${foot(f, 'Swipe →')}</div>`],
  ...gifts.map((g, i) => [`${String(i + 2).padStart(2, '0')}-gift`, `<div class="slide"><div class="eyebrow">Gift ${i + 1} of 6 · for her</div>
    <div data-dd="sparkles" data-dd-colour="#ffd23f" style="align-self:flex-start">${sticker(g, f.h < 1300 ? 200 : 260, i)}</div><h2>${g.label}</h2><span class="tag">${g.tag}</span>
    <div class="card">${g.why.replace('<b>', '<b data-dd="underline" data-dd-colour="#ff3d7f">')}<div class="skip">Skip it if ${g.skip}.</div></div>${foot(f, `${i + 1} / 6`)}</div>`]),
  ['08-tips', `<div class="slide"><div class="eyebrow">Before you buy</div><h2>How to pick a gift she’ll use</h2>
    <div class="card steps"><div class="step"><i>1</i><span>Think about her <b>daily routine</b>, not a “wow” moment.</span></div>
    <div class="step"><i>2</i><span>Read the <b data-dd="underline" data-dd-colour="#ff3d7f">1-star reviews</b>. They tell you what breaks.</span></div>
    <div class="step"><i>3</i><span>Check the <b>price history</b> before Black Friday.</span></div></div>${foot(f, 'Save this')}</div>`],
  ['09-cta', `<div class="slide"><div class="me"><img src="${face}"><div>Who’s hard to shop for?</div></div>
    <h2>Tell me who, and I’ll find 3 ideas.</h2><div class="card" data-dd="hearts" data-dd-colour="#ff3d7f"><b>All 6 are in my Holiday Gift Guide.</b><br>Tap the link in my bio, and check today’s price.</div>
    <p style="font: 600 30px P; color:#fff">#ad · As an Amazon Associate I earn from qualifying purchases.</p>${foot(f, '')}</div>`],
];
const pinCss = css({ w: 1000, h: 1500, handle: '@datadarling', pad: [80, 70, 80, 70] });
const pin = `<div class="slide" style="gap:22px"><div class="eyebrow" style="font-size:26px">Holiday gift guide 2026</div>
  <h1 style="font-size:100px">Gifts for her she’ll actually use</h1>
  <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px">${gifts.map((g, i) => `<div style="background:#fff; border-radius:28px; padding:14px 18px; display:flex; align-items:center; gap:12px; box-shadow:0 10px 24px rgba(59,15,58,.12)">${sticker(g, 150, i)}<b style="font: 800 32px/1.15 P">${g.label}</b></div>`).join('')}</div>
  <p style="font: 600 30px P; color:#fff">Honest picks + “skip it if…” · tap for the list · #ad</p></div>`;
const story = (f) => `<div class="slide" style="justify-content:flex-start; padding-top:300px"><div class="me"><img src="${face}"><div>Quick question!</div></div>
  <h1 style="font-size:104px">Black Friday or Cyber Monday?</h1>
  <p style="font: 600 40px/1.35 P; color:#fff">Which day do you actually shop? Tap the poll below.</p>
  <div style="height:420px; border:6px dashed rgba(255,255,255,.8); border-radius:44px; display:grid; place-items:center; font: 600 32px P; color:#fff">Put the Instagram poll sticker here</div></div>`;

mkdirSync(outDir, { recursive: true });
const doodleJs = readFileSync(new URL('../deal-check/doodles.js', import.meta.url), 'utf8');
if (process.env.ANIM) {
  const browser = await chromium.launch();
  for (const [name, f] of Object.entries(splitFormats)) {
    const page = await browser.newPage({ viewport: { width: f.w, height: f.h } });
    for (const [i, [, html]] of slides(f).entries()) {
      const dir = path.join(outDir, 'anim', name, String(i)); mkdirSync(dir, { recursive: true });
      await page.setContent(`<style>${css(f)}</style>${html}`); await page.evaluate(() => document.fonts.ready);
      await page.addScriptTag({ content: doodleJs });
      for (let k = 0; k < 14; k++) {
        await page.evaluate(([t, p]) => { window.enter(1); window.drawDoodles(1, p); window.enter(t); }, [Math.min(1, k / 8), Math.max(0, (k - 6) / 8)]);
        await page.screenshot({ path: path.join(dir, `in-${String(k).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 88 });
      }
      for (let b = 1; b <= 3; b++) {
        await page.evaluate((seed) => { window.enter(1); window.drawDoodles(seed, 1); }, b);
        await page.screenshot({ path: path.join(dir, `boil-${b}.jpg`), type: 'jpeg', quality: 88 });
      }
    }
    await page.close();
  }
  await browser.close();
  process.exit(0);
}
const browser = await chromium.launch();
for (const [name, f] of Object.entries(formats)) {
  const dir = path.join(outDir, name); mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: f.w, height: f.h } });
  for (const [file, html] of slides(f)) {
    await page.setContent(`<style>${css(f)}</style>${html}`); await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(dir, `${file}.jpg`), type: 'jpeg', quality: 92 });
  }
  if (name === 'tiktok') {
    await page.setContent(`<style>${css(f)}</style>${story(f)}`); await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(outDir, 'story-poll.jpg'), type: 'jpeg', quality: 92 });
  }
  await page.close();
}
const p = await browser.newPage({ viewport: { width: 1000, height: 1500 } });
await p.setContent(`<style>${pinCss}</style>${pin}`); await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: path.join(outDir, 'pinterest-pin.jpg'), type: 'jpeg', quality: 92 });
await browser.close();
