// Draws the orbiting doodle "stickers" of the haul finds as transparent PNG frames,
// to lay over the owner's video. Boil: the doodle wobble changes 8 times a second.
// node orbit.mjs <outDir> <fontDir> <seconds> [fps]
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, outDir, fontDir, seconds, fpsArg] = process.argv;
const FPS = Number(fpsArg || 30), W = 1080, H = 1920;
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
mkdirSync(outDir, { recursive: true });

import { icons, items } from './icons.mjs';

const html = `<style>
@font-face { font-family: P; font-weight: 600; src: url(data:font/ttf;base64,${font('SemiBold')}); }
@font-face { font-family: P; font-weight: 800; src: url(data:font/ttf;base64,${font('ExtraBold')}); }
html, body { margin: 0; width: ${W}px; height: ${H}px; background: transparent; overflow: hidden; }
</style>
<svg id="s" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><filter id="boil" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence id="turb" type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="1"/>
    <feDisplacementMap in="SourceGraphic" scale="7"/></filter>
    <filter id="shadow"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#3b0f3a" flood-opacity=".28"/></filter></defs>
  <g id="layer" filter="url(#shadow)"><g id="art"></g></g>
</svg>
<script>
const icons = ${JSON.stringify(icons)}, items = ${JSON.stringify(items)};
const CX = 500, CY = 610, RX = 330, RY = 150;
const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
window.frame = (t) => {
  document.getElementById('turb').setAttribute('seed', 1 + Math.floor(t * 8) % 3);
  const art = document.getElementById('art');
  const parts = [];
  // title sticker
  const tIn = ease(t / 0.6);
  parts.push({ z: -1, svg: \`<g transform="translate(540 \${330 - (1 - tIn) * 40}) rotate(-3)" opacity="\${tIn}">
    <rect x="-330" y="-62" width="660" height="124" rx="40" fill="#fff" stroke="#3b0f3a" stroke-width="6"/>
    <text x="0" y="-8" text-anchor="middle" font-family="P" font-weight="800" font-size="46" fill="#3b0f3a">Amazon Haul finds</text>
    <text x="0" y="42" text-anchor="middle" font-family="P" font-weight="800" font-size="34" fill="#ff3d7f">keep or skip? #ad</text></g>\` });
  items.forEach((it, i) => {
    const a = t * 0.55 + (i / items.length) * Math.PI * 2;
    const depth = (Math.sin(a) + 1) / 2;               // 0 = back of the ring, 1 = front
    const pop = ease((t - 0.4 - i * 0.18) / 0.45);      // stickers pop in one by one
    const s = (0.62 + 0.3 * depth) * (0.4 + 0.6 * pop);
    const x = CX + RX * Math.cos(a), y = CY + RY * Math.sin(a);
    const wob = Math.sin(t * 3 + i) * 6;
    const tw = Math.round(it.tag.length * 12.6 + 46); // tag width that fits its text
    parts.push({ z: depth, svg: \`<g transform="translate(\${x.toFixed(1)} \${y.toFixed(1)}) scale(\${s.toFixed(3)}) rotate(\${wob.toFixed(1)})" opacity="\${pop.toFixed(2)}">
      <g filter="url(#boil)"><circle r="92" fill="\${it.colour}" stroke="#3b0f3a" stroke-width="7"/>
      <g fill="none" stroke="#3b0f3a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">\${icons[it.key]}</g></g>
      <g transform="translate(0 122) rotate(\${(i % 2 ? 4 : -4)})">
        <rect x="-118" y="-30" width="236" height="60" rx="22" fill="#fff" stroke="#3b0f3a" stroke-width="5"/>
        <text y="10" text-anchor="middle" font-family="P" font-weight="800" font-size="30" fill="#3b0f3a">\${it.label}</text></g>
      <g transform="translate(70 -92) rotate(12)">
        <path d="M-12,-24 L\${tw - 22},-24 L\${tw},0 L\${tw - 22},24 L-12,24 Z" fill="#ff3d7f" stroke="#3b0f3a" stroke-width="5" stroke-linejoin="round" filter="url(#boil)"/>
        <circle cx="\${tw - 22}" cy="0" r="6" fill="#fff"/>
        <text x="\${(tw - 34) / 2}" y="8" text-anchor="middle" font-family="P" font-weight="800" font-size="22" fill="#fff">\${it.tag}</text></g></g>\` });
  });
  parts.sort((p, q) => p.z - q.z);
  art.innerHTML = parts.map((p) => p.svg).join('');
};
</script>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
const n = Math.round(Number(seconds) * FPS);
for (let f = 0; f < n; f++) {
  await page.evaluate((t) => window.frame(t), f / FPS);
  await page.screenshot({ path: path.join(outDir, `${String(f).padStart(5, '0')}.png`), omitBackground: true });
}
await browser.close();
console.log('frames', n);
