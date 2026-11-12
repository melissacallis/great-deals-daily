// Christmas "point at the deals" layers for a short trend clip: twinkling light string, falling snow,
// a festive title (behind the owner), and deal cards that pop out at her pointing finger (in front).
// Writes behind/ and front/ PNG sequences for talk_fx.py.
// node xmas_point.mjs <config.json> <outDir> <fontDir>
// config: {duration, fps, title:[line1,line2], title_y, title_front, card_w, end_text, end_at,
//          deck:{t,x,y,w,h(=height/width),imgs:[...],fan_r,label,label_y} (cards gather, riffle-shuffle twice, then fan out),
//          title_until (title shrinks away at this time), cards fly into the deck when it starts,
//          slot:{t,pull,stops:[3],y,w,h,scale,title,items:[{img,price,off,label}x3],fill:[{img,price,off}...]} (slot machine),
//          note (small line under the end pill, e.g. 'Prices subject to change'), burst_side (true = % burst on the card's inner side, not its top corner),
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
const deckImgs = (C.deck?.imgs || []).map((f) => 'data:image/png;base64,' + readFileSync(f).toString('base64'));
const uri = (f) => `data:image/${f.endsWith('.png') ? 'png' : 'jpeg'};base64,` + readFileSync(f).toString('base64');
if (C.slot) for (const it of [...C.slot.items, ...C.slot.fill]) it.src = uri(it.img);
const html = `<style>
@font-face{font-family:P;font-weight:800;src:url(data:font/ttf;base64,${font('ExtraBold')})}
html,body{margin:0;width:1080px;height:1920px;background:transparent;overflow:hidden}</style>
<svg id="s" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg>
<script>
const C=${JSON.stringify(C)}, CARDS=${JSON.stringify(cards)}, DECK=${JSON.stringify(deckImgs)};
const RED='#e8364f', GREEN='#1f9d6b', GOLD='#ffd45c', WHITE='#fff', INK='#3b0f3a';
const cl=x=>Math.max(0,Math.min(1,x)); const back=(x,c=1.8)=>{x=cl(x);return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
let seed=7; const rnd=()=>((seed=(seed*16807)%2147483647)/2147483647);
const flakes=[...Array(90)].map(()=>({x:rnd()*1080,y:rnd()*1920,r:2+rnd()*7,v:60+rnd()*160,s:rnd()*6,near:rnd()<.3}));
const defs='<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#1a0510" flood-opacity=".45"/></filter><filter id="mb" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="0 14"/></filter><filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
function lights(t){ // wire swagging across the top with twinkling bulbs
  let s='<path d="M-20 70 Q 270 170 540 80 T 1100 75" fill="none" stroke="#1b3d2a" stroke-width="5"/>';
  const cols=[RED,GOLD,GREEN,'#3fb8ff','#ff7ac0'];
  for(let i=0;i<16;i++){const u=i/15,x=-10+u*1110;const y=u<.5?70+Math.sin(u*2*Math.PI)*100*(1-2*Math.abs(u-.25)*2)+60*Math.sin(Math.PI*u*2):80+60*Math.sin(Math.PI*(u-.5)*2);
    const on=.55+.45*Math.sin(t*5+i*1.7); s+='<g filter="url(#gl)"><rect x="'+(x-6)+'" y="'+(y-4)+'" width="12" height="12" fill="#444"/><ellipse cx="'+x+'" cy="'+(y+20)+'" rx="12" ry="18" fill="'+cols[i%5]+'" opacity="'+on+'"/></g>'}
  return s}
function snow(t,near){let s='';for(const f of flakes){if(f.near!==near)continue;const y=(f.y+f.v*t)%1960-20,x=f.x+Math.sin(t*1.3+f.s)*20;s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+f.r+'" fill="#fff" opacity="'+(near?.9:.6)+'"/>'}return s}
function title(t){const out=C.title_until?cl(1-(t-C.title_until)/.25):1;const k=back(t/.6)*out;if(k<=0||out<=0)return'';let s='<g transform="translate(540 '+(C.title_y||300)+') scale('+Math.max(.01,Math.min(1.05,k))+') rotate(-3)" filter="url(#sh)">';
  s+='<text x="0" y="0" text-anchor="middle" font-family="P" font-weight="800" font-size="62" fill="'+WHITE+'" stroke="'+INK+'" stroke-width="10" paint-order="stroke">'+esc(C.title[0])+'</text>';
  s+='<text x="0" y="112" text-anchor="middle" font-family="P" font-weight="800" font-size="118" fill="'+RED+'" stroke="'+WHITE+'" stroke-width="12" paint-order="stroke">'+esc(C.title[1])+'</text>';
  s+='<text x="'+(C.title[1].length*34+20)+'" y="40" font-size="80">🎄</text></g>';return s}
function burst(off,r){let p=[];for(let i=0;i<24;i++){const a=i*Math.PI/12,rr=i%2?r*.8:r;p.push((Math.cos(a)*rr).toFixed(1)+','+(Math.sin(a)*rr).toFixed(1))}
  return '<path d="M'+p.join(' L')+'Z" fill="'+RED+'" stroke="'+WHITE+'" stroke-width="7"/><text x="0" y="'+(r*.12)+'" text-anchor="middle" font-family="P" font-weight="800" font-size="'+r*.6+'" fill="#fff">'+esc(off)+'</text><text x="0" y="'+(r*.5)+'" text-anchor="middle" font-family="P" font-weight="800" font-size="'+r*.3+'" fill="'+GOLD+'">OFF</text>'}
function cardAt(p,i,t){const tt=t-p.t; if(tt<0)return''; const k=back(tt/.45);
  const W=C.card_w||330,H=W*p.h/p.w, dir=p.side==='left'?-1:1; const cx=p.cx??(p.x+dir*(W*.35)), cy=p.cy??Math.max(H/2+430,p.y-H*.35);
  // fly out from the fingertip, overshoot, settle with a little tilt and bob
  let x=p.x+(cx-p.x)*Math.min(1,k), y=p.y+(cy-p.y)*Math.min(1,k)+Math.sin(t*3+i)*6, sc=Math.max(.05,.2+.8*k), rot=dir*(6-6*Math.min(1,k))+dir*4;
  if(C.deck&&t>C.deck.t){const q=ease((t-C.deck.t-i*.06)/.4); if(q>=1)return''; x+=(C.deck.x-x)*q; y+=(C.deck.y-y)*q; sc*=1-.65*q}
  let s='<g transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+') rotate('+rot+') scale('+sc.toFixed(3)+')" filter="url(#sh)">';
  s+='<rect x="'+(-W/2-10)+'" y="'+(-H/2-60)+'" width="'+(W+20)+'" height="'+(H+70)+'" rx="26" fill="'+GREEN+'"/><text x="0" y="'+(-H/2-18)+'" text-anchor="middle" font-family="P" font-weight="800" font-size="34" fill="#fff">'+esc(p.label)+'</text>';
  s+='<image href="'+CARDS[i]+'" x="'+(-W/2)+'" y="'+(-H/2)+'" width="'+W+'" height="'+H+'"/>';
  const kb=back((tt-.3)/.35,2.4); if(kb>0)s+='<g transform="translate('+(dir*W*(C.burst_side?.5:.42))+' '+(C.burst_side?-H*.08:-H*.42)+') rotate('+(dir*12)+') scale('+Math.max(.01,kb)+')">'+burst(p.off,78)+'</g>';
  // sparkle burst at the fingertip as the card leaves it
  if(tt<.5){const r=30+tt*200;s='<g opacity="'+(1-tt*2)+'"><circle cx="'+p.x+'" cy="'+p.y+'" r="'+r+'" fill="none" stroke="'+GOLD+'" stroke-width="8"/></g>'+s}
  return s+'</g>'}
function ending(t){if(!C.end_text||t<C.end_at)return'';const k=back((t-C.end_at)/.35);const w=C.end_text.length*34+80;
  return '<g transform="translate(540 '+(C.end_y||1500)+') scale('+Math.max(.01,Math.min(1.08,k))+')" filter="url(#sh)"><rect x="'+(-w/2)+'" y="-58" width="'+w+'" height="116" rx="58" fill="'+RED+'" stroke="#fff" stroke-width="7"/><text x="0" y="20" text-anchor="middle" font-family="P" font-weight="800" font-size="58" fill="#fff">'+esc(C.end_text)+'</text>'+(C.note?'<text x="0" y="112" text-anchor="middle" font-family="P" font-weight="800" font-size="32" fill="#fff" stroke="'+INK+'" stroke-width="6" paint-order="stroke">'+esc(C.note)+'</text>':'')+'</g>'}
// deck shuffle: cards gather into a pile, split + riffle twice like a dealer, then fan out in an arc
const ease=x=>{x=cl(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};
function deck(t){const D=C.deck; if(!D||t<D.t)return''; const tt=t-D.t, N=DECK.length, W=D.w||230, H=W*(D.h||1.62), X=D.x, Y=D.y;
  const pile=j=>({x:X+(j-N/2)*1.2,y:Y-j*1.6,r:(j%3-1)*1.5,s:1});
  const split=(j,k)=>{const side=(j+k)%2?1:-1;return {x:X+side*(W*.62),y:Y-20-(j>>1)*2,r:side*13,s:.96}};
  const lerp=(a,b,k)=>({x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k,r:a.r+(b.r-a.r)*k,s:a.s+(b.s-a.s)*k});
  const fan=j=>{const a=(-48+96*j/(N-1))*Math.PI/180,R=D.fan_r||520,px=X,py=Y+R*.62;return {x:px+Math.sin(a)*R*.62,y:py-Math.cos(a)*R*.62-30,r:a*180/Math.PI,s:1}};
  const riffle=(j,k,t0)=>{const land=t0+.06*j, sp=split(j,k), pl=pile(j); if(tt<land)return sp; const q=ease((tt-land)/.16); const p=lerp(sp,pl,q); p.y-=Math.sin(q*Math.PI)*40; return p};
  let order=[...Array(N).keys()], out=[];
  for(const j of order){let p; const enter=.035*j;
    if(tt<.45){const q=back(cl((tt-enter)/.3),1.4); p=lerp({x:X+(j%2?1:-1)*80,y:Y+380,r:(j%2?1:-1)*30,s:.25},pile(j),q); if(tt<enter)continue}
    else if(tt<.7)p=lerp(pile(j),split(j,0),ease((tt-.45)/.25));
    else if(tt<1.55)p=riffle(j,0,.7);
    else if(tt<1.8)p=lerp(pile(j),split(j,1),ease((tt-1.55)/.25));
    else if(tt<2.65)p=riffle(j,1,1.8);
    else {const q=back(cl((tt-2.65-.025*j)/.45),1.2); p=lerp(pile(j),fan(j),q); p.y+=Math.sin(t*2.4+j*.5)*4*cl(tt-3.1)}
    out.push('<g transform="translate('+p.x.toFixed(1)+' '+p.y.toFixed(1)+') rotate('+p.r.toFixed(2)+') scale('+p.s.toFixed(3)+')" filter="url(#sh)"><rect x="'+(-W/2-5)+'" y="'+(-H/2-5)+'" width="'+(W+10)+'" height="'+(H+10)+'" rx="22" fill="#fff"/><image href="'+DECK[j]+'" x="'+(-W/2)+'" y="'+(-H/2)+'" width="'+W+'" height="'+H+'"/></g>')}
  let s=out.join('');
  if(D.label&&tt>2.9){const k=back((tt-2.9)/.4);s+='<g transform="translate('+X+' '+(D.label_y||Y-H*.95)+') scale('+Math.max(.01,Math.min(1.06,k))+') rotate(-3)" filter="url(#sh)"><text x="0" y="0" text-anchor="middle" font-family="P" font-weight="800" font-size="64" fill="'+GOLD+'" stroke="'+INK+'" stroke-width="12" paint-order="stroke">'+esc(D.label)+'</text></g>'}
  return s}
// slot machine: marquee with chasing bulbs, 3 reels that spin after the lever pull and land one by one on the deals,
// then JACKPOT with a coin burst. slot:{t, pull, stops:[3], y, title, items:[{img,price,off,label}x3], fill:[{img,price,off}...]}
function slot(t){const M=C.slot; if(!M||t<M.t)return''; const tin=t-M.t, X=540, W=M.w||940, H=M.h||600, Y=M.y||1000, k=back(tin/.45,1.6);
  const top=Y-H/2, rw=262, rh=318, gap=22, wy=top+150, ch=rh; const SC=M.scale||1; let s='<g transform="translate('+X+' '+Y+') scale('+(SC*Math.max(.01,Math.min(1.04,k))).toFixed(3)+') translate('+(-X)+' '+(-Y)+')" filter="url(#sh)">';
  // body
  s+='<rect x="'+(X-W/2)+'" y="'+top+'" width="'+W+'" height="'+H+'" rx="46" fill="'+RED+'" stroke="'+GOLD+'" stroke-width="12"/>';
  s+='<rect x="'+(X-W/2+26)+'" y="'+(top+22)+'" width="'+(W-52)+'" height="104" rx="30" fill="'+INK+'"/>';
  s+='<text x="'+X+'" y="'+(top+96)+'" text-anchor="middle" font-family="P" font-weight="800" font-size="62" fill="'+GOLD+'" stroke="#000" stroke-width="2">'+esc(M.title||'SPIN FOR HIS GIFT')+'</text>';
  // chasing bulbs around the edge (faster while spinning)
  const spinning=t>M.pull&&t<M.stops[2]+.2, per=2*(W+H)-120, nb=34, phase=Math.floor(t*(spinning?14:5));
  for(let b=0;b<nb;b++){let d=b*per/nb,bx,by;const w=W-60,h=H-60;
    if(d<w){bx=X-w/2+d;by=top+8}else if(d<w+h){bx=X+W/2-8;by=top+30+(d-w)}else if(d<2*w+h){bx=X+w/2-(d-w-h);by=top+H-8}else{bx=X-W/2+8;by=top+H-30-(d-2*w-h)}
    const on=(b+phase)%3===0; s+='<circle cx="'+bx.toFixed(1)+'" cy="'+by.toFixed(1)+'" r="9" fill="'+(on?'#fff6b0':'#b8860b')+'"'+(on?' filter="url(#gl)"':'')+'/>'}
  // reels
  const fill=M.fill, n=fill.length+1;
  for(let i=0;i<3;i++){const wx=X+(i-1)*(rw+gap)-rw/2, it=M.items[i];
    const strip=[...fill.slice(i*3),...fill.slice(0,i*3)]; strip.splice(4,0,it); // target sits at index 4
    const T0=M.pull, T1=M.stops[i], dur=T1-T0, F=(Math.round(13*dur/n)+1)*n+4; let p=0, fast=false;
    if(t>T0){const q=cl((t-T0)/dur); p=F*(1-Math.pow(1-q,3.2)); fast=q<.82; if(t>T1)p=F-Math.sin((t-T1)*22)*.07*Math.exp(-(t-T1)*9)}
    s+='<clipPath id="rc'+i+'"><rect x="'+wx+'" y="'+wy+'" width="'+rw+'" height="'+rh+'" rx="18"/></clipPath><rect x="'+wx+'" y="'+wy+'" width="'+rw+'" height="'+rh+'" rx="18" fill="#fff"/>';
    s+='<g clip-path="url(#rc'+i+')"'+(fast?' filter="url(#mb)"':'')+'>';
    for(let j=Math.floor(p)-1;j<=Math.floor(p)+1;j++){const c=strip[((j%n)+n)%n], cy=wy+(j-p)*ch;
      s+='<image href="'+c.src+'" x="'+(wx+16)+'" y="'+(cy+14)+'" width="'+(rw-32)+'" height="'+(rh-104)+'" preserveAspectRatio="xMidYMid meet"/>';
      s+='<text x="'+(wx+rw/2)+'" y="'+(cy+rh-30)+'" text-anchor="middle" font-family="P" font-weight="800" font-size="50" fill="'+RED+'">'+esc(c.price)+'</text>'}
    s+='</g>';
    const done=t>=T1, gk=done?back((t-T1)/.35,2):0;
    s+='<rect x="'+wx+'" y="'+wy+'" width="'+rw+'" height="'+rh+'" rx="18" fill="none" stroke="'+(done?GOLD:INK)+'" stroke-width="'+(done?12:8)+'"'+(done?' filter="url(#gl)"':'')+'/>';
    if(gk>0){s+='<g transform="translate('+(wx+rw-14)+' '+(wy+18)+') rotate(12) scale('+Math.max(.01,gk*.62).toFixed(3)+')">'+burst('-'+it.off+'%',78)+'</g>';
      s+='<g transform="translate('+(wx+rw/2)+' '+(top+H-42)+') scale('+Math.max(.01,Math.min(1,gk)).toFixed(3)+')"><rect x="-128" y="-34" width="256" height="62" rx="31" fill="'+GREEN+'" stroke="#fff" stroke-width="5"/><text x="0" y="12" text-anchor="middle" font-family="P" font-weight="800" font-size="'+(it.label.length>12?27:32)+'" fill="#fff">'+esc(it.label)+'</text></g>'}}
  // lever on the right side: knob comes down at the pull and springs back
  const lq=t<M.pull-.25?0:t<M.pull?ease((t-M.pull+.25)/.25):1-ease((t-M.pull)/.5), ang=lq*150;
  s+='<g transform="translate('+(X+W/2+8)+' '+(Y-10)+')"><rect x="-6" y="-26" width="34" height="80" rx="12" fill="'+INK+'"/><g transform="rotate('+(-ang*0+0)+')"><line x1="14" y1="10" x2="'+(14+Math.sin(ang*Math.PI/180)*0)+'" y2="'+(10-200*Math.cos(ang*Math.PI/180)).toFixed(1)+'" stroke="#d9d9d9" stroke-width="16" stroke-linecap="round"/><circle cx="14" cy="'+(10-200*Math.cos(ang*Math.PI/180)).toFixed(1)+'" r="34" fill="'+RED+'" stroke="#fff" stroke-width="7"/></g></g>';
  s+='</g>';
  // jackpot: banner + coins
  const J=M.stops[2]+.35; if(t>J){const top2=Y-H*SC/2;const tj=t-J, jk=back(tj/.4,2.2);
    let co=''; let sd=99; const r=()=>((sd=(sd*16807)%2147483647)/2147483647);
    for(let c=0;c<46;c++){const vx=(r()-.5)*1300, vy=-900-r()*900, g=1900, x=X+vx*tj, y=top2+60+vy*tj+g*tj*tj/2, sp=r()*10;
      if(y>2000)continue; co+='<ellipse cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" rx="'+(22*Math.abs(Math.cos(tj*sp+c))+3).toFixed(1)+'" ry="22" fill="'+GOLD+'" stroke="#b8860b" stroke-width="4"/>'}
    s+=co+'<g transform="translate('+X+' '+(top2-50)+') scale('+Math.max(.01,Math.min(1.08,jk)).toFixed(3)+') rotate(-4)" filter="url(#sh)"><text x="0" y="0" text-anchor="middle" font-family="P" font-weight="800" font-size="150" fill="'+GOLD+'" stroke="'+INK+'" stroke-width="16" paint-order="stroke">JACKPOT!</text></g>'}
  return s}
window.frame=(t)=>{const behind=defs+snow(t,false)+lights(t)+(C.title_front?'':title(t)); let front=defs+(C.title_front?title(t):''); C.points.forEach((p,i)=>front+=cardAt(p,i,t)); front+=deck(t)+slot(t)+ending(t)+snow(t,true); return [behind,front]};
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
