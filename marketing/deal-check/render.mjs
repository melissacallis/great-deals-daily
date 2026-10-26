// "Is this deal real?" episode slides for Instagram (1080x1350), TikTok (1080x1920) and a Pinterest pin.
// node render.mjs <episode.json> <outDir> <fontDir> <headshot>
// The price chart is redrawn from the owner's notes (no Amazon screenshots, no dollar amounts).
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, epFile, outDir, fontDir, headshot] = process.argv;
const ep = JSON.parse(readFileSync(epFile, 'utf8'));
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
const face = `data:image/png;base64,${readFileSync(headshot).toString('base64')}`;
const shotDir = path.join(path.dirname(epFile), 'shots');
const shot = (name, maxH) => ep.shots?.[name] ? `<img src="data:image/png;base64,${readFileSync(path.join(shotDir, ep.shots[name])).toString('base64')}" style="display:block; width:100%; max-height:${maxH}px; object-fit:contain; border-radius:18px; border:2px solid #f1e4ee; margin-bottom:28px">` : '';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const formats = {
  instagram: { w: 1080, h: 1350, handle: '@datadarling33', pad: [90, 80, 90, 80] },
  tiktok: { w: 1080, h: 1920, handle: '@datadarling', pad: [230, 230, 480, 80] },
  reel: { w: 1080, h: 1920, handle: '@datadarling33', pad: [230, 230, 480, 80] }, // Instagram Reel frames
  pinterest: { w: 1000, h: 1500, handle: '@datadarling', pad: [80, 70, 80, 70] },
};

const css = (f) => `
@font-face { font-family: P; font-weight: 600; src: url(data:font/ttf;base64,${font('SemiBold')}); }
@font-face { font-family: P; font-weight: 800; src: url(data:font/ttf;base64,${font('ExtraBold')}); }
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
.eyebrow { font: 800 30px P; letter-spacing: .14em; text-transform: uppercase; color: #fff; }
h1, h2 { font-family: P; font-weight: 800; letter-spacing: -.02em; color: #fff; text-shadow: 0 4px 24px rgba(59,15,58,.25); }
h1 { font-size: ${Math.round(f.w * 0.12)}px; line-height: 1; }
h2 { font-size: ${Math.round(f.w * 0.08)}px; line-height: 1.06; }
.lead { font: 600 42px/1.35 P; color: #fff; text-shadow: 0 3px 16px rgba(59,15,58,.25); }
.card { background: #fff; border-radius: 44px; padding: 52px 54px; box-shadow: 0 30px 60px rgba(59,15,58,.18); font-size: 39px; line-height: 1.42; }
.card b { font-family: P; font-weight: 800; }
.grad { background: linear-gradient(135deg, #ff3d7f, #ff8a3d); -webkit-background-clip: text; color: transparent; text-shadow: none; }
.badge { display: inline-block; align-self: flex-start; background: #fff; border-radius: 36px; padding: 18px 40px 22px; box-shadow: 0 24px 50px rgba(59,15,58,.2); }
.badge small { display: block; font: 800 26px P; letter-spacing: .1em; color: #ff3d7f; text-transform: uppercase; }
.badge b { display: block; font: 800 150px/1 P; letter-spacing: -.03em; }
.pill { display: inline-block; padding: 10px 24px; border-radius: 999px; font: 800 26px P; letter-spacing: .08em; text-transform: uppercase; }
.me { display: flex; align-items: center; gap: 26px; }
.me img { width: 130px; height: 130px; border-radius: 50%; object-fit: cover; border: 7px solid #fff; box-shadow: 0 16px 36px rgba(59,15,58,.25); }
.me .n { font: 800 38px P; color: #fff; } .me .h { font: 600 28px P; color: #fff; }
.steps { display: grid; gap: 26px; }
.step { display: flex; gap: 26px; align-items: flex-start; }
.step i { flex: none; width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, #ff3d7f, #ff8a3d); color: #fff; display: grid; place-items: center; font: 800 34px P; font-style: normal; }
.check { flex: none; width: 70px; height: 70px; border-radius: 50%; display: grid; place-items: center; color: #fff; font: 800 40px P; }
.foot { position: absolute; left: ${f.pad[3]}px; right: ${f.pad[1]}px; bottom: ${Math.min(f.pad[2], 200) - 40}px;
  display: flex; justify-content: space-between; font: 600 28px P; color: #fff; }
`;
const foot = (f, right) => `<div class="foot"><span>${f.handle} · #ad</span><span>${right}</span></div>`;
const me = (f) => `<div class="me"><img src="${face}"><div><div class="n">Is this deal real?</div><div class="h">Episode ${ep.episode} · ${f.handle}</div></div></div>`;

// Price line chart in brand colours. Points are [day, level] with level 1 = full price, 0 = sale price.
function chart(f) {
  const W = f.w - f.pad[1] - f.pad[3] - 108, H = Math.round(W * 0.52), x0 = 10, x1 = W - 40, yTop = 70, yBot = H - 140;
  const X = (d) => x0 + (d / ep.chart.days) * (x1 - x0), Y = (l) => yBot - l * (yBot - yTop);
  const pts = ep.chart.points; let d = `M${X(pts[0][0])},${Y(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) d += ` H${X(pts[i][0])} V${Y(pts[i][1])}`;
  d += ` H${X(ep.chart.days)}`;
  const last = pts[pts.length - 1];
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">
    <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#ff3d7f"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient></defs>
    <line x1="${x0}" x2="${x1}" y1="${Y(1)}" y2="${Y(1)}" stroke="#eadbe6" stroke-width="3" stroke-dasharray="10 10"/>
    <line x1="${x0}" x2="${x1}" y1="${Y(0)}" y2="${Y(0)}" stroke="#eadbe6" stroke-width="3" stroke-dasharray="10 10"/>
    <text x="${x0}" y="${Y(1) - 18}" font-family="P" font-weight="800" font-size="26" fill="#9a7a95">FULL PRICE</text>
    <text x="${x0}" y="${Y(0) + 44}" font-family="P" font-weight="800" font-size="26" fill="#9a7a95">SALE PRICE</text>
    <path d="${d}" fill="none" stroke="url(#g)" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${X(ep.chart.days)}" cy="${Y(ep.chart.today)}" r="20" fill="#fff" stroke="#ff3d7f" stroke-width="10"/>
    <text x="${X(ep.chart.days)}" y="${Y(ep.chart.today) + 64}" text-anchor="end" font-family="P" font-weight="800" font-size="28" fill="#ff3d7f">TODAY: LOWEST</text>
    <text x="${x0}" y="${H - 2}" font-family="P" font-weight="600" font-size="24" fill="#9a7a95">${esc(ep.chart.from)}</text>
    <text x="${x1}" y="${H - 2}" text-anchor="end" font-family="P" font-weight="600" font-size="24" fill="#9a7a95">${esc(ep.chart.to)}</text>
  </svg>`;
}

const verdictColour = { real: '#1fa971', decent: '#f0a020', skip: '#e0344f' }[ep.verdict.kind];
const slides = {
  hook: (f) => `<div class="slide">${me(f)}
    <div class="badge"><small>${esc(ep.badgeLabel)}</small><b class="grad">-${esc(ep.discount)}</b></div>
    <h1>Is this deal actually real?</h1>
    <p class="lead">${esc(ep.product)}. Let's check →</p>${foot(f, 'Swipe →')}</div>`,
  compared: (f) => `<div class="slide"><div class="eyebrow">Step 1 · Compared to what?</div>
    <h2>${esc(ep.discount)} off the "List Price"</h2>
    <div class="card">${shot('deal', 320)}A "List Price" can be a price <b>nobody actually pays</b>.<br><br>So I tapped <b class="grad">Price history</b>, right next to the price, to see what it really sold for.</div>${foot(f, '1 / 6')}</div>`,
  history: (f) => `<div class="slide"><div class="eyebrow">Step 2 · The last ${ep.chart.days} days</div>
    <h2>${esc(ep.historyTitle)}</h2>
    <div class="card" style="padding:44px 54px">${ep.shots?.history ? shot('history', f.h > 1600 ? 760 : 560).replace('margin-bottom:28px', 'margin:0') : chart(f)}</div>
    <p class="lead" style="font-size:32px">${esc(ep.historyNote)}</p>${foot(f, '2 / 6')}</div>`,
  catch: (f) => `<div class="slide"><div class="eyebrow">Step 3 · The catch</div>
    <h2>${esc(ep.catchTitle)}</h2>
    <div class="card">${ep.catchBody}</div>${foot(f, '3 / 6')}</div>`,
  skip: (f) => `<div class="slide"><div class="eyebrow">Skip it if…</div>
    <h2>${esc(ep.skipTitle)}</h2>
    <div class="card">${shot('reviews', f.h > 1600 ? 520 : 400)}${ep.skipBody}</div>${foot(f, '4 / 6')}</div>`,
  verdict: (f) => `<div class="slide"><div class="eyebrow">The verdict</div>
    <span class="pill" style="align-self:flex-start; background:#fff; color:${verdictColour}; font-size:40px; padding:16px 34px">${esc(ep.verdict.label)}</span>
    <h2>${esc(ep.verdict.title)}</h2>
    <div class="card">${ep.verdict.body}</div>
    <p class="lead" style="font-size:30px">Checked ${esc(ep.checked)}. Prices change, so check today's price.</p>${foot(f, '5 / 6')}</div>`,
  howto: (f) => `<div class="slide"><div class="eyebrow">Check any deal yourself</div>
    <h2>Save this for Black Friday</h2>
    <div class="card steps">
      <div class="step"><i>1</i><span>Tap <b>Price history</b> next to the price.</span></div>
      <div class="step"><i>2</i><span>Did it really sell at the <b>full price</b>?</span></div>
      <div class="step"><i>3</i><span>Is today the <b>lowest</b> point?</span></div>
      <div class="step"><i>4</i><span>Has it <b>bounced</b> on and off sale? It may drop again.</span></div>
    </div>${foot(f, '6 / 6')}</div>`,
  cta: (f) => `<div class="slide">${me(f)}
    <h2>Comment a product and I'll check it next.</h2>
    <div class="card"><b>Black Friday is Fri, Nov 27.</b><br>My watchlist is in my bio.</div>
    <p class="lead" style="font-size:30px">#ad · As an Amazon Associate I earn from qualifying purchases.</p>${foot(f, '')}</div>`,
};

const browser = await chromium.launch();
for (const [name, f] of Object.entries(formats)) {
  const dir = path.join(outDir, name); mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: f.w, height: f.h } });
  const list = name === 'pinterest' ? [['1-pin-hook', slides.hook], ['2-pin-howto', slides.howto]] : Object.entries(slides).map(([k, fn], i) => [`${i + 1}-${k}`, fn]);
  for (const [file, fn] of list) {
    await page.setContent(`<style>${css(f)}</style>${fn(f)}`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(dir, `${file}.jpg`), type: 'jpeg', quality: 92 });
  }
  await page.close();
}
await browser.close();
