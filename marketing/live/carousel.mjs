// Instagram/TikTok photo carousel (1080x1350): a cover, one slide per deal set (10 deals, 2x5), and an end slide.
// node carousel.mjs <config.json> <outDir> <fontDir>
// config: {cover:{title, sub, kicker, pics:[[set,item],...6]}, date, sets:[{deals:"file.json", pick:[1,3,...], title, sub}], end:{title, lines:[...]}}
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, cfgFile, outDir, fontDir] = process.argv;
const C = JSON.parse(readFileSync(cfgFile, 'utf8'));
const base = path.dirname(cfgFile);
const logo = readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '../../public/img/logo-badge.svg')).toString('base64');
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const short = (t) => { let s = t.replace(/\s+/g, ' ').trim(); const c = s.search(/,| - | – | \| |\(|\[| with |:/i); if (c > 14) s = s.slice(0, c); return s.length > 34 ? s.slice(0, 32).replace(/\s+\S*$/, '') + '…' : s; };
const img = (u) => (u || '').replace(/_SL\d+_/, '_SL600_');
const sets = C.sets.map((s) => { const all = JSON.parse(readFileSync(path.resolve(base, s.deals), 'utf8')).items; return { ...s, items: s.pick.map((n) => all[n - 1]) }; });
const css = `<style>
@font-face{font-family:P;font-weight:600;src:url(data:font/ttf;base64,${font('SemiBold')})}
@font-face{font-family:P;font-weight:800;src:url(data:font/ttf;base64,${font('ExtraBold')})}
*{box-sizing:border-box} html,body{margin:0;width:1080px;height:1350px;overflow:hidden;font-family:P;position:relative}
body{background:radial-gradient(circle at 20% 10%,#e8364f 0,transparent 50%),radial-gradient(circle at 85% 90%,#1f9d6b 0,transparent 50%),linear-gradient(160deg,#b3122e,#0f6b47)}
.lights{position:absolute;top:0;left:0;width:1080px;height:70px}
.snow{position:absolute;color:rgba(255,255,255,.5);font-size:30px}
.head{position:absolute;top:84px;left:0;right:0;text-align:center;color:#fff}
.head img{width:104px;height:104px;vertical-align:middle;filter:drop-shadow(0 6px 10px rgba(59,15,58,.35))}
.head h1{display:inline-block;vertical-align:middle;margin:0 0 0 14px;font-size:66px;line-height:.95;text-align:left;text-shadow:0 5px 0 rgba(59,15,58,.18)}
.head h1 span{display:block;font-size:36px;color:#ffd45c;margin-top:6px}
.card{position:absolute;width:470px;height:180px;background:#fff;border-radius:26px;box-shadow:0 10px 0 rgba(59,15,58,.18),0 14px 30px rgba(59,15,58,.25);display:flex;align-items:center;gap:14px;padding:10px 12px}
.n{position:absolute;top:-14px;left:-10px;background:#3b0f3a;color:#fff;font-weight:800;font-size:26px;width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:4px solid #fff}
.ph{flex:none;width:150px;height:156px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.ph img{max-width:100%;max-height:100%;object-fit:contain}
.tx{padding-right:70px} .nm{color:#3b0f3a;font-weight:800;font-size:25px;line-height:1.12;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden} .pr{color:#e8364f;font-weight:800;font-size:34px;margin-top:6px}
.off{position:absolute;top:-16px;right:-16px;width:100px;height:100px;font-size:31px;background:#ffd45c;color:#3b0f3a;font-weight:800;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;border:4px solid #fff;transform:rotate(10deg);box-shadow:0 4px 8px rgba(59,15,58,.25)}
.off small{font-size:.45em;margin-top:-4px}
.foot{position:absolute;bottom:34px;left:0;right:0;text-align:center;color:#fff;font-weight:800;font-size:34px;text-shadow:0 3px 0 rgba(59,15,58,.25)}
.pg{position:absolute;bottom:40px;right:44px;color:rgba(255,255,255,.8);font-weight:800;font-size:26px}
.big{position:absolute;left:60px;right:60px;text-align:center;color:#fff}
.pill{display:inline-block;background:#3b0f3a;color:#ffd45c;font-weight:800;font-size:36px;padding:10px 30px;border-radius:999px}
.tile{position:absolute;width:250px;height:250px;background:#fff;border-radius:30px;box-shadow:0 10px 0 rgba(59,15,58,.18),0 14px 30px rgba(59,15,58,.3);display:flex;align-items:center;justify-content:center;padding:18px}
.tile img{max-width:100%;max-height:100%;object-fit:contain}
.tile .off{width:92px;height:92px;font-size:28px}
.row{display:flex;align-items:center;gap:20px;background:#fff;border-radius:28px;padding:22px 30px;margin:0 auto 24px;width:820px;color:#3b0f3a;font-weight:800;font-size:38px;text-align:left;box-shadow:0 8px 0 rgba(59,15,58,.18)}
.row b{flex:none;width:64px;height:64px;border-radius:50%;background:#e8364f;color:#fff;display:flex;align-items:center;justify-content:center;font-size:34px}
</style>`;
const lights = `<svg class="lights" viewBox="0 0 1080 70"><path d="M0 10 Q270 56 540 12 T1080 10" fill="none" stroke="#173d2a" stroke-width="4"/>${[...Array(14)].map((_, i) => { const x = 20 + i * 79, y = 10 + Math.abs(Math.sin((x / 540) * Math.PI)) * 24; return `<ellipse cx="${x}" cy="${y + 14}" rx="9" ry="13" fill="${['#ffd45c', '#ff5a6e', '#3fe08f', '#3fb8ff', '#ff7ac0'][i % 5]}"/>`; }).join('')}</svg>`;
const snow = (ps) => ps.map(([x, y]) => `<span class="snow" style="left:${x}%;top:${y}%">❄</span>`).join('');
const page = (body) => `<!doctype html>${css}<body>${lights}${body}</body>`;
const N = sets.length + 2;
const slides = [];
// cover: a collage of 6 photos around the headline
const pics = C.cover.pics ? C.cover.pics.map(([k, i]) => sets[k].items[i]) : sets.flatMap((s) => s.items.slice(0, 2));
const spots = [[40, 330, -8], [415, 300, 4], [790, 330, 9], [40, 1010, 6], [415, 1040, -4], [790, 1010, -9]];
slides.push(page(`${snow([[8, 22], [90, 24], [50, 95], [6, 70], [94, 72]])}
<div class="big" style="top:84px"><img src="data:image/svg+xml;base64,${logo}" style="width:120px"></div>
${pics.slice(0, 6).map((d, i) => `<div class="tile" style="left:${spots[i][0]}px;top:${spots[i][1]}px;transform:rotate(${spots[i][2]}deg)"><img src="${img(d.image)}"><div class="off">-${d.savingsPct}%<small>OFF</small></div></div>`).join('')}
<div class="big" style="top:600px"><div style="font-size:${C.cover.kickerSize || 40}px;font-weight:800;color:#ffd45c">${esc(C.cover.kicker)}</div>
<div style="font-size:104px;font-weight:800;line-height:1;text-shadow:0 6px 0 rgba(59,15,58,.25)">${esc(C.cover.title)}</div>
<div style="margin-top:22px"><span class="pill">${esc(C.cover.sub)}</span></div></div>
<div class="pg">Swipe →</div>`));
sets.forEach((s, k) => slides.push(page(`${snow([[4, 96], [50, 97]])}
<div class="head"><img src="data:image/svg+xml;base64,${logo}"><h1>${esc(s.title)}<span>${esc(s.sub)}</span></h1></div>
${s.items.map((d, i) => `<div class="card" style="left:${i % 2 ? 562 : 48}px;top:${262 + Math.floor(i / 2) * 200}px"><span class="n">${i + 1}</span><div class="ph"><img src="${img(d.image)}"></div>
<div class="tx"><div class="nm">${esc(short(d.title))}</div><div class="pr">${esc(d.price)}</div></div><div class="off">-${d.savingsPct}%<small>OFF</small></div></div>`).join('')}
<div class="pg">${k + 2}/${N}</div>`)));
slides.push(page(`${snow([[8, 20], [90, 30], [12, 85], [88, 88], [50, 96]])}
<div class="big" style="top:210px"><img src="data:image/svg+xml;base64,${logo}" style="width:150px"></div>
<div class="big" style="top:420px"><div style="font-size:84px;font-weight:800;line-height:1.02;margin-bottom:46px;text-shadow:0 6px 0 rgba(59,15,58,.25)">${esc(C.end.title)}</div>
${C.end.lines.map((l, i) => `<div class="row"><b>${i + 1}</b>${esc(l)}</div>`).join('')}
<div style="margin-top:30px"><span class="pill">${esc(C.date)}</span></div></div>
<div class="pg">${N}/${N}</div>`));
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (const [i, h] of slides.entries()) {
  await p.setContent(h, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(outDir, `carousel-${i + 1}.png`) });
}
await b.close(); console.log('slides', slides.length);
