// Renders crisp deal cards (exactly as they look on the site) as transparent PNGs at 3x resolution.
// node card_render.mjs <site url, e.g. https://www.ubottega.com/top/her or http://localhost:3999/> <outDir> <how many> [skip]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, url, outDir, count = '5', skip = '0'] = process.argv;
mkdirSync(outDir, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 3 });
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForSelector('#grid .card');
// clean card for video: no hover lift or page shadow
await p.addStyleTag({ content: '.card{transform:none!important;box-shadow:none!important} body{background:transparent!important}' });
// compact video card (COMPACT=1): photo, name, price, savings; no button or countdown; same height for every card
if (process.env.COMPACT) await p.addStyleTag({ content: `
  #grid { display: block !important; width: 228px !important; } #grid .card { margin-bottom: 24px; }
  .card, .card-link, .card-body { height: auto !important; min-height: 0 !important; }
  .card-body { gap: 6px !important; } .card .cta, .card .ends, .card .rating { display: none !important; }
  .card .prices { margin-top: 4px !important; } .card .title { min-height: 2.6em; }` });
// sharper product photos: Amazon serves bigger versions of the same image (_SL500_ -> _SL1000_)
await p.$$eval('#grid .card img', (imgs) => imgs.forEach((im) => { if (/_SL\d+_/.test(im.src)) im.src = im.src.replace(/_SL\d+_/, '_SL1000_'); }));
await p.waitForTimeout(1500);
const cards = (await p.$$('#grid .card')).slice(Number(skip), Number(skip) + Number(count));
const info = [];
for (const [i, c] of cards.entries()) {
  await c.scrollIntoViewIfNeeded();
  await p.waitForFunction((el) => { const img = el.querySelector('img'); return !img || img.complete; }, c, { timeout: 8000 }).catch(() => {});
  const file = path.join(outDir, `card${i + 1}.png`);
  await c.screenshot({ path: file, omitBackground: true });
  info.push({ file, title: await c.$eval('.title', (e) => e.textContent).catch(() => ''), price: await c.$eval('.price', (e) => e.textContent).catch(() => ''),
              off: await c.$eval('.badge-off', (e) => e.textContent).catch(() => '') });
}
console.log(JSON.stringify(info, null, 1));
await b.close();
