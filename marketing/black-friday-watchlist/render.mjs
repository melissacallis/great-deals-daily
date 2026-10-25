// Renders the Black Friday "items to watch" carousel for Instagram, TikTok and Pinterest.
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, outDir, fontDir] = process.argv;

const extra = {
  'Fire TV Stick 4K': ['Streaming', 'parents, dorm rooms'],
  'Kindle Paperwhite': ['Reading', 'anyone who reads in bed'],
  'Echo Dot': ['Smart home', 'a kitchen or bedroom'],
  'Ring Video Doorbell': ['Home', 'anyone who gets lots of packages'],
  'Apple AirPods Pro 2': ['Audio', 'iPhone users'],
  'Sony WH-1000XM5 headphones': ['Audio', 'travelers, work from home'],
  'Robot vacuum (iRobot Roomba or Shark)': ['Cleaning', 'pet owners, busy schedules'],
  'Ninja air fryer': ['Kitchen', 'weeknight cooks'],
  'Instant Pot': ['Kitchen', 'busy families'],
  'LEGO Botanicals flower set': ['Gift for adults', 'plant lovers, LEGO fans'],
};
const seed = JSON.parse(readFileSync(process.argv[4], 'utf8'));
const items = seed.campaign.sections[0].picks.map((p) => ({ name: p.title, why: p.why, tag: extra[p.title][0], gift: extra[p.title][1] }));
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const formats = {
  instagram: { w: 1080, h: 1350, handle: '@datadarling33', pad: [90, 80, 90, 80] },
  tiktok: { w: 1080, h: 1920, handle: '@datadarling', pad: [200, 150, 420, 80] }, // keep clear of TikTok's buttons and caption
  pinterest: { w: 1000, h: 1500, handle: '@datadarling', pad: [80, 70, 80, 70] },
};

const css = (f) => `
@font-face { font-family: Poppins; font-weight: 600; src: url(data:font/ttf;base64,${font('SemiBold')}); }
@font-face { font-family: Poppins; font-weight: 800; src: url(data:font/ttf;base64,${font('ExtraBold')}); }
* { box-sizing: border-box; margin: 0; }
body { width: ${f.w}px; height: ${f.h}px; overflow: hidden; font-family: Inter, sans-serif; color: #3b0f3a; }
.slide { position: relative; width: ${f.w}px; height: ${f.h}px; padding: ${f.pad.map((p) => p + 'px').join(' ')};
  display: flex; flex-direction: column; justify-content: center; gap: 36px;
  background:
    radial-gradient(circle at -5% 35%, rgba(138,111,240,.85), rgba(138,111,240,0) 60%),
    radial-gradient(circle at 60% 5%, rgba(255,176,119,.85), rgba(255,176,119,0) 55%),
    radial-gradient(circle at 35% 85%, rgba(255,195,154,.85), rgba(255,195,154,0) 50%),
    radial-gradient(circle at 92% 60%, rgba(255,140,186,.85), rgba(255,140,186,0) 45%),
    radial-gradient(circle at 105% 105%, rgba(157,176,255,.85), rgba(157,176,255,0) 40%),
    linear-gradient(135deg, #b48cf0, #ffb48c 45%, #f79cc4); }
h1, h2, .num, .badge b { font-family: Poppins, sans-serif; font-weight: 800; letter-spacing: -.02em; }
.eyebrow { font: 800 30px Poppins; letter-spacing: .14em; text-transform: uppercase; color: #fff; }
.white { color: #fff; text-shadow: 0 4px 24px rgba(59,15,58,.25); }
.card { background: #fff; border-radius: 48px; padding: 64px 60px; box-shadow: 0 30px 60px rgba(59,15,58,.18); }
.foot { position: absolute; left: ${f.pad[3]}px; right: ${f.pad[1]}px; bottom: ${Math.min(f.pad[2], 200) - 40}px;
  display: flex; justify-content: space-between; font: 600 28px Poppins; color: #fff; opacity: .95; }
.chip { display: inline-block; padding: 12px 26px; border-radius: 999px; background: #fff0f5; color: #ff3d7f; font: 800 26px Poppins; letter-spacing: .08em; text-transform: uppercase; }
.grad { background: linear-gradient(135deg, #ff3d7f, #ff8a3d); -webkit-background-clip: text; color: transparent; }
.badge { width: 250px; border-radius: 40px; overflow: hidden; background: #fff; text-align: center; box-shadow: 0 24px 50px rgba(59,15,58,.2); }
.badge span { display: block; background: linear-gradient(135deg, #ff3d7f, #ff8a3d); color: #fff; font: 800 34px Poppins; letter-spacing: .12em; padding: 16px 0; }
.badge b { display: block; font-size: 140px; line-height: 1.1; padding: 6px 0 0; }
.badge i { display: block; font: 600 28px Poppins; font-style: normal; padding-bottom: 22px; color: #ff3d7f; }
.list { display: grid; gap: 14px; }
.row { display: flex; align-items: center; gap: 22px; background: #fff; border-radius: 26px; padding: 18px 26px; font: 600 33px Poppins; box-shadow: 0 10px 24px rgba(59,15,58,.12); }
.row .n { font: 800 34px Poppins; width: 56px; }
.steps { display: grid; gap: 30px; }
.step { display: flex; gap: 28px; align-items: flex-start; font-size: 40px; line-height: 1.35; }
.step b { flex: none; width: 76px; height: 76px; border-radius: 50%; background: linear-gradient(135deg, #ff3d7f, #ff8a3d); color: #fff; display: grid; place-items: center; font: 800 38px Poppins; }
`;

const foot = (f, right) => `<div class="foot"><span>${f.handle}</span><span>${right}</span></div>`;

function cover(f) {
  return `<div class="slide">
    <div class="badge"><span>FRIDAY</span><b>27</b><i>NOVEMBER</i></div>
    <div class="eyebrow">Black Friday countdown</div>
    <h1 class="white" style="font-size:${f.w * 0.135}px; line-height:1">10 items<br>to watch</h1>
    <p class="white" style="font: 600 44px/1.35 Poppins; max-width: 860px">Save this so you're ready when the prices actually drop.</p>
    ${foot(f, 'Swipe →')}</div>`;
}

function product(f, it, i) {
  return `<div class="slide">
    <div class="eyebrow">Black Friday watchlist</div>
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 34px">
        <div class="num grad" style="font-size:150px; line-height:1">${String(i + 1).padStart(2, '0')}</div>
        <span class="chip">${esc(it.tag)}</span>
      </div>
      <h2 style="font-size:${it.name.length > 24 ? 62 : 76}px; line-height:1.08; margin-bottom: 30px">${esc(it.name)}</h2>
      <p style="font-size:40px; line-height:1.42; margin-bottom: 34px">${esc(it.why)}</p>
      <p style="font: 600 34px/1.35 Poppins; color:#ff3d7f">Good gift for: ${esc(it.gift)}</p>
    </div>
    <p class="white" style="font: 600 34px Poppins">Check today's price · link in bio</p>
    ${foot(f, `#ad · ${i + 1} / 10`)}</div>`;
}

function howTo(f) {
  return `<div class="slide">
    <div class="eyebrow">How I'm using this list</div>
    <div class="card steps">
      <div class="step"><b>1</b><span>I check each price against its usual price, not the "was" price on the tag.</span></div>
      <div class="step"><b>2</b><span>Only real markdowns get posted. No fake sales.</span></div>
      <div class="step"><b>3</b><span>Deals can end anytime, so always check today's price before you buy.</span></div>
    </div>
    ${foot(f, '#ad')}</div>`;
}

function cta(f) {
  return `<div class="slide">
    <div class="eyebrow">Want the links?</div>
    <h1 class="white" style="font-size:${f.w * 0.1}px; line-height:1.05">Tap the link<br>in my bio</h1>
    <div class="card" style="font-size:40px; line-height:1.45">
      <p style="font: 800 44px Poppins; margin-bottom: 18px">Black Friday Watchlist</p>
      <p>All 10 picks, with today's price on Amazon.</p>
      <p style="margin-top: 22px">Follow ${f.handle} so you see the real deals first.</p>
    </div>
    <p class="white" style="font: 600 30px/1.4 Poppins">#ad · As an Amazon Associate I earn from qualifying purchases.</p>
    ${foot(f, 'Save this for Nov 27')}</div>`;
}

function listPin(f) {
  return `<div class="slide" style="gap: 26px">
    <div style="display:flex; gap: 34px; align-items:center">
      <div class="badge" style="width: 190px"><span style="font-size:26px">FRIDAY</span><b style="font-size:100px">27</b><i style="font-size:22px">NOVEMBER</i></div>
      <div><div class="eyebrow" style="font-size:26px">Black Friday 2026</div>
      <h1 class="white" style="font-size:84px; line-height:1">10 deals<br>to watch</h1></div>
    </div>
    <div class="list">${items.map((it, i) => `<div class="row"><span class="n grad">${String(i + 1).padStart(2, '0')}</span>${esc(it.name.replace(' (iRobot Roomba or Shark)', '').replace(' headphones', ''))}</div>`).join('')}</div>
    <p class="white" style="font: 600 30px Poppins">Tap for the full list · check today's prices · #ad</p></div>`;
}

const browser = await chromium.launch();
for (const [name, f] of Object.entries(formats)) {
  const dir = path.join(outDir, name); mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: f.w, height: f.h } });
  const slides = name === 'pinterest'
    ? [['1-list-pin', listPin(f)], ['2-cover-pin', cover(f)]]
    : [['01-cover', cover(f)], ...items.map((it, i) => [`${String(i + 2).padStart(2, '0')}-${it.name.split(' ')[0].toLowerCase()}`, product(f, it, i)]), ['12-how-i-use-it', howTo(f)], ['13-link-in-bio', cta(f)]];
  for (const [file, html] of slides) {
    await page.setContent(`<style>${css(f)}</style>${html}`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(dir, `${file}.jpg`), type: 'jpeg', quality: 92 });
  }
  await page.close();
}
await browser.close();
