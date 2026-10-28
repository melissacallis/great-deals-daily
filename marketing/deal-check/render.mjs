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
const shot = (name, maxH, dd = '') => {
  if (!ep.shots?.[name]) return '';
  const buf = readFileSync(path.join(shotDir, ep.shots[name])), w = buf.readUInt32BE(16), h = buf.readUInt32BE(20); // PNG size
  // full card width, but never taller than maxH, keeping the screenshot's shape so doodle targets line up
  return `<img ${dd} src="data:image/png;base64,${buf.toString('base64')}" style="display:block; width:min(100%, ${Math.round(maxH * w / h)}px); height:auto; border-radius:18px; border:2px solid #f1e4ee; margin-bottom:28px">`;
};
const dd = (kind, colour, box) => `data-dd="${kind}" data-dd-colour="${colour}"${box ? ` data-dd-box="${box}"` : ''}`;
const SUN = '#ffd23f', PINK = '#ff3d7f', WHITE = '#ffffff';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const formats = {
  instagram: { w: 1080, h: 1350, handle: '@datadarling33', pad: [90, 80, 90, 80] },
  tiktok: { w: 1080, h: 1920, handle: '@datadarling', pad: [230, 230, 480, 80] },
  reel: { w: 1080, h: 1920, handle: '@datadarling33', pad: [230, 230, 480, 80] }, // Instagram Reel frames
  'split-tiktok': { w: 1080, h: 1120, handle: '@datadarling', pad: [150, 170, 70, 70] }, // top half of a split-screen video
  'split-reel': { w: 1080, h: 1120, handle: '@datadarling33', pad: [150, 170, 70, 70] },
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
h1 { font-size: ${Math.round(Math.min(f.w * 0.12, f.h * 0.095))}px; line-height: 1; }
${f.h < 1300 ? '.foot { display: none !important; } /* split-screen top half: the video carries the #ad label */' : ''}
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
    <path id="price-line" d="${d}" fill="none" stroke="url(#g)" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>
    <circle id="price-dot" cx="${X(ep.chart.days)}" cy="${Y(ep.chart.today)}" r="20" fill="#fff" stroke="#ff3d7f" stroke-width="10"/>
    <circle cx="${X(ep.chart.days)}" cy="${Y(ep.chart.today)}" r="14" fill="none" stroke="none" data-dd="circle" data-dd-colour="#ff3d7f" data-dd-late="1"/>
    <text id="price-label" x="${X(ep.chart.days)}" y="${Y(ep.chart.today) + 64}" text-anchor="end" font-family="P" font-weight="800" font-size="28" fill="#ff3d7f">TODAY: LOWEST</text>
    <text x="${x0}" y="${H - 2}" font-family="P" font-weight="600" font-size="24" fill="#9a7a95">${esc(ep.chart.from)}</text>
    <text x="${x1}" y="${H - 2}" text-anchor="end" font-family="P" font-weight="600" font-size="24" fill="#9a7a95">${esc(ep.chart.to)}</text>
  </svg>`;
}

const verdictColour = { real: '#1fa971', decent: '#f0a020', skip: '#e0344f' }[ep.verdict.kind];
const slides = {
  hook: (f) => `<div class="slide">${me(f)}
    <div class="badge" ${dd('circle sparkles', SUN)}><small>${esc(ep.badgeLabel)}</small><b class="grad">-${esc(ep.discount)}</b></div>
    <h1>Is this deal actually <span ${dd('underline', SUN)}>real?</span></h1>
    <p class="lead">${esc(ep.product)}. Let's check →</p>${foot(f, 'Swipe →')}</div>`,
  compared: (f) => `<div class="slide"><div class="eyebrow">Step 1 · Compared to what?</div>
    <h2>${esc(ep.discount)} off the "List Price"</h2>
    <div class="card">${shot('deal', 320, dd('circle', PINK, ep.ddBoxes?.priceHistoryButton))}A "List Price" can be a price <b ${dd('underline', PINK)}>nobody actually pays</b>.<br><br>So I tapped <b class="grad">Price history</b>, right next to the price, to see what it really sold for.</div>${foot(f, '1 / 6')}</div>`,
  history: (f) => `<div class="slide"><div class="eyebrow">Step 2 · The last ${ep.chart.days} days</div>
    <h2 ${dd('sparkles', SUN)}>${esc(ep.historyTitle)}</h2>
    <div class="card" style="padding:44px 54px">${ep.shots?.history && !animChart ? shot('history', f.h > 1600 ? 760 : 560, dd('circle', PINK, ep.ddBoxes?.today)).replace('margin-bottom:28px', 'margin:0') : chart(f)}</div>
    <p class="lead" style="font-size:32px">${esc(animChart ? "Redrawn from Amazon's own 30-day price history. Today is the lowest in that time." : ep.historyNote)}</p>${foot(f, '2 / 6')}</div>`,
  catch: (f) => `<div class="slide"><div class="eyebrow">Step 3 · The catch</div>
    <h2><span ${dd('burst', SUN)}>${esc(ep.catchTitle)}</span></h2>
    <div class="card">${ep.catchBody.replace('<b>', `<b ${dd('underline', PINK)}>`)}</div>${foot(f, '3 / 6')}</div>`,
  skip: (f) => `<div class="slide"><div class="eyebrow">Skip it if…</div>
    <h2>${esc(ep.skipTitle)}</h2>
    <div class="card">${shot('reviews', f.h > 1600 ? 520 : 400, dd('circle', PINK, ep.ddBoxes?.stars))}${ep.skipBody.replace(/<b>(?!3\.1)/, `<b ${dd('underline', PINK)}>`)}</div>${foot(f, '4 / 6')}</div>`,
  verdict: (f) => `<div class="slide"><div class="eyebrow">The verdict</div>
    <span class="pill" ${dd('check', WHITE)} style="align-self:flex-start; background:#fff; color:${verdictColour}; font-size:40px; padding:16px 34px">${esc(ep.verdict.label)}</span>
    <h2 ${dd('sparkles', SUN)}>${esc(ep.verdict.title)}</h2>
    <div class="card">${ep.verdict.body.replace('<b>', `<b ${dd('underline', PINK)}>`)}</div>
    <p class="lead" style="font-size:30px">Checked ${esc(ep.checked)}. Prices change, so check today's price.</p>${foot(f, '5 / 6')}</div>`,
  howto: (f) => `<div class="slide"><div class="eyebrow">Check any deal yourself</div>
    <h2>Save this for Black Friday</h2>
    <div class="card steps">
      <div class="step"><i>1</i><span>Tap <b ${dd('underline', PINK)}>Price history</b> next to the price.</span></div>
      <div class="step"><i>2</i><span>Did it really sell at the <b>full price</b>?</span></div>
      <div class="step"><i>3</i><span>Is today the <b>lowest</b> point?</span></div>
      <div class="step"><i>4</i><span>Has it <b>bounced</b> on and off sale? It may drop again.</span></div>
    </div>${foot(f, '6 / 6')}</div>`,
  cta: (f) => `<div class="slide">${me(f)}
    <h2 ${dd('sparkles', SUN)}>Comment a product and I'll check it next.</h2>
    <div class="card" ${dd('hearts', PINK)}><b>Black Friday is Fri, Nov 27.</b><br>My watchlist is in my bio.</div>
    <p class="lead" style="font-size:30px">#ad · As an Amazon Associate I earn from qualifying purchases.</p>${foot(f, '')}</div>`,
};

const stillDoodleJs = readFileSync(new URL('./doodles.js', import.meta.url), 'utf8');
const browser = await chromium.launch();
// ANIM=1: write animation frames for the videos instead of still slides.
// Per slide: in-00..13 (rise in, then doodles draw on) and boil-1..3 (finished doodles, redrawn three ways).
const ANIM_SLIDES = ['hook', 'compared', 'history', 'catch', 'skip', 'verdict', 'cta'];
let animChart = false;
if (process.env.ANIM) {
  animChart = true;
  const doodleJs = readFileSync(new URL('./doodles.js', import.meta.url), 'utf8');
  const browser = await chromium.launch();
  // ANIM_FORMATS / ANIM_KEYS pick which formats and slides to animate (default: reel + tiktok, the video slides)
  for (const name of (process.env.ANIM_FORMATS || 'reel,tiktok').split(',')) {
    const f = formats[name];
    const page = await browser.newPage({ viewport: { width: f.w, height: f.h } });
    for (const [i, key] of (process.env.ANIM_KEYS ? process.env.ANIM_KEYS.split(',') : ANIM_SLIDES).entries()) {
      const dir = path.join(outDir, 'anim', name, String(i)); mkdirSync(dir, { recursive: true });
      await page.setContent(`<style>${css(f)}</style>${slides[key](f)}`);
      await page.evaluate(() => document.fonts.ready);
      await page.addScriptTag({ content: doodleJs });
      for (let k = 0; k < 14; k++) {
        await page.evaluate(([t, p]) => { window.enter(1); window.drawDoodles(1, p, 0); if (document.querySelector('#price-line')) window.drawLine(0, 0); window.enter(t); }, [Math.min(1, k / 8), Math.max(0, (k - 6) / 8)]);
        await page.screenshot({ path: path.join(dir, `in-${String(k).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 88 });
      }
      if (await page.$('#price-line')) {
        // the price line draws itself across the chart (2s), then "TODAY: LOWEST" pops in and gets circled
        const shotTo = (name) => page.screenshot({ path: path.join(dir, `${name}.jpg`), type: 'jpeg', quality: 88 });
        for (let k = 0; k < 48; k++) {
          await page.evaluate((p) => { window.enter(1); window.drawDoodles(1, 1, 0); window.drawLine(p, 0); }, 1 - Math.pow(1 - k / 47, 2));
          await shotTo(`draw-${String(k).padStart(2, '0')}`);
        }
        for (let k = 0; k < 10; k++) {
          await page.evaluate((q) => { window.enter(1); window.drawDoodles(1, 1, q); window.drawLine(1, q); }, (k + 1) / 10);
          await shotTo(`pop-${String(k).padStart(2, '0')}`);
        }
      }
      for (let b = 1; b <= 3; b++) {
        await page.evaluate((seed) => { window.enter(1); window.drawDoodles(seed, 1); if (window.drawLine) window.drawLine(1, 1); }, b);
        await page.screenshot({ path: path.join(dir, `boil-${b}.jpg`), type: 'jpeg', quality: 88 });
      }
    }
    await page.close();
  }
  await browser.close();
  process.exit(0);
}

for (const [name, f] of Object.entries(formats)) {
  if (name.startsWith('split')) continue; // only used for animation frames
  const dir = path.join(outDir, name); mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: f.w, height: f.h } });
  const list = name === 'pinterest' ? [['1-pin-hook', slides.hook], ['2-pin-howto', slides.howto]] : Object.entries(slides).map(([k, fn], i) => [`${i + 1}-${k}`, fn]);
  for (const [file, fn] of list) {
    await page.setContent(`<style>${css(f)}</style>${fn(f)}`);
    await page.evaluate(() => document.fonts.ready);
    await page.addScriptTag({ content: stillDoodleJs });
    await page.evaluate(() => window.drawDoodles(1, 1));
    await page.screenshot({ path: path.join(dir, `${file}.jpg`), type: 'jpeg', quality: 92 });
  }
  await page.close();
}
await browser.close();
