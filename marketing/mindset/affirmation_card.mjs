// Animated "Knowledge Is Power" affirmation card (1080x1920 PNG frames) for mindset videos: lines pop in one by one,
// then the card shrinks up and a bridge to the deals ("even when you shop" + LINK IN BIO) appears at 9.9 s.
// node affirmation_card.mjs <outDir> <fontDir> <logo.svg> <seconds>
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, outDir, fontDir, logoFile, dur] = process.argv;
const f = (w) => readFileSync(`${fontDir}/Poppins-${w}.ttf`).toString('base64');
const logo = readFileSync(logoFile).toString('base64');
const lines = ['I learn something new every day.', 'I put what I learn into action.', 'I invest in skills that serve my purpose.', 'Knowledge is my power, and I use it.', 'I welcome every lesson life brings me.'];
const html = `<!doctype html><style>
@font-face{font-family:P;font-weight:600;src:url(data:font/ttf;base64,${f('SemiBold')})}
@font-face{font-family:P;font-weight:800;src:url(data:font/ttf;base64,${f('ExtraBold')})}
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden;font-family:P;color:#3b0f3a}
body{background:radial-gradient(circle at 15% 12%,#ffd6e6 0,transparent 45%),radial-gradient(circle at 90% 30%,#ffe2c7 0,transparent 40%),radial-gradient(circle at 30% 90%,#e3d6ff 0,transparent 50%),linear-gradient(170deg,#fff0f5,#f3e9ff)}
.blob{position:absolute;border-radius:50%;filter:blur(2px);opacity:.55}
#wrap{position:absolute;inset:0;transition:none}
.logo{position:absolute;top:300px;left:50%;width:150px;margin-left:-75px;filter:drop-shadow(0 8px 14px rgba(59,15,58,.25))}
h1{position:absolute;top:480px;left:0;right:0;text-align:center;margin:0;white-space:nowrap;font-size:84px;line-height:1;font-weight:800}
h1 span{background:linear-gradient(90deg,#ff3d7f,#ff8a3d);-webkit-background-clip:text;color:transparent}
.sub{position:absolute;top:600px;left:0;right:0;text-align:center;font-size:40px;font-weight:600;color:#7a3a6e}
.row{position:absolute;left:64px;right:64px;background:#fff;border-radius:34px;padding:30px 36px 30px 112px;font-size:39px;font-weight:600;line-height:1.25;box-shadow:0 10px 0 rgba(59,15,58,.07),0 16px 34px rgba(59,15,58,.12)}
.row b{position:absolute;left:30px;top:50%;margin-top:-30px;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#ff3d7f,#ff8a3d);color:#fff;display:flex;align-items:center;justify-content:center;font-size:34px}
#end{position:absolute;left:70px;right:70px;top:1130px;text-align:center;opacity:0}
#end .big{font-size:64px;font-weight:800;line-height:1.1}
#end .small{font-size:40px;font-weight:600;color:#7a3a6e;margin-top:22px;line-height:1.3}
#end .pill{display:inline-block;margin-top:44px;background:linear-gradient(90deg,#ff3d7f,#ff8a3d);color:#fff;font-weight:800;font-size:56px;padding:20px 54px;border-radius:999px;box-shadow:0 10px 24px rgba(255,61,127,.35)}
</style><body>
<div class="blob" style="width:420px;height:420px;left:-140px;top:1500px;background:#ffc2d9"></div>
<div class="blob" style="width:360px;height:360px;right:-120px;top:80px;background:#ffd9b8"></div>
<div id="wrap"><img class="logo" src="data:image/svg+xml;base64,${logo}">
<h1>Knowledge Is <span>Power</span> 💡</h1><div class="sub" id="sub">5-minute morning affirmations ☀️</div>
${lines.map((l, i) => `<div class="row" id="r${i}" style="top:${720 + i * 158}px"><b>✓</b>${l}</div>`).join('')}</div>
<div id="end"><div class="big">Knowledge is power,<br>even when you shop 🛍️</div><div class="small">I check every deal's real price<br>so you don't overpay.</div><div class="pill">LINK IN BIO</div></div>
<script>
const cl=x=>Math.max(0,Math.min(1,x)), back=x=>{x=cl(x);const c=1.6;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
window.set=(t)=>{
  const intro=cl(t/.5); document.querySelector('.logo').style.transform='scale('+back(t/.6)+')';
  document.querySelector('h1').style.opacity=intro; document.querySelector('h1').style.transform='translateY('+(30*(1-intro))+'px)';
  const sub=document.getElementById('sub'); sub.style.opacity=cl((t-.4)/.4);
  const pulse=t>5&&t<6.2?1+.08*Math.sin((t-5)*Math.PI/1.2):1; sub.style.transform='scale('+pulse+')';
  for(let i=0;i<5;i++){const k=back((t-(.9+i*1.25))/.5), r=document.getElementById('r'+i); r.style.opacity=cl((t-(.9+i*1.25))/.25); r.style.transform='translateX('+((1-Math.min(1,k))*(i%2?120:-120))+'px) scale('+(.9+.1*Math.min(1.05,k))+')'}
  const e=cl((t-9.6)/.6), w=document.getElementById('wrap'); w.style.transform='translateY('+(-180*e)+'px) scale('+(1-.18*e)+')'; w.style.transformOrigin='50% 0'; w.style.opacity=1-.25*e;
  const en=document.getElementById('end'); en.style.opacity=cl((t-9.9)/.4); en.style.transform='translateY('+(40*(1-cl((t-9.9)/.5)))+'px)';
  document.querySelector('#end .pill').style.transform='scale('+Math.min(1.05,back((t-10.4)/.45))+')';
};</script>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready); mkdirSync(outDir, { recursive: true });
const N = Math.round(Number(dur) * 30);
for (let i = 0; i < N; i++) { await p.evaluate((t) => window.set(t), i / 30); await p.screenshot({ path: `${outDir}/${String(i).padStart(5, '0')}.png` }); }
await b.close(); console.log('card frames', N);
