// "Claw machine" deal video: an arcade claw machine full of prize capsules (product photos inside). Each round the
// claw slides over, drops, grabs a capsule, carries it to the chute and drops it; the prize pops out of the PRIZE
// door as a big deal card (label, price, % burst). Action starts on frame 1 (the claw is already moving).
// Writes 1080x1920 PNG frames + events.json for sounds.py.
// node claw.mjs <claw.json> <outDir> <fontDir> "<date>" "<hook line>" "<outro line>"
// claw.json: {prizes:[{name,label,color,brand,price,list,off,img} x3], fill:[{img} x6]}   PREVIEW="1.2,3.4" for stills
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, cfgFile, outDir, fontDir, dateLabel, hook = '3 GIFTS UNDER $10 🕹️', outroLine = 'All 50 deals for her, him & kids 🎁'] = process.argv;
const base = path.dirname(cfgFile);
const cfg = JSON.parse(readFileSync(cfgFile, 'utf8'));
const uri = (f) => 'data:image/jpeg;base64,' + readFileSync(path.resolve(base, f)).toString('base64');
for (const p of [...cfg.prizes, ...cfg.fill]) p.src = uri(p.img);
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
const FPS = 30, R0 = 0.2, ROUND = 7.2, END_AT = R0 + cfg.prizes.length * ROUND - 0.1, DURATION = END_AT + 3.2;
// round timeline (seconds after the round starts)
const TL = { move: [0, 1.4], press: 1.4, down: [1.45, 2.4], grab: [2.4, 2.7], up: [2.7, 3.6], back: [3.6, 4.7], open: 4.75, fall: [4.8, 5.15], pop: 5.2, show: [5.2, 5.7], leave: [6.95, 7.3] };
const html = `<!doctype html><style>
@font-face{font-family:P;font-weight:600;src:url(data:font/ttf;base64,${font('SemiBold')})}
@font-face{font-family:P;font-weight:800;src:url(data:font/ttf;base64,${font('ExtraBold')})}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#160a26}</style>
<svg id="s" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"></svg>
<script>
const C=${JSON.stringify(cfg)}, TL=${JSON.stringify(TL)}, R0=${R0}, ROUND=${ROUND}, END_AT=${END_AT};
const DATE=${JSON.stringify(dateLabel)}, HOOK=${JSON.stringify(hook)}, OUTRO=${JSON.stringify(outroLine)};
const INK='#3b0f3a', PINK='#ff3d7f', GOLD='#ffd45c', RED='#e8364f';
const cl=x=>Math.max(0,Math.min(1,x)), back=(x,c=1.7)=>{x=cl(x);return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const ease=x=>{x=cl(x);return x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2}, eIn=x=>Math.pow(cl(x),2);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
// machine geometry
const MX0=120, MX1=960, GX0=170, GX1=910, GY0=430, GY1=1230, RAIL=455, REST=600, CHUTE=262, CAPR=84;
const PILE=[[600,842],[764,842],[518,994],[682,994],[842,994],[440,1144],[602,1144],[764,1144]];
const TARGET=[0,1,2]; // pile slots of the 3 prizes (one per round)
const defs='<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#000" flood-opacity=".5"/></filter>'+
 '<filter id="gl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>'+
 '<linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4fa0"/><stop offset="1" stop-color="#b3127a"/></linearGradient>'+
 '<linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1446"/><stop offset="1" stop-color="#4a1f6e"/></linearGradient>'+
 '<clipPath id="glassclip"><rect x="'+GX0+'" y="'+GY0+'" width="'+(GX1-GX0)+'" height="'+(GY1-GY0)+'"/></clipPath></defs>';
let sd=3; const rnd=()=>((sd=(sd*16807)%2147483647)/2147483647);
const dots=[...Array(40)].map(()=>({x:rnd()*1080,y:rnd()*1920,r:1.5+rnd()*3,p:rnd()*6}));
function room(t){let s='<rect width="1080" height="1920" fill="#160a26"/>';
  for(const d of dots)s+='<circle cx="'+d.x+'" cy="'+d.y+'" r="'+d.r+'" fill="#fff" opacity="'+(.2+.6*Math.abs(Math.sin(t*2+d.p))).toFixed(2)+'"/>';
  for(let k=0;k<8;k++){const y=1680+Math.pow(k/7,1.5)*240; s+='<line x1="0" y1="'+y+'" x2="1080" y2="'+y+'" stroke="#ff2e88" stroke-opacity=".35" stroke-width="3"/>'}
  for(let k=-6;k<=6;k++)s+='<line x1="'+(540+k*40)+'" y1="1680" x2="'+(540+k*220)+'" y2="1920" stroke="#2ec5ff" stroke-opacity=".3" stroke-width="3"/>';
  return s}
function header(t){const k=back((t+.25)/.5); const sc=Math.max(.01,Math.min(1.04,k));
  return '<g transform="translate(540 112) scale('+sc+')"><rect x="-470" y="-62" width="940" height="112" rx="30" fill="'+PINK+'"/>'+
   '<text y="22" text-anchor="middle" font-family="P" font-weight="800" font-size="64" fill="#fff">'+esc(HOOK)+'</text></g>'+
   '<g transform="translate(540 200)"><rect x="-130" y="-24" width="260" height="46" rx="23" fill="#fff"/><text y="9" text-anchor="middle" font-family="P" font-weight="800" font-size="26" fill="'+INK+'">'+esc(DATE)+'</text></g>'}
function capsule(x,y,src,rot,hl){return '<g transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+') rotate('+rot.toFixed(1)+')">'+
  '<clipPath id="cc'+Math.round(x)+'_'+Math.round(y)+'"><circle r="'+(CAPR-8)+'"/></clipPath>'+
  '<circle r="'+CAPR+'" fill="#fff" stroke="'+(hl||'#ffd45c')+'" stroke-width="8"/>'+
  '<image href="'+src+'" x="'+(-CAPR+12)+'" y="'+(-CAPR+12)+'" width="'+(2*CAPR-24)+'" height="'+(2*CAPR-24)+'" preserveAspectRatio="xMidYMid meet" clip-path="url(#cc'+Math.round(x)+'_'+Math.round(y)+')"/>'+
  '<path d="M'+(-CAPR+4)+' 0 A'+(CAPR-4)+' '+(CAPR-4)+' 0 0 1 '+(CAPR-4)+' 0" fill="'+(hl||'#ff4fa0')+'" opacity=".28"/>'+
  '<ellipse cx="-24" cy="-34" rx="20" ry="10" fill="#fff" opacity=".8" transform="rotate(-30 -24 -34)"/></g>'}
// where is the claw and what is it holding at time t
function clawState(t){const r=Math.floor((t-R0)/ROUND), u=t-R0-r*ROUND;
  if(r<0)return {x:CHUTE,y:REST,open:1,hold:-1,r:-1,u:0};
  if(r>=C.prizes.length)return {x:CHUTE,y:REST,open:1,hold:-1,r,u};
  const [px,py]=PILE[TARGET[r]], low=py-CAPR-58;
  if(u<TL.move[1])return {x:CHUTE+(px-CHUTE)*ease(u/TL.move[1]),y:REST,open:1,hold:-1,r,u,moving:true};
  if(u<TL.down[0])return {x:px,y:REST,open:1,hold:-1,r,u};
  if(u<TL.down[1])return {x:px,y:REST+(low-REST)*ease((u-TL.down[0])/(TL.down[1]-TL.down[0])),open:1,hold:-1,r,u};
  if(u<TL.grab[1])return {x:px,y:low,open:1-cl((u-TL.grab[0])/(TL.grab[1]-TL.grab[0])),hold:-1,r,u};
  const sway=Math.sin((u-TL.up[0])*9)*6*Math.exp(-(u-TL.up[0])*1.5);
  if(u<TL.up[1])return {x:px+sway,y:low+(REST-low)*ease((u-TL.up[0])/(TL.up[1]-TL.up[0])),open:0,hold:r,r,u};
  if(u<TL.back[1])return {x:px+(CHUTE-px)*ease((u-TL.back[0])/(TL.back[1]-TL.back[0]))+sway,y:REST,open:0,hold:r,r,u,moving:true};
  if(u<TL.open)return {x:CHUTE,y:REST,open:0,hold:r,r,u};
  return {x:CHUTE,y:REST,open:cl((u-TL.open)/.2),hold:-1,r,u}}
function claw(st){const {x,y,open}=st; let s='<line x1="'+x+'" y1="'+RAIL+'" x2="'+x+'" y2="'+y+'" stroke="#d9d9e6" stroke-width="6"/>';
  s+='<rect x="'+(x-46)+'" y="'+(RAIL-22)+'" width="92" height="40" rx="10" fill="#9aa0b5" stroke="#5d6278" stroke-width="4"/>';
  const a=10+open*28; // prong spread (deg)
  for(const sg of [-1,1]){s+='<path d="M'+x+' '+(y+10)+' q'+(sg*Math.sin(a*Math.PI/180)*70).toFixed(1)+' 40 '+(sg*(Math.sin(a*Math.PI/180)*60+6)).toFixed(1)+' 92 q'+(-sg*14)+' 14 '+(-sg*30)+' 4" stroke="#c7ccdb" stroke-width="13" fill="none" stroke-linecap="round"/>'}
  s+='<path d="M'+x+' '+(y+10)+' L'+x+' '+(y+92)+' q-6 10 -14 8" stroke="#c7ccdb" stroke-width="12" fill="none" stroke-linecap="round" opacity="'+(.6+.4*(1-open))+'"/>';
  s+='<circle cx="'+x+'" cy="'+y+'" r="28" fill="#9aa0b5" stroke="#5d6278" stroke-width="5"/><circle cx="'+x+'" cy="'+y+'" r="9" fill="'+GOLD+'"/>';
  return s}
function machine(t,st){let s='<rect x="'+(MX0-10)+'" y="230" width="'+(MX1-MX0+20)+'" height="1440" rx="50" fill="#ff2e88" opacity=".35" filter="url(#gl)"/>';
  s+='<rect x="'+MX0+'" y="240" width="'+(MX1-MX0)+'" height="1420" rx="44" fill="url(#body)" stroke="'+GOLD+'" stroke-width="10"/>';
  s+='<rect x="'+(MX0+30)+'" y="262" width="'+(MX1-MX0-60)+'" height="140" rx="26" fill="#1b0b2e"/>';
  s+='<text x="540" y="356" text-anchor="middle" font-family="P" font-weight="800" font-size="84" fill="'+GOLD+'" stroke="#ff2e88" stroke-width="3">GRAB A DEAL</text>';
  const phase=Math.floor(t*(st.moving?12:5));
  for(let b=0;b<22;b++){const x=MX0+40+b*(MX1-MX0-80)/21, on=(b+phase)%3===0; s+='<circle cx="'+x.toFixed(1)+'" cy="414" r="8" fill="'+(on?'#fff6b0':'#b8860b')+'"/>'}
  s+='<rect x="'+GX0+'" y="'+GY0+'" width="'+(GX1-GX0)+'" height="'+(GY1-GY0)+'" rx="10" fill="url(#glass)" stroke="#ffd1e8" stroke-width="6"/>';
  // chute walls
  s+='<rect x="'+(GX0+8)+'" y="1010" width="168" height="'+(GY1-1010)+'" fill="#ffffff" opacity=".08" stroke="#ffd1e8" stroke-width="5"/><text x="'+(GX0+92)+'" y="1000" text-anchor="middle" font-family="P" font-weight="800" font-size="26" fill="'+GOLD+'">DROP ↓</text>';
  s+='<line x1="'+(GX0+20)+'" y1="'+RAIL+'" x2="'+(GX1-20)+'" y2="'+RAIL+'" stroke="#5d6278" stroke-width="12" stroke-linecap="round"/>';
  return s}
function pile(t,st){let s=''; const gone=new Set();
  for(let r=0;r<C.prizes.length;r++){const g=R0+r*ROUND+TL.grab[1]; if(t>=g)gone.add(TARGET[r])}
  PILE.forEach(([x,y],i)=>{ if(gone.has(i))return; const ti=TARGET.indexOf(i), src=ti>=0?C.prizes[ti].src:C.fill[(i-3)%C.fill.length].src;
    const jig=st.r>=0&&st.u>TL.grab[0]&&st.u<TL.up[0]+.3?Math.sin(t*40+i)*1.5:0; s+=capsule(x+jig,y,src,(i*37)%30-15,ti>=0?C.prizes[ti].color:null)});
  if(st.hold>=0)s+=capsule(st.x,st.y+CAPR+58,C.prizes[st.hold].src,0,C.prizes[st.hold].color);
  // a capsule falling down the chute
  for(let r=0;r<C.prizes.length;r++){const u=t-R0-r*ROUND; if(u>TL.fall[0]&&u<TL.fall[1]+.05){const q=eIn((u-TL.fall[0])/(TL.fall[1]-TL.fall[0])); s+=capsule(CHUTE,REST+CAPR+58+(1300-REST)*q,C.prizes[r].src,q*120,C.prizes[r].color)}}
  return s}
function panel(t,st){let s='<rect x="'+(MX0+20)+'" y="1250" width="'+(MX1-MX0-40)+'" height="390" rx="30" fill="#7a0c55"/>';
  const glow=st.r>=0&&st.u>TL.pop-.1&&st.u<TL.pop+.6;
  s+='<rect x="'+(GX0+8)+'" y="1300" width="170" height="210" rx="18" fill="#1b0b2e" stroke="'+(glow?GOLD:'#ffd1e8')+'" stroke-width="'+(glow?10:5)+'"/><text x="'+(GX0+93)+'" y="1550" text-anchor="middle" font-family="P" font-weight="800" font-size="34" fill="'+GOLD+'">PRIZE</text>';
  const tilt=st.moving?(st.u<TL.move[1]?22:-22):0; // joystick leans the way the claw moves
  s+='<g transform="translate(640 1450)"><ellipse rx="70" ry="24" fill="#1b0b2e"/><g transform="rotate('+tilt+')"><rect x="-9" y="-120" width="18" height="120" rx="9" fill="#cfd3e0"/><circle cy="-128" r="34" fill="'+RED+'" stroke="#fff" stroke-width="5"/></g></g>';
  const pressed=st.r>=0&&st.u>TL.press&&st.u<TL.press+.25;
  s+='<g transform="translate(830 1440)"><ellipse cy="14" rx="74" ry="30" fill="#1b0b2e"/><ellipse cy="'+(pressed?8:-4)+'" rx="64" ry="34" fill="'+GOLD+'" stroke="#fff" stroke-width="5"/><text y="'+(pressed?18:6)+'" text-anchor="middle" font-family="P" font-weight="800" font-size="24" fill="'+INK+'">GRAB</text></g>';
  s+='<text x="540" y="1610" text-anchor="middle" font-family="P" font-weight="800" font-size="30" fill="#ffd1e8" opacity=".85">INSERT COIN · 1 PLAY</text>';
  return s}
function burst(txt,r){let p=[];for(let i=0;i<24;i++){const a=i*Math.PI/12,rr=i%2?r*.8:r;p.push((Math.cos(a)*rr).toFixed(1)+','+(Math.sin(a)*rr).toFixed(1))}
  return '<path d="M'+p.join(' L')+'Z" fill="'+RED+'" stroke="#fff" stroke-width="8"/><text y="'+(r*.1)+'" text-anchor="middle" font-family="P" font-weight="800" font-size="'+(r*.58)+'" fill="#fff">'+esc(txt)+'</text><text y="'+(r*.5)+'" text-anchor="middle" font-family="P" font-weight="800" font-size="'+(r*.3)+'" fill="'+GOLD+'">OFF</text>'}
function bigCard(t){let s='';
  for(let r=0;r<C.prizes.length;r++){const u=t-R0-r*ROUND; if(u<TL.pop||u>TL.leave[1])continue; const d=C.prizes[r];
    const q=ease((u-TL.show[0])/(TL.show[1]-TL.show[0])), lv=eIn((u-TL.leave[0])/(TL.leave[1]-TL.leave[0]));
    const x=GX0+93+(540-GX0-93)*q+lv*900, y=1405+(930-1405)*q, sc=.14+.86*Math.min(1,back((u-TL.show[0])/(TL.show[1]-TL.show[0]),1.4)), rot=(1-q)*-12+lv*20;
    const W=720, H=800; s+='<g transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+') rotate('+rot.toFixed(1)+') scale('+sc.toFixed(3)+')" filter="url(#sh)">';
    s+='<rect x="'+(-W/2)+'" y="'+(-H/2)+'" width="'+W+'" height="'+H+'" rx="44" fill="#fff" stroke="'+d.color+'" stroke-width="18"/>';
    s+='<g transform="translate(0 '+(-H/2-10)+')"><rect x="-200" y="-44" width="400" height="80" rx="40" fill="'+d.color+'" stroke="#fff" stroke-width="6"/><text y="14" text-anchor="middle" font-family="P" font-weight="800" font-size="44" fill="#fff">'+esc(d.label)+'</text></g>';
    s+='<rect x="'+(-W/2+30)+'" y="'+(-H/2+50)+'" width="'+(W-60)+'" height="400" rx="28" fill="'+d.color+'22"/><image href="'+d.src+'" x="'+(-W/2+50)+'" y="'+(-H/2+60)+'" width="'+(W-100)+'" height="380" preserveAspectRatio="xMidYMid meet"/>';
    s+='<text y="'+(-H/2+530)+'" text-anchor="middle" font-family="P" font-weight="800" font-size="'+Math.min(54,Math.floor(620/(.6*d.name.length)))+'" fill="'+INK+'">'+esc(d.name)+'</text>';
    s+='<text y="'+(-H/2+578)+'" text-anchor="middle" font-family="P" font-weight="600" font-size="32" fill="#7a6a76">'+esc(d.brand)+'</text>';
    s+='<text x="-20" y="'+(-H/2+690)+'" text-anchor="end" font-family="P" font-weight="800" font-size="104" fill="'+PINK+'">'+esc(d.price)+'</text>';
    s+='<text x="0" y="'+(-H/2+660)+'" font-family="P" font-weight="600" font-size="40" fill="#9a8a96" text-decoration="line-through">'+esc(d.list)+'</text><text x="0" y="'+(-H/2+700)+'" font-family="P" font-weight="600" font-size="28" fill="#9a8a96">list price</text>';
    const save=(parseFloat(String(d.list).replace(/[^0-9.]/g,''))-parseFloat(String(d.price).replace(/[^0-9.]/g,''))).toFixed(2);
    s+='<g transform="translate(0 '+(-H/2+760)+')"><rect x="-190" y="-36" width="380" height="64" rx="32" fill="#dff7ea"/><text y="10" text-anchor="middle" font-family="P" font-weight="800" font-size="34" fill="#11804f">You save $'+save+'</text></g>';
    const kb=back((u-TL.show[1])/.35,2.2); if(kb>0)s+='<g transform="translate('+(W/2-40)+' '+(-H/2+50)+') rotate(12) scale('+Math.max(.01,kb).toFixed(3)+')">'+burst('-'+d.off+'%',96)+'</g>';
    s+='</g>';
    // confetti when the prize pops out
    if(u<TL.pop+1.4){const tc=u-TL.pop; let co=''; let z=r*7+1; const rr=()=>((z=(z*16807)%2147483647)/2147483647);
      for(let c=0;c<40;c++){const vx=(rr()-.5)*1100, vy=-700-rr()*900, cx=GX0+93+vx*tc, cy=1405+vy*tc+1500*tc*tc; if(cy>1950)continue;
        co+='<rect x="'+cx.toFixed(0)+'" y="'+cy.toFixed(0)+'" width="16" height="9" fill="'+['#ffd45c','#ff3d7f','#2ec5ff','#7cdb3a','#fff'][c%5]+'" transform="rotate('+(c*37+tc*500).toFixed(0)+' '+cx.toFixed(0)+' '+cy.toFixed(0)+')"/>'}
      s=co+s}}
  return s}
function outro(t){const k=back((t-END_AT)/.45); if(k<=0)return''; const sc=Math.max(.01,Math.min(1.06,k));
  return '<g transform="translate(540 900) scale('+sc+')" filter="url(#sh)"><rect x="-450" y="-260" width="900" height="520" rx="50" fill="#fff" stroke="'+GOLD+'" stroke-width="16"/>'+
   '<text y="-130" text-anchor="middle" font-family="P" font-weight="800" font-size="'+Math.min(60,Math.floor(1500/OUTRO.length))+'" fill="'+INK+'">'+esc(OUTRO)+'</text>'+
   '<text y="-50" text-anchor="middle" font-family="P" font-weight="600" font-size="40" fill="#7a6a76">updated every hour</text>'+
   '<rect x="-270" y="10" width="540" height="120" rx="60" fill="'+PINK+'"/><text y="92" text-anchor="middle" font-family="P" font-weight="800" font-size="66" fill="#fff">LINK IN BIO</text>'+
   '<text y="200" text-anchor="middle" font-family="P" font-weight="600" font-size="30" fill="#9a8a96">Prices subject to change</text></g>'}
window.frame=(t)=>{const st=clawState(t); let s=defs+room(t)+machine(t,st)+'<g clip-path="url(#glassclip)">'+pile(t,st)+claw(st)+'</g>'+panel(t,st)+header(t)+bigCard(t)+outro(t);
  document.getElementById('s').innerHTML=s; return st};
</script>`;

const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready); mkdirSync(outDir, { recursive: true });
if (process.env.PREVIEW) {
  for (const t of process.env.PREVIEW.split(',').map(Number)) { await p.evaluate((x) => window.frame(x), t); await p.screenshot({ path: path.join(outDir, `preview-${t}.png`) }); }
  await b.close(); process.exit(0);
}
const N = Math.ceil(DURATION * FPS), events = [{ t: 0, k: 'pop' }];
for (let r = 0; r < cfg.prizes.length; r++) {
  const s = R0 + r * ROUND;
  events.push({ t: s, k: 'whir', d: TL.move[1] }, { t: s + TL.press, k: 'click' }, { t: s + TL.down[0], k: 'lower', d: TL.down[1] - TL.down[0] },
    { t: s + TL.grab[0] + 0.15, k: 'clank' }, { t: s + TL.up[0], k: 'lower', d: TL.up[1] - TL.up[0] }, { t: s + TL.back[0], k: 'whir', d: TL.back[1] - TL.back[0] },
    { t: s + TL.open, k: 'click' }, { t: s + TL.fall[1], k: 'thud' }, { t: s + TL.pop, k: 'prize' }, { t: s + TL.show[1], k: 'pop' }, { t: s + TL.show[1] + 0.05, k: 'ding' }, { t: s + TL.leave[0], k: 'whoosh' });
}
events.push({ t: END_AT, k: 'pop' }, { t: END_AT + 0.05, k: 'ding' });
for (let f = 0; f < N; f++) { await p.evaluate((x) => window.frame(x), f / FPS); await p.screenshot({ path: path.join(outDir, String(f).padStart(5, '0') + '.png') }); }
await b.close();
writeFileSync(path.join(outDir, 'events.json'), JSON.stringify({ duration: N / FPS, events: events.sort((a, b) => a.t - b.t) }));
console.log('claw frames', N, 'duration', (N / FPS).toFixed(2));
