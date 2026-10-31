// Transparent text overlays (1080x1920) for the holiday skillet soup video.
// node overlays.mjs <outDir> <fontDir>
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, outDir, fontDir] = process.argv;
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
mkdirSync(outDir, { recursive: true });
const css = `
@font-face { font-family: P; font-weight: 600; src: url(data:font/ttf;base64,${font('SemiBold')}); }
@font-face { font-family: P; font-weight: 800; src: url(data:font/ttf;base64,${font('ExtraBold')}); }
* { margin: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1920px; background: transparent; overflow: hidden; font-family: P; color: #fff; }
.box { position: absolute; left: 80px; right: 230px; top: 260px; }
.kicker { display: inline-block; background: #ff3d7f; color: #fff; font: 800 30px P; letter-spacing: .12em; text-transform: uppercase; padding: 10px 24px; border-radius: 14px; }
.big { margin-top: 22px; font: 800 96px/1.02 P; letter-spacing: -.02em; text-shadow: 0 6px 30px rgba(0,0,0,.55), 0 2px 6px rgba(0,0,0,.5); }
.mid { margin-top: 18px; font: 800 70px/1.08 P; letter-spacing: -.01em; text-shadow: 0 6px 30px rgba(0,0,0,.6), 0 2px 6px rgba(0,0,0,.5); }
.sub { margin-top: 16px; font: 600 40px/1.3 P; text-shadow: 0 3px 16px rgba(0,0,0,.7); }
.gold { color: #ffd23f; }
.card { position: absolute; left: 70px; right: 70px; top: 230px; background: rgba(255,250,246,.96); color: #3b0f3a; border-radius: 48px; padding: 50px 54px; box-shadow: 0 30px 80px rgba(0,0,0,.45); }
.card h2 { font: 800 56px/1.05 P; margin-bottom: 8px; } .card .k { font: 800 28px P; letter-spacing: .12em; color: #ff3d7f; text-transform: uppercase; }
.card h3 { font: 800 34px P; margin: 26px 0 8px; color: #ff3d7f; }
.card ul, .card ol { padding-left: 38px; font: 600 33px/1.42 P; }
.pill { position: absolute; left: 70px; right: 70px; top: 1500px; background: linear-gradient(135deg, #ff3d7f, #ff8a3d); border-radius: 36px; padding: 28px 40px; font: 800 38px/1.25 P; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,.35); }
.pill small { display: block; font: 600 28px P; margin-top: 6px; }`;
const step = (n, title, sub) => `<div class="box"><span class="kicker">Step ${n}</span><div class="mid">${title}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
const shots = {
  hook: `<div class="box"><span class="kicker">Holiday dinner</span><div class="big">Soup for 8.<br><span class="gold">One pan.</span></div><div class="sub">Creamy potato &amp; hamburger soup</div></div>`,
  s1: step(1, 'Brown beef + onion.<br>Add potatoes &amp; broth.', ''),
  s2: step(2, 'Lid on.<br><span class="gold">Simmer 30–40 min.</span>', 'Medium-low, until potatoes are tender'),
  s3: step(3, 'Pour in the<br>heavy cream.', ''),
  s4: step(4, 'Cheddar.<br><span class="gold">Stir. Done.</span>', ''),
  card: `<div class="card"><div class="k">Save this recipe</div><h2>Holiday Creamy Potato &amp; Hamburger Soup</h2>
    <h3>Ingredients</h3><ul><li>1 lb ground beef</li><li>4 cups diced potatoes</li><li>1 onion, chopped</li><li>2 cups beef broth</li><li>1 cup heavy cream</li><li>1 cup shredded cheddar</li><li>Salt &amp; pepper</li></ul>
    <h3>Directions</h3><ol><li>Brown beef + onion in the electric skillet.</li><li>Add potatoes, broth, seasoning.</li><li>Cover, simmer on medium-low 30–40 min.</li><li>Stir in cream + cheese. Serve hot.</li></ol></div>
    <div class="pill">Made in a 14″ electric skillet · serves 6–8<small>Skillet's in my Holiday Gift Guide · link in bio · #ad</small></div>`,
};
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
for (const [name, html] of Object.entries(shots)) {
  await p.setContent(`<style>${css}</style>${html}`); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(outDir, `${name}.png`), omitBackground: true });
}
await b.close();
