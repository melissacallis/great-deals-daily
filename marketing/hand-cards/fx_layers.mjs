// Renders the graphic layers for a talking video as two transparent PNG sequences per frame:
//   behind/  (drawn between the room and the owner: wall stickers, the price chart)
//   front/   (drawn over her: checklist, tags, call to action)
// node fx_layers.mjs <config.json> <outDir> <fontDir>
// config.fx: [{type, start, end, front?, ...}] (front: true draws a 'behind' effect over her) with types:
//   slap      {text, sub, x, y, stampX: true}       big sticker slaps on the wall, then a red X stamps it (behind)
//   notes     {items: [{text, at, x, y, rot, color}]} paper notes pinned on the wall one by one (behind)
//   chart     {x, y, w, h, good_until}              real-deal line drops (✓ ding), then a flat "fake" line (✗) (behind)
//   checklist {items: [text...], at: [t...], x, y}  panel whose items tick one by one (front)
//   tag       {text, x, y, color}                   small pill label (front)
//   cta       {text}                                big "LINK IN BIO" pill (front)
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, cfgFile, outDir, fontDir] = process.argv;
const C = JSON.parse(readFileSync(cfgFile, 'utf8'));
const FPS = C.fx_fps || 15, DUR = C.duration;
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
const html = `<style>
@font-face{font-family:P;font-weight:600;src:url(data:font/ttf;base64,${font('SemiBold')})}
@font-face{font-family:P;font-weight:800;src:url(data:font/ttf;base64,${font('ExtraBold')})}
html,body{margin:0;width:1080px;height:1920px;background:transparent;overflow:hidden}</style>
<svg id="s" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"></svg>
<script>
const PINK='#ff3d7f', INK='#3b0f3a', SUN='#ffd45c', MINT='#1fc79a', RED='#e8364f', CREAM='#fffaf0';
const esc=(s)=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const cl=(x)=>Math.max(0,Math.min(1,x)); const ease=(x)=>1-Math.pow(1-cl(x),3);
const back=(x,c=1.7)=>{x=cl(x);return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const shadow='<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#2a0a20" flood-opacity=".35"/></filter><filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
function burst(r){let p=[];for(let i=0;i<24;i++){const a=i*Math.PI/12,rr=i%2?r*.8:r;p.push((Math.cos(a)*rr).toFixed(1)+','+(Math.sin(a)*rr).toFixed(1))}return 'M'+p.join(' L')+'Z'}
function xmark(cx,cy,r,p){const a=Math.min(1,p*2),b=Math.max(0,p*2-1);return '<g stroke="'+RED+'" stroke-width="'+r*.22+'" stroke-linecap="round" filter="url(#sh)"><line x1="'+(cx-r)+'" y1="'+(cy-r)+'" x2="'+(cx-r+2*r*a)+'" y2="'+(cy-r+2*r*a)+'"/>'+(b>0?'<line x1="'+(cx+r)+'" y1="'+(cy-r)+'" x2="'+(cx+r-2*r*b)+'" y2="'+(cy-r+2*r*b)+'"/>':'')+'</g>'}
function tick(cx,cy,r,p,color){const pts=[[cx-r,cy],[cx-r*.3,cy+r*.7],[cx+r,cy-r*.8]];const L1=Math.hypot(pts[1][0]-pts[0][0],pts[1][1]-pts[0][1]),L2=Math.hypot(pts[2][0]-pts[1][0],pts[2][1]-pts[1][1]);const d='M'+pts.map(q=>q.join(',')).join(' L');return '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+r*.35+'" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="'+(L1+L2)+'" stroke-dashoffset="'+((L1+L2)*(1-cl(p)))+'"/>'}
const R={
 slap(f,t){const k=back((t-f.start)/.35,2.2);if(k<=0)return['',''];const s=Math.max(.01,1.6-.6*Math.min(1,k)+(k>1?(k-1)*.3:0));let g='<g transform="translate('+f.x+' '+f.y+') rotate(-8) scale('+s+')" filter="url(#sh)"><path d="'+burst(170)+'" fill="'+PINK+'" stroke="#fff" stroke-width="10"/><text x="0" y="10" text-anchor="middle" font-family="P" font-weight="800" font-size="104" fill="#fff">'+esc(f.text)+'</text><text x="0" y="78" text-anchor="middle" font-family="P" font-weight="800" font-size="44" fill="'+SUN+'">'+esc(f.sub||'SALE')+'</text></g>';
   if(f.stampX&&t>f.start+.9)g+=xmark(f.x,f.y,150,(t-f.start-.9)/.35);return[g,'']},
 notes(f,t){let g='';for(const n of f.items){const k=back((t-n.at)/.3,2);if(k<=0)continue;const s=Math.max(.01,1.4-.4*Math.min(1,k));const w=Math.max(230,n.text.length*30+60);
   g+='<g transform="translate('+n.x+' '+n.y+') rotate('+(n.rot||0)+') scale('+s+')" filter="url(#sh)"><rect x="'+(-w/2)+'" y="-62" width="'+w+'" height="124" rx="10" fill="'+(n.color||CREAM)+'"/><rect x="-60" y="-80" width="120" height="34" fill="rgba(255,248,220,.85)" transform="rotate(-4)"/><text x="0" y="16" text-anchor="middle" font-family="P" font-weight="800" font-size="46" fill="'+INK+'">'+esc(n.text)+'</text></g>'}return[g,'']},
 chart(f,t){const tt=t-f.start, X=f.x,Y=f.y,W=f.w,H=f.h; const a=ease(tt/.4); let g='<g opacity="'+a+'" filter="url(#sh)"><rect x="'+X+'" y="'+Y+'" width="'+W+'" height="'+H+'" rx="26" fill="rgba(25,10,30,.72)"/>';
   for(let i=1;i<4;i++)g+='<line x1="'+(X+30)+'" x2="'+(X+W-30)+'" y1="'+(Y+H*i/4)+'" y2="'+(Y+H*i/4)+'" stroke="rgba(255,255,255,.12)" stroke-width="2"/>';
   const good=tt<f.good_until-f.start; const ph=good?tt-.4:tt-(f.good_until-f.start); const p=cl(ph/1.6);
   const pts=good?[[0,.35],[.15,.32],[.3,.36],[.45,.33],[.6,.35],[.72,.34],[.85,.7],[1,.78]]:[[0,.5],[.15,.48],[.3,.51],[.45,.49],[.6,.5],[.75,.49],[.9,.5],[1,.5]];
   const P=pts.map(([u,v])=>[X+40+u*(W-80),Y+30+v*(H-60)]); let len=0;const seg=[];for(let i=1;i<P.length;i++){const l=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);seg.push(l);len+=l}
   const color=good?MINT:RED; g+='<path d="M'+P.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' L')+'" fill="none" stroke="'+color+'" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" stroke-dasharray="'+len+'" stroke-dashoffset="'+(len*(1-p))+'"/>';
   g+='<text x="'+(X+34)+'" y="'+(Y+58)+'" font-family="P" font-weight="800" font-size="40" fill="#fff">'+(good?'REAL DEAL':'FAKE "SALE"')+'</text>';
   g+='<text x="'+(X+34)+'" y="'+(Y+H-26)+'" font-family="P" font-weight="600" font-size="30" fill="rgba(255,255,255,.75)">'+(good?'price drops below its usual price':'"sale" price = the usual price')+'</text>';
   if(p>=1){const e=P[P.length-1];const k=back((ph-1.6)/.3);if(k>0)g+=good?'<g transform="translate('+(e[0]-10)+' '+(e[1]-70)+') scale('+Math.max(.01,k)+')"><circle r="46" fill="'+MINT+'"/>'+tick(0,0,26,1,'#fff')+'</g>':xmark(e[0]-10,e[1]-70,36,cl((ph-1.6)/.3))}
   return[g+'</g>','']},
 checklist(f,t){const a=back((t-f.start)/.4); if(a<=0)return['',''];const W=600,H=110+f.items.length*96; let g='<g transform="translate('+f.x+' '+f.y+') scale('+Math.max(.01,Math.min(1,a))+')" filter="url(#sh)"><rect x="'+(-W/2)+'" y="'+(-H/2)+'" width="'+W+'" height="'+H+'" rx="30" fill="#fff"/><text x="'+(-W/2+34)+'" y="'+(-H/2+70)+'" font-family="P" font-weight="800" font-size="40" fill="'+INK+'">'+esc(f.title||'Before I post a deal:')+'</text>';
   f.items.forEach((it,i)=>{const y=-H/2+150+i*96, p=(t-f.at[i])/.35; g+='<rect x="'+(-W/2+34)+'" y="'+(y-34)+'" width="62" height="62" rx="16" fill="'+(p>0?MINT:'#f3e6ee')+'"/>'+(p>0?tick(-W/2+65,y-3,20,p,'#fff'):'')+'<text x="'+(-W/2+120)+'" y="'+(y+12)+'" font-family="P" font-weight="800" font-size="36" fill="'+(p>0?INK:'#b39aaa')+'">'+esc(it)+'</text>'});
   return['',g+'</g>']},
 tag(f,t){const k=back((t-f.start)/.3);if(k<=0)return['',''];const w=f.text.length*25+70;return['','<g transform="translate('+f.x+' '+f.y+') scale('+Math.max(.01,Math.min(1.05,k))+')" filter="url(#sh)"><rect x="'+(-w/2)+'" y="-40" width="'+w+'" height="80" rx="40" fill="'+(f.color||INK)+'"/><text x="0" y="14" text-anchor="middle" font-family="P" font-weight="800" font-size="40" fill="'+SUN+'">'+esc(f.text)+'</text></g>']},
 cta(f,t){const k=back((t-f.start)/.4);if(k<=0)return['',''];const w=f.text.length*36+90;return['','<g transform="translate(540 '+(f.y||1420)+') scale('+Math.max(.01,Math.min(1.08,k))+')" filter="url(#sh)"><rect x="'+(-w/2)+'" y="-62" width="'+w+'" height="124" rx="62" fill="'+PINK+'" stroke="#fff" stroke-width="7"/><text x="0" y="22" text-anchor="middle" font-family="P" font-weight="800" font-size="62" fill="#fff">'+esc(f.text)+'</text></g>']},
};
window.render=(fx,t)=>{let b='',fr='';for(const f of fx){if(t<f.start-.01||t>f.end)continue;const [x,y]=R[f.type](f,t);if(f.front){fr+=x+y}else{b+=x;fr+=y}}return[b,fr]};  // f.front: draw a wall effect over her instead
window.draw=(s)=>{document.getElementById('s').innerHTML=shadow+s};
</script>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
for (const layer of ['behind', 'front']) mkdirSync(path.join(outDir, layer), { recursive: true });
const N = Math.ceil(DUR * FPS);
for (let i = 0; i < N; i++) {
  const t = i / FPS;
  const [bh, fr] = await p.evaluate(([fx, tt]) => window.render(fx, tt), [C.fx, t]);
  for (const [layer, svg] of [['behind', bh], ['front', fr]]) {
    await p.evaluate((s) => window.draw(s), svg);
    await p.screenshot({ path: path.join(outDir, layer, String(i).padStart(5, '0') + '.png'), omitBackground: true });
  }
}
await b.close(); console.log('fx frames', N);
