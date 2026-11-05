// Instagram Reel cover / hook frame (1080x1920). Key text sits inside the centre 1080x1350 area,
// which is what shows on the profile grid. node reel-cover.mjs <out.png> <fontDir> <logo.svg> <date> <weekday>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, out, fontDir, logoFile, date, weekday] = process.argv;
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
const logo = readFileSync(logoFile).toString('base64');
const html = `<!doctype html><style>
@font-face { font-family: P; font-weight: 600; src: url(data:font/ttf;base64,${font('SemiBold')}); }
@font-face { font-family: P; font-weight: 800; src: url(data:font/ttf;base64,${font('ExtraBold')}); }
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;font-family:P}
.c{position:relative;width:1080px;height:1920px;background:linear-gradient(165deg,#ff3d7f,#ff8a3d)}
.blob{position:absolute;border-radius:50%;background:#fff;opacity:.10}
.logo{position:absolute;left:390px;top:330px;width:300px;height:300px;filter:drop-shadow(0 12px 18px rgba(59,15,58,.35))}
h1{position:absolute;left:0;right:0;top:660px;margin:0;text-align:center;color:#fff;font-weight:800;font-size:150px;line-height:.95;text-shadow:0 8px 0 rgba(59,15,58,.2)}
h1 span{display:block;color:#ffd23f;font-size:96px;margin-top:20px}
.date{position:absolute;left:50%;top:1010px;transform:translateX(-50%) rotate(-3deg);background:#3b0f3a;color:#ffd23f;font-weight:800;font-size:64px;padding:14px 44px;border-radius:999px;white-space:nowrap}
.tags{position:absolute;left:0;right:0;top:1170px;display:flex;justify-content:center;gap:18px}
.tags b{background:#fff;color:#3b0f3a;font-size:40px;padding:12px 26px;border-radius:999px;border:5px solid #3b0f3a}
.spark{position:absolute;color:#ffd23f;font-size:70px}
</style><div class="c"><div class="blob" style="width:600px;height:600px;right:-200px;top:120px"></div><div class="blob" style="width:420px;height:420px;left:-160px;top:1300px"></div>
<img class="logo" src="data:image/svg+xml;base64,${logo}">
<h1>Top Deals<span>worth it today</span></h1>
<div class="date">${weekday} ${date}</div>
<div class="tags"><b>💝 Her</b><b>🎧 Tech</b><b>🧔 Him</b></div>
<span class="spark" style="left:150px;top:420px">✦</span><span class="spark" style="right:150px;top:560px;font-size:50px;color:#fff">✦</span><span class="spark" style="right:190px;top:1300px">✦</span>
</div>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
await p.screenshot({ path: out }); await b.close(); console.log(out);
