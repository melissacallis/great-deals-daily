// "Dog chase" video frames: in a sunny backyard, a big deal card walks in from the left on kid legs and shoes, poses
// (% burst, shoe tap), then a dog bursts out of the doghouse barking; the card jumps ("!") and runs off to the left
// with the dog chasing it. Next card walks in. Writes 1080x1920 PNG frames + events.json for sounds.py.
// node chase.mjs <deals.json> <outDir> <fontDir> "<date>" "<title 1>" "<title 2>" "<outro line>"
// deals.json: [{rank, shoe: lightup|rainboots|dino|velcro|snowboots, pants, color, name, brand, price, list, off, img}]
// PREVIEW="2.1,5.3" renders only those moments (preview-<t>.png).
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, dealsFile, outDir, fontDir, dateLabel, t1 = '5 BEST DEALS', t2 = 'for KIDS 🧸', outroLine = "All 50 kids' deals 🧸"] = process.argv;
const base = path.dirname(dealsFile);
const deals = JSON.parse(readFileSync(dealsFile, 'utf8')).map((d) => ({ ...d, src: 'data:image/jpeg;base64,' + readFileSync(path.resolve(base, d.img)).toString('base64') }));
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
// timeline (seconds): enter walk, pose, dog appears, card startles, card runs, dog runs across
const FPS = 30, START = 1.2, ENTER = 1.5, DOG_AT = 1.0, STARTLE = 1.25, JUMP = 0.35, RUN = 0.8, DOG_V = 1000, CYCLE = 4.3;
const LAST = START + (deals.length - 1) * CYCLE, END_AT = LAST + ENTER + DOG_AT + 1.9, DURATION = END_AT + 3.4;
const html = `<!doctype html><style>
@font-face{font-family:P;font-weight:600;src:url(data:font/ttf;base64,${font('SemiBold')})}
@font-face{font-family:P;font-weight:800;src:url(data:font/ttf;base64,${font('ExtraBold')})}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#8fd3ff}</style>
<svg id="s" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"></svg>
<script>
const D=${JSON.stringify(deals)}, T=${JSON.stringify({ START, ENTER, DOG_AT, STARTLE, JUMP, RUN, DOG_V, CYCLE, END_AT })};
const DATE=${JSON.stringify(dateLabel)}, T1=${JSON.stringify(t1)}, T2=${JSON.stringify(t2)}, OUTRO=${JSON.stringify(outroLine)};
const INK='#3b0f3a', PINK='#ff3d7f', GOLD='#ffd45c', RED='#e8364f';
const cl=x=>Math.max(0,Math.min(1,x)), back=(x,c=1.7)=>{x=cl(x);return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const eOut=x=>1-Math.pow(1-cl(x),2.2), eIn=x=>Math.pow(cl(x),1.6);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const CW=740, CH=830, CY=470, LEG=128, GROUND=1612, OFF=540+CW/2+110;
const defs='<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#0b3a12" flood-opacity=".35"/></filter>'+
 '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ec4ff"/><stop offset="1" stop-color="#c9f0ff"/></linearGradient></defs>';
function yard(t){let s='<rect width="1080" height="1920" fill="url(#sky)"/>';
  s+='<circle cx="910" cy="190" r="90" fill="#ffe24d"/><circle cx="910" cy="190" r="125" fill="#ffe24d" opacity=".25"/>';
  for(const [x0,y,sc,v] of [[100,560,1,18],[620,700,.8,12],[300,820,.6,22]]){const x=((x0+t*v)%1400)-200;
    s+='<g transform="translate('+x.toFixed(1)+' '+y+') scale('+sc+')" fill="#fff" opacity=".95"><circle cx="0" cy="0" r="50"/><circle cx="55" cy="-20" r="62"/><circle cx="115" cy="0" r="48"/><rect x="0" y="0" width="115" height="48"/></g>'}
  // fence
  s+='<rect x="0" y="1180" width="1080" height="26" fill="#d9a066"/><rect x="0" y="1290" width="1080" height="26" fill="#d9a066"/>';
  for(let x=-10;x<1090;x+=78)s+='<path d="M'+x+' 1395 L'+x+' 1130 L'+(x+33)+' 1100 L'+(x+66)+' 1130 L'+(x+66)+' 1395 Z" fill="#f2c48d" stroke="#c48a52" stroke-width="4"/>';
  // lawn with mowing stripes
  s+='<rect x="0" y="1380" width="1080" height="540" fill="#5fc44a"/>';
  for(let k=0;k<6;k++)s+='<rect x="0" y="'+(1380+k*90)+'" width="1080" height="45" fill="#56b843"/>';
  // flowers and a bone
  for(const [x,y,c] of [[60,1440,'#ff7ac0'],[160,1820,'#ffd45c'],[1010,1460,'#ff7ac0'],[960,1860,'#fff'],[420,1880,'#ffd45c']])
    s+='<g transform="translate('+x+' '+y+')">'+[0,72,144,216,288].map(a=>'<circle cx="'+(Math.cos(a*Math.PI/180)*11).toFixed(1)+'" cy="'+(Math.sin(a*Math.PI/180)*11).toFixed(1)+'" r="9" fill="'+c+'"/>').join('')+'<circle r="7" fill="#ffb300"/></g>';
  s+='<g transform="translate(250 1700) rotate(-15)"><rect x="-38" y="-9" width="76" height="18" rx="9" fill="#fff"/><circle cx="-40" cy="-9" r="11" fill="#fff"/><circle cx="-40" cy="9" r="11" fill="#fff"/><circle cx="40" cy="-9" r="11" fill="#fff"/><circle cx="40" cy="9" r="11" fill="#fff"/></g>';
  return s}
function doghouse(){return '<g transform="translate(905 1420)"><path d="M-150 0 L0 -150 L150 0 Z" fill="#c62828" stroke="#7f1717" stroke-width="8" stroke-linejoin="round"/><rect x="-125" y="0" width="250" height="185" fill="#ef5350" stroke="#7f1717" stroke-width="8"/>'+
  '<path d="M-55 185 L-55 75 Q0 20 55 75 L55 185 Z" fill="#3b1a1a"/><rect x="-70" y="-62" width="140" height="44" rx="10" fill="#fff3e0" stroke="#7f1717" stroke-width="5"/><text y="-30" text-anchor="middle" font-family="P" font-weight="800" font-size="30" fill="#7f1717">WOOF</text></g>'}
function title(t){const k=back((t-.1)/.55); if(k<=0)return''; const sc=Math.max(.01,Math.min(1.05,k));
  return '<g transform="translate(540 290) rotate(-2) scale('+sc+')"><rect x="-450" y="-112" width="900" height="200" rx="26" fill="#8b5a2b" stroke="#5d3a17" stroke-width="10"/><circle cx="-420" cy="-82" r="9" fill="#5d3a17"/><circle cx="420" cy="-82" r="9" fill="#5d3a17"/>'+
   '<text y="6" text-anchor="middle" font-family="P" font-weight="800" font-size="104" fill="#fff" stroke="#5d3a17" stroke-width="8" paint-order="stroke">'+esc(T1)+'</text>'+
   '<text y="72" text-anchor="middle" font-family="P" font-weight="800" font-size="52" fill="'+GOLD+'">'+esc(T2)+'</text></g>'+
   '<g transform="translate(540 120) scale('+sc+')"><rect x="-160" y="-30" width="320" height="56" rx="28" fill="#fff"/><text y="10" text-anchor="middle" font-family="P" font-weight="800" font-size="30" fill="#2f6b1f">'+esc(DATE)+'</text></g>'}
function burst(txt,r){let p=[];for(let i=0;i<24;i++){const a=i*Math.PI/12,rr=i%2?r*.8:r;p.push((Math.cos(a)*rr).toFixed(1)+','+(Math.sin(a)*rr).toFixed(1))}
  return '<path d="M'+p.join(' L')+'Z" fill="'+RED+'" stroke="#fff" stroke-width="8"/><text y="'+(r*.1)+'" text-anchor="middle" font-family="P" font-weight="800" font-size="'+(r*.58)+'" fill="#fff">'+esc(txt)+'</text><text y="'+(r*.5)+'" text-anchor="middle" font-family="P" font-weight="800" font-size="'+(r*.3)+'" fill="'+GOLD+'">OFF</text>'}
// kid shoes at the ankle (0,0), toe pointing LEFT, sole near y=+36
function shoe(kind,t){switch(kind){
  case 'lightup': {const on=Math.floor(t*8)%3; const cols=['#ff3d7f','#39ff14','#2ec5ff'];
    return '<path d="M22 -4 Q34 0 32 22 L32 28 L-70 28 Q-86 26 -82 14 Q-76 2 -50 0 Q-26 -4 -8 -12 Z" fill="#fff" stroke="#999" stroke-width="3"/><path d="M-84 28 L34 28 L34 40 L-84 40 Q-88 34 -84 28 Z" fill="#eee"/>'+[0,1,2].map(i=>'<circle cx="'+(-66+i*36)+'" cy="34" r="7" fill="'+cols[(i+on)%3]+'"/>').join('')+'<path d="M-40 4 L-22 -4 M-30 9 L-12 1" stroke="#3a5bd9" stroke-width="4"/>'}
  case 'rainboots': return '<path d="M-24 -70 L24 -70 L28 22 L28 34 L-76 36 Q-92 34 -88 22 Q-80 10 -52 6 L-28 0 Z" fill="#ffd400" stroke="#c9a300" stroke-width="4"/><path d="M-90 36 L30 36 L30 46 L-90 46 Z" fill="#c9a300"/><circle cx="0" cy="-40" r="8" fill="#fff" opacity=".7"/><path d="M-24 -70 L24 -70 L24 -60 L-24 -60 Z" fill="#c9a300"/>';
  case 'dino': {let sp='';for(let i=0;i<4;i++)sp+='<path d="M'+(-50+i*20)+' -8 l10 -16 l10 16 Z" fill="#2e7d32"/>';
    return sp+'<path d="M30 -4 Q42 20 30 40 L-84 42 Q-106 36 -100 16 Q-92 -6 -60 -8 L10 -8 Z" fill="#66bb6a" stroke="#2e7d32" stroke-width="3"/><circle cx="-74" cy="6" r="7" fill="#fff"/><circle cx="-76" cy="6" r="3.5" fill="#111"/><path d="M-100 26 L-90 22 L-84 28 L-76 22 L-68 28" stroke="#fff" stroke-width="3" fill="none"/><rect x="-96" y="38" width="128" height="9" rx="4" fill="#2e7d32"/>'}
  case 'velcro': return '<path d="M22 -4 Q34 0 32 22 L32 30 L-74 30 Q-90 28 -86 16 Q-80 2 -52 0 Q-26 -4 -8 -12 Z" fill="#2ec5ff" stroke="#1565c0" stroke-width="3"/><rect x="-46" y="-6" width="56" height="12" rx="4" fill="#ffca28" transform="rotate(-14 -18 0)"/><rect x="-38" y="10" width="56" height="12" rx="4" fill="#ffca28" transform="rotate(-10 -10 16)"/><path d="M-88 30 L34 30 L34 42 L-88 42 Z" fill="#fff"/>';
  case 'snowboots': {let f='';for(let i=0;i<7;i++)f+='<circle cx="'+(-24+i*8)+'" cy="-66" r="11" fill="#fff"/>';
    return '<path d="M-26 -62 L26 -62 L30 22 L30 34 L-82 36 Q-98 34 -94 22 Q-86 8 -56 4 L-30 -2 Z" fill="#7e57c2" stroke="#4527a0" stroke-width="4"/>'+f+'<path d="M-96 36 L32 36 L32 50 L-96 50 Z" fill="#4527a0"/><path d="M-90 46 L-80 40 L-70 46 L-60 40 L-50 46 L-40 40 L-30 46 L-20 40 L-10 46 L0 40 L10 46 L20 40" stroke="#b39ddb" stroke-width="3" fill="none"/>'}
 } return ''}
function leg(hx,hy,a,b,kind,color,t){const r=Math.PI/180, kx=hx-Math.sin(a*r)*LEG, ky=hy+Math.cos(a*r)*LEG, sa=a-b, ax=kx-Math.sin(sa*r)*LEG, ay=ky+Math.cos(sa*r)*LEG;
  return '<path d="M'+hx.toFixed(1)+' '+hy.toFixed(1)+' L'+kx.toFixed(1)+' '+ky.toFixed(1)+' L'+ax.toFixed(1)+' '+ay.toFixed(1)+'" stroke="'+color+'" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'+
    '<g transform="translate('+ax.toFixed(1)+' '+ay.toFixed(1)+') rotate('+(sa*.35).toFixed(1)+')">'+shoe(kind,t)+'</g>'}
// card state: walking in (dir +1, to the right), posing, startled (jump), running away (dir -1, fast)
function stateOf(i,t){const t0=T.START+i*T.CYCLE, tH=t0+T.ENTER, tS=tH+T.STARTLE, tR=tS+T.JUMP, tE=tR+T.RUN;
  if(t<t0||t>tE)return null;
  if(t<tH){const q=eOut((t-t0)/T.ENTER); return {x:-OFF+(540+OFF)*q, mode:'walk', dir:1, dist:(540+OFF)*q}}
  if(t<tS)return {x:540, mode:'pose', hold:t-tH, dir:1};
  if(t<tR)return {x:540, mode:'jump', j:(t-tS)/T.JUMP, dir:-1};
  const q=eIn((t-tR)/T.RUN); return {x:540-(540+OFF)*q, mode:'run', dir:-1, dist:(540+OFF)*q}}
function card(i,st,t){const d=D[i]; let ph=0, amp=0, bob=0, tilt=0, lift=0, b1=0, b2=0, tap=0;
  if(st.mode==='walk'){ph=Math.PI*st.dist/150; amp=24; bob=-14*Math.abs(Math.cos(ph)); tilt=Math.sin(ph)*2}
  if(st.mode==='pose'){const h=st.hold; if(h<.3)amp=24*(1-h/.3); tilt=Math.sin(h*4)*1.2*Math.exp(-h); for(const t0 of [.5,.8]) if(h>t0&&h<t0+.22) tap=Math.sin((h-t0)/.22*Math.PI)*18}
  if(st.mode==='jump'){lift=Math.sin(Math.PI*st.j)*110; amp=0; tilt=-6*Math.sin(Math.PI*st.j)}
  if(st.mode==='run'){ph=Math.PI*st.dist/120; amp=40; bob=-24*Math.abs(Math.cos(ph)); tilt=-9}
  const a1=amp*Math.sin(ph); if(st.mode==='walk'||st.mode==='run'){b1=Math.max(0,Math.cos(ph))*(st.mode==='run'?60:32); b2=Math.max(0,-Math.cos(ph))*(st.mode==='run'?60:32)}
  const splay=st.mode==='jump'?Math.sin(Math.PI*st.j)*30:0;
  const cx=st.x, hipY=CY+CH+8+bob-lift;
  // legs are drawn walking left; mirror them when the card walks to the right
  let s='<g transform="translate('+cx+' 0) scale('+(st.dir>0?-1:1)+' 1) translate('+(-cx)+' 0)" filter="url(#sh)">'+leg(cx+95,hipY,-a1-splay,b2,d.shoe,d.pants,t)+leg(cx-95,hipY,a1+splay,b1+tap,d.shoe,d.pants,t)+'</g>';
  if(st.mode==='run'){for(let k=0;k<4;k++)s+='<line x1="'+(cx+CW/2+20+k*8)+'" y1="'+(CY+150+k*170)+'" x2="'+(cx+CW/2+110+k*20)+'" y2="'+(CY+150+k*170)+'" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".8"/>'}
  s+='<g transform="translate('+cx.toFixed(1)+' '+(CY+bob-lift).toFixed(1)+') rotate('+tilt.toFixed(2)+' 0 '+(CH/2)+')" filter="url(#sh)">';
  s+='<rect x="'+(-CW/2)+'" y="0" width="'+CW+'" height="'+CH+'" rx="44" fill="#fff" stroke="'+d.color+'" stroke-width="18"/>';
  s+='<rect x="'+(-CW/2+30)+'" y="30" width="'+(CW-60)+'" height="420" rx="28" fill="'+d.color+'22"/>';
  s+='<image href="'+d.src+'" x="'+(-CW/2+50)+'" y="42" width="'+(CW-100)+'" height="396" preserveAspectRatio="xMidYMid meet"/>';
  s+='<g transform="translate('+(-CW/2+40)+' 40)"><circle r="52" fill="'+d.color+'" stroke="#fff" stroke-width="8"/><text y="20" text-anchor="middle" font-family="P" font-weight="800" font-size="56" fill="#fff" stroke="'+INK+'" stroke-width="3" paint-order="stroke">#'+d.rank+'</text></g>';
  s+='<text x="0" y="518" text-anchor="middle" font-family="P" font-weight="800" font-size="'+Math.min(52,Math.floor(640/(.6*d.name.length)))+'" fill="'+INK+'">'+esc(d.name)+'</text>';
  s+='<text x="0" y="566" text-anchor="middle" font-family="P" font-weight="600" font-size="32" fill="#7a6a76">'+esc(d.brand)+'</text>';
  s+='<text x="-20" y="686" text-anchor="end" font-family="P" font-weight="800" font-size="100" fill="'+PINK+'">'+esc(d.price)+'</text>';
  s+='<text x="0" y="658" font-family="P" font-weight="600" font-size="40" fill="#9a8a96" text-decoration="line-through">'+esc(d.list||'')+'</text><text x="0" y="698" font-family="P" font-weight="600" font-size="28" fill="#9a8a96">list price</text>';
  const save=(parseFloat(String(d.list).replace(/[^0-9.]/g,''))-parseFloat(String(d.price).replace(/[^0-9.]/g,''))).toFixed(2);
  s+='<g transform="translate(0 768)"><rect x="-190" y="-38" width="380" height="68" rx="34" fill="#dff7ea"/><text y="10" text-anchor="middle" font-family="P" font-weight="800" font-size="36" fill="#11804f">You save $'+save+'</text></g>';
  const kb=st.mode==='walk'?0:st.mode==='pose'?back(st.hold/.4,2.2):1; if(kb>0)s+='<g transform="translate('+(CW/2-40)+' 40) rotate(12) scale('+Math.max(.01,kb).toFixed(3)+')">'+burst('-'+d.off+'%',94)+'</g>';
  s+='</g>';
  if(st.mode==='jump'||(st.mode==='run'&&st.dist<300)){const k=st.mode==='jump'?back(st.j/.5,2.5):1; // "!" and sweat drops
    s+='<g transform="translate('+(cx-CW/2+40)+' '+(CY-60-lift)+') rotate(-10) scale('+Math.max(.01,k).toFixed(2)+')"><circle r="62" fill="#fff" stroke="'+INK+'" stroke-width="7"/><text y="30" text-anchor="middle" font-family="P" font-weight="800" font-size="92" fill="'+RED+'">!</text></g>';
    for(const [dx,dy] of [[CW/2+10,40],[CW/2+50,110]])s+='<path d="M'+(cx+dx)+' '+(CY+dy-lift)+' q12 22 0 32 q-12 -10 0 -32 Z" fill="#7fd3ff" stroke="#fff" stroke-width="3"/>'}
  return s}
// the dog: side view facing left, galloping; mouth opens when barking
function dog(x,t,barking,sit){const SC=1.3, g=sit?0:Math.sin(t*22), y=GROUND-152*SC+(sit?0:-Math.abs(g)*14), tail=Math.sin(t*(sit?14:30))*22;
  const legs=sit?'<rect x="-70" y="80" width="30" height="70" rx="14" fill="#a0642d"/><rect x="-30" y="80" width="30" height="70" rx="14" fill="#8b5524"/><ellipse cx="80" cy="130" rx="70" ry="30" fill="#8b5524"/>'
    :[[-75,1],[-35,-1],[55,-1],[95,1]].map(([lx,sg])=>'<rect x="'+(lx-14)+'" y="60" width="28" height="92" rx="14" fill="'+(sg>0?'#a0642d':'#8b5524')+'" transform="rotate('+(sg*g*32).toFixed(1)+' '+lx+' 66)"/>').join('');
  const mouth=barking?'<path d="M-200 -20 L-150 -36 L-150 4 Z" fill="#7a1c1c"/><path d="M-196 -16 L-160 -26" stroke="#fff" stroke-width="5"/>':'<path d="M-196 -12 Q-172 0 -150 -10" stroke="#3b1a1a" stroke-width="5" fill="none"/>';
  return '<g transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+') scale('+SC+')" filter="url(#sh)">'+legs+
   '<path d="M110 0 Q'+(150+tail)+' -40 '+(170+tail)+' -70" stroke="#a0642d" stroke-width="20" stroke-linecap="round" fill="none"/>'+
   '<ellipse cx="20" cy="30" rx="130" ry="70" fill="#a0642d"/><ellipse cx="10" cy="48" rx="90" ry="40" fill="#e8c08f"/>'+
   '<rect x="-128" y="-22" width="40" height="22" rx="6" fill="'+RED+'" transform="rotate(-25 -108 -10)"/><circle cx="-112" cy="10" r="11" fill="'+GOLD+'"/>'+
   '<ellipse cx="-140" cy="-60" rx="72" ry="62" fill="#a0642d"/><ellipse cx="-190" cy="-30" rx="38" ry="28" fill="#e8c08f"/>'+mouth+
   '<ellipse cx="-222" cy="-48" rx="16" ry="12" fill="#2a1a10"/><circle cx="-160" cy="-82" r="12" fill="#fff"/><circle cx="-164" cy="-82" r="6" fill="#111"/>'+
   '<path d="M-110 -110 Q-70 -110 -80 '+(-40+(sit?0:g*14)).toFixed(1)+' Q-110 -60 -110 -110 Z" fill="#6b3f17"/></g>'}
function woof(x,y,k,flip){if(k<=0)return''; let p=[];for(let i=0;i<20;i++){const a=i*Math.PI/10,rr=i%2?70:100;p.push((Math.cos(a)*rr*1.5).toFixed(1)+','+(Math.sin(a)*rr).toFixed(1))}
  return '<g transform="translate('+x+' '+y+') rotate('+(flip?8:-8)+') scale('+(.72*Math.max(.01,Math.min(1.1,k))).toFixed(2)+')"><path d="M'+p.join(' L')+'Z" fill="#fff" stroke="'+INK+'" stroke-width="7"/><text y="20" text-anchor="middle" font-family="P" font-weight="800" font-size="60" fill="'+RED+'">WOOF!</text></g>'}
function dogLayer(t){let s='';
  for(let i=0;i<D.length;i++){const tD=T.START+i*T.CYCLE+T.ENTER+T.DOG_AT, x=1180-T.DOG_V*(t-tD);
    if(t<tD||x<-420)continue; const barkA=t-tD-.1, barkB=t-tD-.5, barking=(barkA>0&&barkA<.25)||(barkB>0&&barkB<.25);
    s+=dog(x,t,barking,false);
    if(barkA>0&&barkA<.6)s+=woof(958,GROUND-430,back(barkA/.2,2),false);
    if(barkB>0&&barkB<.6)s+=woof(948,GROUND-275,back(barkB/.2,2),true)}
  if(t>T.END_AT-.2){const k=eOut((t-T.END_AT+.2)/.8), x=1300-(1300-830)*k, sit=k>=1, bark=t-T.END_AT-1.0;
    s+=dog(x,t,bark>0&&bark<.3,sit); if(bark>0&&bark<.9)s+=woof(800,GROUND-420,back(bark/.2,2),false)}
  return s}
function outro(t){const k=back((t-T.END_AT)/.45); if(k<=0)return''; const sc=Math.max(.01,Math.min(1.06,k));
  return '<g transform="translate(540 820) scale('+sc+')" filter="url(#sh)"><rect x="-430" y="-250" width="860" height="500" rx="50" fill="#fff" stroke="#29b6f6" stroke-width="16"/>'+
   '<text y="-120" text-anchor="middle" font-family="P" font-weight="800" font-size="64" fill="'+INK+'">'+esc(OUTRO)+'</text>'+
   '<text y="-40" text-anchor="middle" font-family="P" font-weight="600" font-size="40" fill="#7a6a76">updated every hour</text>'+
   '<rect x="-270" y="20" width="540" height="120" rx="60" fill="'+PINK+'"/><text y="102" text-anchor="middle" font-family="P" font-weight="800" font-size="66" fill="#fff">LINK IN BIO</text>'+
   '<text y="205" text-anchor="middle" font-family="P" font-weight="600" font-size="30" fill="#9a8a96">Prices subject to change</text></g>'}
window.frame=(t)=>{let s=defs+yard(t)+doghouse()+title(t); const live=[]; for(let i=0;i<D.length;i++){const st=stateOf(i,t); if(st)live.push([i,st])}
  for(const [i,st] of live)s+=card(i,st,t); s+=dogLayer(t)+outro(t); document.getElementById('s').innerHTML=s;
  return live.map(([i,st])=>({i,mode:st.mode,dist:st.dist??0}))};
</script>`;

const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready); mkdirSync(outDir, { recursive: true });
if (process.env.PREVIEW) {
  for (const t of process.env.PREVIEW.split(',').map(Number)) { await p.evaluate((x) => window.frame(x), t); await p.screenshot({ path: path.join(outDir, `preview-${t}.png`) }); }
  await b.close(); process.exit(0);
}
const N = Math.ceil(DURATION * FPS), events = [{ t: 0.1, k: 'pop' }], last = {};
for (let i = 0; i < deals.length; i++) {
  const t0 = START + i * CYCLE, tH = t0 + ENTER, tD = tH + DOG_AT, tS = tH + STARTLE;
  events.push({ t: tH, k: 'pop' }, { t: tH + 0.05, k: 'ding' }, { t: tD + 0.1, k: 'bark' }, { t: tD + 0.5, k: 'bark' }, { t: tS, k: 'boing' }, { t: tS + JUMP, k: 'whoosh' });
  for (const h of [0.5, 0.8]) events.push({ t: tH + h + 0.11, k: 'step_' + deals[i].shoe });
}
events.push({ t: END_AT, k: 'pop' }, { t: END_AT + 0.05, k: 'ding' }, { t: END_AT + 1.0, k: 'bark' });
for (let f = 0; f < N; f++) {
  const t = f / FPS; const live = await p.evaluate((x) => window.frame(x), t);
  for (const c of live) { // a footstep each time a foot lands (faster while running)
    if (c.mode !== 'walk' && c.mode !== 'run') { last[c.i] = undefined; continue; }
    const n = Math.floor(c.dist / (c.mode === 'run' ? 120 : 150) - 0.5), key = c.i + c.mode;
    if (last[key] !== undefined && n > last[key]) events.push({ t, k: 'step_' + deals[c.i].shoe });
    last[key] = n;
  }
  await p.screenshot({ path: path.join(outDir, String(f).padStart(5, '0') + '.png') });
}
await b.close();
writeFileSync(path.join(outDir, 'events.json'), JSON.stringify({ duration: N / FPS, events: events.sort((a, b) => a.t - b.t) }));
console.log('chase frames', N, 'duration', (N / FPS).toFixed(2), 'events', events.length);
