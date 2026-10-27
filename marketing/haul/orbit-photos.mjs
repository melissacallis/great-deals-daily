// Orbit of the 10 Haul finds as die-cut photo stickers (doodle stickers where no photo yet), lower so the
// front of the ring dips onto the top of the owner's head. White + plum sticker edges "boil" 8 times a second.
// node orbit-photos.mjs <outDir> <fontDir> <cutoutDir> <seconds> [fps]
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { icons } from './icons.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, outDir, fontDir, cutDir, seconds, fpsArg] = process.argv;
const FPS = Number(fpsArg || 30), W = 1080, H = 1920;
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
mkdirSync(outDir, { recursive: true });

const moreIcons = {
  foodbag: `<path d="M-40,-44 L40,-44 L44,48 L-44,48 Z"/><path d="M-40,-30 L40,-30"/><path d="M-26,-4 Q0,-18 26,-4 Q0,10 -26,-4"/>`,
  stand: `<rect x="-30" y="-54" width="44" height="80" rx="8" transform="rotate(-12)"/><path d="M-40,50 L40,50 M10,50 L-4,10 M26,50 L14,20"/>`,
  drawer: `<rect x="-48" y="-40" width="96" height="36" rx="6"/><rect x="-48" y="6" width="96" height="36" rx="6"/><path d="M-12,-22 L12,-22 M-12,24 L12,24"/>`,
  gloves: `<path d="M-30,48 L-30,-6 Q-30,-14 -22,-14 L-22,-40 Q-14,-48 -8,-40 L-8,-48 Q0,-56 6,-48 L6,-42 Q14,-50 20,-40 L20,-6 Q34,-20 38,-8 L26,22 Q22,40 20,48 Z"/><path d="M-30,30 L20,30"/>`,
  sprayer: `<path d="M-22,-10 L22,-10 L26,52 L-26,52 Z"/><path d="M-10,-10 L-10,-30 L10,-30 L10,-10 M10,-26 L34,-30 M-6,-30 L-6,-46 L18,-46"/>`,
};
const allIcons = { ...icons, ...moreIcons };
const items = [
  { key: 'socks', label: 'Fuzzy socks' }, { key: 'foodbag', label: 'Silicone food bags' }, { key: 'claw', label: 'Claw clips' },
  { key: 'stand', label: 'Phone stand' }, { key: 'cable', label: 'Cable clips' }, { key: 'drawer', label: 'Drawer organizers' },
  { key: 'bag', label: 'Gift bags' }, { key: 'gloves', label: 'Touchscreen gloves' }, { key: 'light', label: 'Closet light' },
  { key: 'sprayer', label: 'Oil sprayer' },
].map((it) => {
  const file = path.join(cutDir, `${it.key}.png`);
  if (!existsSync(file)) return { ...it, doodle: allIcons[it.key] };
  const buf = readFileSync(file);
  return { ...it, src: `data:image/png;base64,${buf.toString('base64')}`, w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
});
const colours = ['#ffd0e0', '#ffe08a', '#c9f0e4', '#e3d4ff', '#ffcfae'];

const html = `<style>
@font-face { font-family: P; font-weight: 600; src: url(data:font/ttf;base64,${font('SemiBold')}); }
@font-face { font-family: P; font-weight: 800; src: url(data:font/ttf;base64,${font('ExtraBold')}); }
html, body { margin: 0; width: ${W}px; height: ${H}px; background: transparent; overflow: hidden; }
</style>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="sticker" x="-25%" y="-25%" width="150%" height="150%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="17" result="outer"/>
      <feMorphology in="SourceAlpha" operator="dilate" radius="12" result="inner"/>
      <feTurbulence id="turb" type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="1" result="noise"/>
      <feDisplacementMap in="outer" in2="noise" scale="10" result="outerB"/>
      <feDisplacementMap in="inner" in2="noise" scale="10" result="innerB"/>
      <feFlood flood-color="#3b0f3a"/><feComposite in2="outerB" operator="in" result="plum"/>
      <feFlood flood-color="#ffffff"/><feComposite in2="innerB" operator="in" result="white"/>
      <feGaussianBlur in="outerB" stdDeviation="9" result="blur"/><feOffset in="blur" dy="10" result="sh"/>
      <feFlood flood-color="#3b0f3a" flood-opacity=".3"/><feComposite in2="sh" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="plum"/><feMergeNode in="white"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="boil"><feTurbulence id="turb2" type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="1"/><feDisplacementMap in="SourceGraphic" scale="7"/></filter>
  </defs>
  <g id="art"></g>
</svg>
<script>
const items = ${JSON.stringify(items)}, colours = ${JSON.stringify(colours)}, icons = ${JSON.stringify(allIcons)};
const CX = 530, CY = 830, RX = 370, RY = 120, SIZE = 188;
const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
window.frame = (t) => {
  const seed = 1 + Math.floor(t * 8) % 3;
  document.getElementById('turb').setAttribute('seed', seed); document.getElementById('turb2').setAttribute('seed', seed);
  const parts = [];
  const bIn = ease(t / 0.6);
  parts.push({ z: -1, svg: \`<g transform="translate(540 \${330 - (1 - bIn) * 40}) rotate(-2)" opacity="\${bIn}">
    <g filter="url(#boil)"><rect x="-380" y="-78" width="760" height="156" rx="44" fill="#fff" stroke="#3b0f3a" stroke-width="7"/></g>
    <text y="-14" text-anchor="middle" font-family="P" font-weight="800" font-size="50" fill="#3b0f3a">Amazon Haul finds <tspan fill="#ff3d7f">under $10</tspan></text>
    <text y="46" text-anchor="middle" font-family="P" font-weight="800" font-size="34" fill="#3b0f3a">check prices · link in bio · #ad</text></g>\` });
  items.forEach((it, i) => {
    const a = t * 0.45 + (i / items.length) * Math.PI * 2;
    const depth = (Math.sin(a) + 1) / 2;
    const pop = ease((t - 0.4 - i * 0.12) / 0.45);
    const s = (0.62 + 0.38 * depth) * (0.4 + 0.6 * pop);
    const x = CX + RX * Math.cos(a), y = CY + RY * Math.sin(a);
    const wob = Math.sin(t * 2.6 + i * 1.7) * 7;
    let body;
    if (it.src) {
      const k = SIZE / Math.max(it.w, it.h), w = it.w * k, h = it.h * k;
      body = \`<image href="\${it.src}" x="\${-w / 2}" y="\${-h / 2}" width="\${w}" height="\${h}" filter="url(#sticker)"/>\`;
    } else {
      body = \`<g filter="url(#boil)"><circle r="78" fill="\${colours[i % 5]}" stroke="#3b0f3a" stroke-width="7"/>
        <g fill="none" stroke="#3b0f3a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" transform="scale(.85)">\${icons[it.key]}</g></g>\`;
    }
    const lab = Math.max(0, Math.min(1, (depth - 0.45) * 4)) * pop; // labels only on the front of the ring
    const lw = it.label.length * 15 + 40;
    parts.push({ z: depth, svg: \`<g transform="translate(\${x.toFixed(1)} \${y.toFixed(1)}) scale(\${s.toFixed(3)}) rotate(\${wob.toFixed(1)})" opacity="\${pop.toFixed(2)}">\${body}
      <g opacity="\${lab.toFixed(2)}" transform="translate(0 \${SIZE / 2 + 34})"><rect x="\${-lw / 2}" y="-26" width="\${lw}" height="52" rx="20" fill="#fff" stroke="#3b0f3a" stroke-width="5"/>
      <text y="9" text-anchor="middle" font-family="P" font-weight="800" font-size="26" fill="#3b0f3a">\${it.label}</text></g></g>\` });
  });
  parts.sort((p, q) => p.z - q.z);
  document.getElementById('art').innerHTML = parts.map((p) => p.svg).join('');
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
