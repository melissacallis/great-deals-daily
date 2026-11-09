// Christmas "point at the deals" layers for a short trend clip: twinkling light string, falling snow,
// a festive title (behind the owner), and deal cards that pop out at her pointing finger (in front).
// Writes behind/ and front/ PNG sequences for talk_fx.py.
// node xmas_point.mjs <config.json> <outDir> <fontDir>
// config: {duration, fps, title:[line1,line2], title_y, title_front, card_w, end_text, end_at,
//          points:[{t, x, y, img, off, label, side, cx?, cy?}]}  (cx,cy = where the card settles; default beside the finger)
//   x,y = fingertip (1080x1920); side = 'left'|'right' = which side of the finger the card sits
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, cfgFile, outDir, fontDir] = process.argv;
const C = JSON.parse(readFileSync(cfgFile, 'utf8'));
const FPS = C.fps || 30;
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
const cards = C.points.map((p) => 'data:image/png;base64,' + readFileSync(p.img).toString('base64'));
const html = `<style>
@font-face{font-family:P;font-weight:800;src:url(data:font/ttf;base64,${font('ExtraBold')})}
html,body{margin:0;width:1080px;height:1920px;background:transparent;overflow:hidden}</style>
<svg id="s" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg>
<script>
const C=${JSON.stringify(C)}, CARDS=${JSON.stringify(cards)};
const RED='#e8364f', GREEN='#1f9d6b', GOLD='#ffd45c', WHITE='#fff', INK='#3b0f3a';
const cl=x=>Math.max(0,Math.min(1,x)); const back=(x,c=1.8)=>{x=cl(x);return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
let seed=7; const rnd=()=>((seed=(seed*16807)%2147483647)/2147483647);
const flakes=[...Array(90)].map(()=>({x:rnd()*1080,y:rnd()*1920,r:2+rnd()*7,v:60+rnd()*160,s:rnd()*6,near:rnd()<.3}));
const defs='<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#1a0510" flood-opacity=".45"/></filter><filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
function lights(t){ // wire swagging across the top with twinkling bulbs
  let s='<path d="M-20 70 Q 270 170 540 80 T 1100 75" fill="none" stroke="#1b3d2a" stroke-width="5"/>';
  const cols=[RED,GOLD,GREEN,'#3fb8ff','#ff7ac0'];
  for(let i=0;i<16;i++){const u=i/15,x=-10+u*1110;const y=u<.5?70+Math.sin(u*2*Math.PI)*100*(1-2*Math.abs(u-.25)*2)+60*Math.sin(Math.PI*u*2):80+60*Math.sin(Math.PI*(u-.5)*2);
    const on=.55+.45*Math.sin(t*5+i*1.7); s+='<g filter="url(#gl)"><rect x="'+(x-6)+'" y="'+(y-4)+'" width="12" height="12" fill="#444"/><ellipse cx="'+x+'" cy="'+(y+20)+'" rx="12" ry="18" fill="'+cols[i%5]+'" opacity="'+on+'"/></g>'}
  return s}
function snow(t,near){let s='';for(const f of flakes){if(f.near!==near)continue;const y=(f.y+f.v*t)%1960-20,x=f.x+Math.sin(t*1.3+f.s)*20;s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+f.r+'" fill="#fff" opacity="'+(near?.9:.6)+'"/>'}return s}
function title(t){const k=back(t/.6);if(k<=0)return'';let s='<g transform="translate(540 '+(C.title_y||300)+') scale('+Math.max(.01,Math.min(1.05,k))+') rotate(-3)" filter="url(#sh)">';
  s+='<text x="0" y="0" text-anchor="middle" font-family="P" font-weight="800" font-size="62" fill="'+WHITE+'" stroke="'+INK+'" stroke-width="10" paint-order="stroke">'+esc(C.title[0])+'</text>';
  s+='<text x="0" y="112" text-anchor="middle" font-family="P" font-weight="800" font-size="118" fill="'+RED+'" stroke="'+WHITE+'" stroke-width="12" paint-order="stroke">'+esc(C.title[1])+'</text>';
  s+='<text x="'+(C.title[1].length*34+20)+'" y="40" font-size="80">🎄</text></g>';return s}
function burst(off,r){let p=[];for(let i=0;i<24;i++){const a=i*Math.PI/12,rr=i%2?r*.8:r;p.push((Math.cos(a)*rr).toFixed(1)+','+(Math.sin(a)*rr).toFixed(1))}
  return '<path d="M'+p.join(' L')+'Z" fill="'+RED+'" stroke="'+WHITE+'" stroke-width="7"/><text x="0" y="'+(r*.12)+'" text-anchor="middle" font-family="P" font-weight="800" font-size="'+r*.6+'" fill="#fff">'+esc(off)+'</text><text x="0" y="'+(r*.5)+'" text-anchor="middle" font-family="P" font-weight="800" font-size="'+r*.3+'" fill="'+GOLD+'">OFF</text>'}
function cardAt(p,i,t){const tt=t-p.t; if(tt<0)return''; const k=back(tt/.45);
  const W=C.card_w||330,H=W*p.h/p.w, dir=p.side==='left'?-1:1; const cx=p.cx??(p.x+dir*(W*.35)), cy=p.cy??Math.max(H/2+430,p.y-H*.35);
  // fly out from the fingertip, overshoot, settle with a little tilt and bob
  const x=p.x+(cx-p.x)*Math.min(1,k), y=p.y+(cy-p.y)*Math.min(1,k)+Math.sin(t*3+i)*6, sc=Math.max(.05,.2+.8*k), rot=dir*(6-6*Math.min(1,k))+dir*4;
  let s='<g transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+') rotate('+rot+') scale('+sc.toFixed(3)+')" filter="url(#sh)">';
  s+='<rect x="'+(-W/2-10)+'" y="'+(-H/2-60)+'" width="'+(W+20)+'" height="'+(H+70)+'" rx="26" fill="'+GREEN+'"/><text x="0" y="'+(-H/2-18)+'" text-anchor="middle" font-family="P" font-weight="800" font-size="34" fill="#fff">'+esc(p.label)+'</text>';
  s+='<image href="'+CARDS[i]+'" x="'+(-W/2)+'" y="'+(-H/2)+'" width="'+W+'" height="'+H+'"/>';
  const kb=back((tt-.3)/.35,2.4); if(kb>0)s+='<g transform="translate('+(dir*W*.42)+' '+(-H*.42)+') rotate('+(dir*12)+') scale('+Math.max(.01,kb)+')">'+burst(p.off,78)+'</g>';
  // sparkle burst at the fingertip as the card leaves it
  if(tt<.5){const r=30+tt*200;s='<g opacity="'+(1-tt*2)+'"><circle cx="'+p.x+'" cy="'+p.y+'" r="'+r+'" fill="none" stroke="'+GOLD+'" stroke-width="8"/></g>'+s}
  return s+'</g>'}
function ending(t){if(!C.end_text||t<C.end_at)return'';const k=back((t-C.end_at)/.35);const w=C.end_text.length*34+80;
  return '<g transform="translate(540 '+(C.end_y||1500)+') scale('+Math.max(.01,Math.min(1.08,k))+')" filter="url(#sh)"><rect x="'+(-w/2)+'" y="-58" width="'+w+'" height="116" rx="58" fill="'+RED+'" stroke="#fff" stroke-width="7"/><text x="0" y="20" text-anchor="middle" font-family="P" font-weight="800" font-size="58" fill="#fff">'+esc(C.end_text)+'</text></g>'}
window.frame=(t)=>{const behind=defs+snow(t,false)+lights(t)+(C.title_front?'':title(t)); let front=defs+(C.title_front?title(t):''); C.points.forEach((p,i)=>front+=cardAt(p,i,t)); front+=ending(t)+snow(t,true); return [behind,front]};
window.draw=(s)=>{document.getElementById('s').innerHTML=s};
</script>`;
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await pg.setContent(html); await pg.evaluate(() => document.fonts.ready);
for (const l of ['behind', 'front']) mkdirSync(path.join(outDir, l), { recursive: true });
const N = Math.ceil(C.duration * FPS);
for (let i = 0; i < N; i++) {
  const [bh, fr] = await pg.evaluate((t) => window.frame(t), i / FPS);
  for (const [l, s] of [['behind', bh], ['front', fr]]) { await pg.evaluate((x) => window.draw(x), s); await pg.screenshot({ path: path.join(outDir, l, String(i).padStart(5, '0') + '.png'), omitBackground: true }); }
}
await b.close(); console.log('xmas frames', N);
