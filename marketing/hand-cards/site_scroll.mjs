// Full-page phone-size screenshot of a live site page (crisp, 3x) to use as a scrolling video background.
// node site_scroll.mjs <url> <out.png> [css width, default 390]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, url, out, width = '390'] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Number(width), height: 844 }, deviceScaleFactor: 3 });
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForSelector('#grid .card');
// load every product photo (they are lazy) by scrolling through the page once
for (let y = 0; y < 30000; y += 700) { await p.evaluate((yy) => window.scrollTo(0, yy), y); await p.waitForTimeout(120); }
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(800);
await p.addStyleTag({ content: '.hero-art{animation:none!important} .site-header{position:static!important}' });
await p.screenshot({ path: out, fullPage: true });
await b.close(); console.log(out);
