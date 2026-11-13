// "Deals runway" video frames: big deal cards on cartoon legs walk in from the right, stop in the middle (pose,
// % burst, shoe tap), then walk off to the left as the next card walks in. Each card wears different shoes.
// Writes 1080x1920 PNG frames + events.json (footsteps/taps/pops with times) for the sound mix.
// node runway.mjs <deals.json> <outDir> <fontDir> <logo.svg> "<date label>" "<title line 1>" "<title line 2>"
// deals.json: [{rank, shoe, name, brand, price, list, off, img, color?}]  shoes: flats|heels|slippers|sneakers|boots|cleats|hightops|dress|workboots|skate
// OUTRO="All 50 deals for him 🤘" (last screen). THEME=punk: night football field with neon spray paint (default: pink fashion runway)
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, dealsFile, outDir, fontDir, logoFile, dateLabel, t1 = '5 BEST DEALS', t2 = 'for her 💝'] = process.argv;
const base = path.dirname(dealsFile);
const deals = JSON.parse(readFileSync(dealsFile, 'utf8')).map((d) => ({ ...d, src: 'data:image/jpeg;base64,' + readFileSync(path.resolve(base, d.img)).toString('base64') }));
const font = (w) => readFileSync(path.join(fontDir, `Poppins-${w}.ttf`)).toString('base64');
const logo = readFileSync(logoFile).toString('base64');
const FPS = 30, ENTER = 1.5, HOLD = 1.9, EXIT = 1.5, NEXT = 0.9, START = 1.4, CYCLE = ENTER + HOLD + NEXT;
const END_AT = START + (deals.length - 1) * CYCLE + ENTER + HOLD + EXIT - 0.4, DURATION = END_AT + 3.2;

const html = `<!doctype html><style>
@font-face{font-family:P;font-weight:600;src:url(data:font/ttf;base64,${font('SemiBold')})}
@font-face{font-family:P;font-weight:800;src:url(data:font/ttf;base64,${font('ExtraBold')})}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#2a0a2e}</style>
<svg id="s" width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"></svg>
<script>
const D=${JSON.stringify(deals)}, T=${JSON.stringify({ START, ENTER, HOLD, EXIT, NEXT, CYCLE, END_AT })};
const THEME=${JSON.stringify(process.env.THEME || 'runway')}, OUTRO=${JSON.stringify(process.env.OUTRO || 'All 50 deals for her 💝')}, LOGO='data:image/svg+xml;base64,${logo}', DATE=${JSON.stringify(dateLabel)}, T1=${JSON.stringify(t1)}, T2=${JSON.stringify(t2)};
const INK='#3b0f3a', PINK='#ff3d7f', GOLD='#ffd45c', RED='#e8364f';
const cl=x=>Math.max(0,Math.min(1,x)), back=(x,c=1.7)=>{x=cl(x);return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const eOut=x=>1-Math.pow(1-cl(x),2.2), eIn=x=>Math.pow(cl(x),1.8);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const CW=760, CH=850, CY=455, LEG=135, STRIDE=150;
const defs='<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="12" flood-color="#14001a" flood-opacity=".45"/></filter>'+
 '<radialGradient id="spot" cx="50%" cy="0%" r="100%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'+
 '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3d7f"/><stop offset=".55" stop-color="#b3127a"/><stop offset="1" stop-color="#3b0f3a"/></linearGradient>'+
 '<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd1e3"/><stop offset="1" stop-color="#ff8fbf"/></linearGradient></defs>';
let seed=11; const rnd=()=>((seed=(seed*16807)%2147483647)/2147483647);
const stars=[...Array(36)].map(()=>({x:rnd()*1080,y:rnd()*1350,r:2+rnd()*4,p:rnd()*6}));
function stage(t){let s='<rect width="1080" height="1920" fill="url(#bg)"/>';
  for(const st of stars){const o=.25+.75*Math.abs(Math.sin(t*2+st.p)); s+='<circle cx="'+st.x+'" cy="'+st.y+'" r="'+st.r+'" fill="#fff" opacity="'+o.toFixed(2)+'"/>'}
  // spotlights swaying
  for(const [x0,ph] of [[180,0],[900,2]]){const sw=Math.sin(t*.8+ph)*90; s+='<path d="M'+x0+' -20 L'+(540+sw-260)+' 1650 L'+(540+sw+260)+' 1650 Z" fill="url(#spot)" opacity=".35"/>'}
  // runway floor in perspective + light strips
  s+='<path d="M330 1330 L750 1330 L1080 1920 L0 1920 Z" fill="url(#floor)"/>';
  for(let k=0;k<7;k++){const y=1330+Math.pow(k/6,1.6)*590, w=210+(y-1330)*.92; s+='<line x1="'+(540-w)+'" y1="'+y+'" x2="'+(540+w)+'" y2="'+y+'" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>'}
  for(let k=0;k<9;k++){const u=k/8, y=1345+Math.pow(u,1.4)*560, x=540-(220+(y-1330)*.92)+6, on=Math.sin(t*6-k)>0; s+='<circle cx="'+x+'" cy="'+y+'" r="7" fill="'+(on?GOLD:'#fff')+'"/><circle cx="'+(1080-x)+'" cy="'+y+'" r="7" fill="'+(on?GOLD:'#fff')+'"/>'}
  return s}

function punkField(t){let s='<rect width="1080" height="1920" fill="#0d0716"/>';
  // stadium light towers that flicker
  for(const [x,ph] of [[120,0],[960,1.7]]){const fl=.55+.45*(Math.sin(t*23+ph)>-.85?1:.2);
    s+='<path d="M'+x+' 520 L'+(x-8)+' 860 L'+(x+8)+' 860 Z" fill="#2a2338"/><rect x="'+(x-70)+'" y="470" width="140" height="56" rx="8" fill="#2a2338"/>';
    for(let k=0;k<8;k++)s+='<circle cx="'+(x-55+k*16)+'" cy="498" r="7" fill="#fffbe0" opacity="'+fl.toFixed(2)+'"/>';
    s+='<path d="M'+x+' 500 L'+(540+(x-540)*.1-420)+' 1920 L'+(540+(x-540)*.1+420)+' 1920 Z" fill="#fffbe0" opacity="'+(.07*fl).toFixed(3)+'"/>'}
  // the field in perspective (vanishing point above the middle)
  const top=820, vx=540; s+='<path d="M'+(vx-430)+' '+top+' L'+(vx+430)+' '+top+' L1500 1920 L-420 1920 Z" fill="#1c6b2f"/>';
  for(let k=-6;k<=6;k++){const xt=vx+k*72, xb=vx+k*330; if(k%2===0)s+='<path d="M'+xt+' '+top+' L'+(xt+72)+' '+top+' L'+(xb+330)+' 1920 L'+xb+' 1920 Z" fill="#17592a"/>';
    s+='<line x1="'+xt+'" y1="'+top+'" x2="'+xb+'" y2="1920" stroke="#e9ffe9" stroke-opacity=".75" stroke-width="'+(k===0?9:5)+'" stroke-dasharray="'+(k===0?'':'60 14')+'"/>'}
  // spray-painted yard numbers + scribbles
  const nums=[['30',-2],['40',-1],['50',0],['40',1],['30',2]];
  for(const [n,k] of nums){const y=1100, x=vx+k*72*2.55+36; s+='<text x="'+x+'" y="'+y+'" text-anchor="middle" font-family="P" font-weight="800" font-size="70" fill="none" stroke="#ff2e88" stroke-width="6" transform="rotate('+(k*4)+' '+x+' '+y+')" opacity=".9">'+n+'</text>'}
  let sd=5; const r=()=>((sd=(sd*16807)%2147483647)/2147483647);
  for(let c=0;c<14;c++){const x=r()*1080, y=840+r()*1050, col=['#39ff14','#ff2e88','#2ec5ff','#ffe600'][c%4];
    for(let j=0;j<9;j++)s+='<circle cx="'+(x+(r()-.5)*90).toFixed(0)+'" cy="'+(y+(r()-.5)*60).toFixed(0)+'" r="'+(2+r()*9).toFixed(1)+'" fill="'+col+'" opacity=".75"/>'}
  s+='<path d="M60 1450 L170 1560 M170 1450 L60 1560" stroke="#39ff14" stroke-width="12" stroke-linecap="round" opacity=".8"/><path d="M900 1700 L1010 1810 M1010 1700 L900 1810" stroke="#ff2e88" stroke-width="12" stroke-linecap="round" opacity=".8"/>';
  // neon stars in the sky
  for(let k=0;k<10;k++){const x=60+r()*960, y=60+r()*360, o=.4+.6*Math.abs(Math.sin(t*3+k)); s+='<path d="M'+x+' '+(y-14)+' L'+(x+4)+' '+(y-4)+' L'+(x+14)+' '+y+' L'+(x+4)+' '+(y+4)+' L'+x+' '+(y+14)+' L'+(x-4)+' '+(y+4)+' L'+(x-14)+' '+y+' L'+(x-4)+' '+(y-4)+' Z" fill="none" stroke="'+(k%2?'#39ff14':'#ff2e88')+'" stroke-width="3" opacity="'+o.toFixed(2)+'"/>'}
  return s}
function punkTitle(t){const k=back((t-.1)/.55); if(k<=0)return''; const sc=Math.max(.01,Math.min(1.05,k)), j=Math.sin(t*30)>.92?4:0;
  const tape=(w,h,c)=>{let p='M'+(-w/2)+' '+(-h/2);for(let x=-w/2;x<=w/2;x+=24)p+=' L'+x+' '+(-h/2+(x/24%2?6:-4));for(let x=w/2;x>=-w/2;x-=24)p+=' L'+x+' '+(h/2+(x/24%2?-5:5));return '<path d="'+p+'Z" fill="'+c+'"/>'};
  return '<g transform="translate(540 285) rotate(-3) scale('+sc+')">'+tape(900,150,'#111')+
   '<text x="'+(6+j)+'" y="46" text-anchor="middle" font-family="P" font-weight="800" font-size="118" fill="#ff2e88">'+esc(T1)+'</text>'+
   '<text x="'+j+'" y="40" text-anchor="middle" font-family="P" font-weight="800" font-size="118" fill="#39ff14">'+esc(T1)+'</text></g>'+
   '<g transform="translate(540 405) rotate(2) scale('+sc+')">'+tape(420,84,'#ff2e88')+'<text y="22" text-anchor="middle" font-family="P" font-weight="800" font-size="60" fill="#111">'+esc(T2)+'</text></g>'+
   '<g transform="translate(540 125) rotate(-2) scale('+sc+')">'+tape(330,58,'#ffe600')+'<text y="11" text-anchor="middle" font-family="P" font-weight="800" font-size="30" fill="#111">'+esc(DATE)+'</text></g>'}
function title(t){const k=back((t-.1)/.55); if(k<=0)return''; const sc=Math.max(.01,Math.min(1.05,k));
  return '<g transform="translate(540 300) scale('+sc+')">'+
   '<text x="0" y="0" text-anchor="middle" font-family="P" font-weight="800" font-size="108" fill="#fff" stroke="'+INK+'" stroke-width="12" paint-order="stroke">'+esc(T1)+'</text>'+
   '<text x="0" y="78" text-anchor="middle" font-family="P" font-weight="800" font-size="60" fill="'+GOLD+'" stroke="'+INK+'" stroke-width="10" paint-order="stroke">'+esc(T2)+'</text>'+
   '<rect x="-140" y="-118" width="280" height="0" fill="none"/></g>'+
   '<g transform="translate(540 125) scale('+sc+')"><rect x="-165" y="-30" width="330" height="56" rx="28" fill="'+INK+'"/><text x="0" y="10" text-anchor="middle" font-family="P" font-weight="800" font-size="30" fill="'+GOLD+'">'+esc(DATE)+'</text></g>'}
function burst(txt,r){let p=[];for(let i=0;i<24;i++){const a=i*Math.PI/12,rr=i%2?r*.8:r;p.push((Math.cos(a)*rr).toFixed(1)+','+(Math.sin(a)*rr).toFixed(1))}
  return '<path d="M'+p.join(' L')+'Z" fill="'+RED+'" stroke="#fff" stroke-width="8"/><text x="0" y="'+(r*.1)+'" text-anchor="middle" font-family="P" font-weight="800" font-size="'+(r*.58)+'" fill="#fff">'+esc(txt)+'</text><text x="0" y="'+(r*.5)+'" text-anchor="middle" font-family="P" font-weight="800" font-size="'+(r*.3)+'" fill="'+GOLD+'">OFF</text>'}
// shoes: drawn at the ankle (0,0), toe pointing left (walking direction), sole at about y=+40
function shoe(kind,lift){switch(kind){
  case 'heels': return '<path d="M18 -6 Q30 -8 32 6 L30 26 L24 26 Q4 30 -20 40 Q-60 52 -84 50 Q-96 48 -88 38 Q-60 28 -30 16 Q-6 4 0 -6 Z" fill="'+RED+'" stroke="#7a0a1c" stroke-width="3"/><path d="M24 24 L30 24 L28 66 L25 66 Z" fill="#7a0a1c"/>';
  case 'flats': return '<path d="M20 2 Q34 4 32 22 Q30 40 10 42 L-60 42 Q-86 40 -84 26 Q-80 12 -50 10 Q-20 8 0 0 Z" fill="#ff9ec4" stroke="#d9487f" stroke-width="3"/><path d="M-78 40 L28 40" stroke="#d9487f" stroke-width="5"/><g transform="translate(-48 14)"><path d="M0 0 L-16 -9 L-16 9 Z M0 0 L16 -9 L16 9 Z" fill="'+INK+'"/><circle r="5" fill="'+INK+'"/></g>';
  case 'slippers': {let f='';for(let i=0;i<9;i++)f+='<circle cx="'+(-78+i*13)+'" cy="'+(8-Math.sin(i/8*Math.PI)*10)+'" r="13" fill="#fff6e6"/>';
    return '<path d="M30 0 Q40 20 30 40 L-80 44 Q-100 38 -96 20 Q-90 2 -60 0 Z" fill="#f5e6c8" stroke="#d8c39a" stroke-width="3"/>'+f+'<circle cx="-86" cy="6" r="15" fill="'+PINK+'"/><rect x="-94" y="38" width="128" height="10" rx="5" fill="#d8c39a"/>'}
  case 'sneakers': return '<path d="M26 -4 Q38 0 36 26 L36 34 L-78 34 Q-96 32 -92 18 Q-86 6 -56 2 Q-30 -2 -10 -12 Q8 -16 26 -4 Z" fill="#fff" stroke="#bbb" stroke-width="3"/><rect x="-96" y="32" width="134" height="14" rx="7" fill="'+PINK+'"/><path d="M-40 4 L-20 -6 M-30 8 L-10 -2 M-20 12 L0 2" stroke="'+INK+'" stroke-width="4"/><path d="M-60 22 Q-20 10 20 22" stroke="'+PINK+'" stroke-width="6" fill="none"/>';
  case 'boots': return '<path d="M-22 -70 L26 -70 L30 24 L26 30 Q0 34 -30 40 Q-70 50 -96 44 Q-104 36 -92 30 Q-60 24 -34 10 Z" fill="#8b5a2b" stroke="#4e2f12" stroke-width="4"/><path d="M-14 -60 Q2 -40 -10 -20 M10 -60 Q-4 -40 10 -20" stroke="#e8c38f" stroke-width="3" fill="none"/><rect x="12" y="24" width="20" height="24" fill="#4e2f12"/><path d="M-96 46 L14 34" stroke="#4e2f12" stroke-width="6"/>';

  case 'cleats': {let st='';for(let k=0;k<5;k++)st+='<path d="M'+(-80+k*24)+' 40 l6 12 l6 -12 Z" fill="#ddd"/>';
    return '<path d="M26 -6 Q38 0 36 26 L36 38 L-84 38 Q-98 34 -92 20 Q-84 6 -54 2 Q-26 -4 -6 -14 Q12 -18 26 -6 Z" fill="#141414" stroke="#39ff14" stroke-width="3"/>'+st+'<path d="M-52 18 L-30 4 L-34 16 L-10 2" stroke="#39ff14" stroke-width="6" fill="none" stroke-linejoin="round"/>'}
  case 'hightops': return '<path d="M-24 -66 L26 -66 L34 24 L36 34 L-82 34 Q-98 30 -92 16 Q-84 4 -54 0 L-30 -6 Z" fill="#e8364f" stroke="#7a0a1c" stroke-width="3"/><path d="M-96 32 L40 32 L40 44 L-96 44 Q-100 38 -96 32 Z" fill="#fff"/><path d="M-90 30 Q-80 6 -56 4 L-60 30 Z" fill="#fff"/><path d="M-20 -56 L8 -56 M-20 -40 L8 -40 M-20 -24 L8 -24 M-20 -8 L8 -8" stroke="#fff" stroke-width="5"/><circle cx="18" cy="-30" r="10" fill="#fff"/><text x="18" y="-25" text-anchor="middle" font-size="14" font-family="P" font-weight="800" fill="#e8364f">★</text>';
  case 'dress': return '<path d="M22 -2 Q34 2 32 24 L30 34 L-80 36 Q-100 34 -96 22 Q-88 10 -58 6 Q-28 2 -6 -8 Z" fill="#0b0b0b"/><path d="M-76 14 Q-60 8 -40 10" stroke="#fff" stroke-opacity=".7" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-30 0 L-12 -8 M-26 6 L-8 -2" stroke="#444" stroke-width="3"/><rect x="14" y="30" width="20" height="10" fill="#3a2a1a"/><path d="M-96 38 L14 38" stroke="#3a2a1a" stroke-width="5"/>';
  case 'workboots': return '<path d="M-22 -72 L26 -72 L30 22 L32 34 L-84 36 Q-102 34 -96 20 Q-88 6 -56 4 L-28 -2 Z" fill="#c99a4b" stroke="#6b4a1c" stroke-width="4"/><path d="M-98 36 L36 36 L36 48 L-98 48 Z" fill="#3a2a1a"/><path d="M-18 -60 L8 -60 M-18 -44 L8 -44 M-18 -28 L8 -28 M-18 -12 L8 -12" stroke="#6b4a1c" stroke-width="4"/><path d="M-22 -72 L26 -72 L26 -62 L-22 -62 Z" fill="#8b5a2b"/>';
  case 'skate': {let ch='';for(let x=-80;x<26;x+=13)for(let y=-6;y<28;y+=13)if(((x+80)/13+(y+6)/13)%2<1)ch+='<rect x="'+x+'" y="'+y+'" width="13" height="13" fill="#111"/>';
    return '<clipPath id="skc"><path d="M24 -8 Q34 0 32 28 L-84 30 Q-98 26 -92 14 Q-84 2 -50 -2 Q-20 -6 0 -12 Z"/></clipPath><path d="M24 -8 Q34 0 32 28 L-84 30 Q-98 26 -92 14 Q-84 2 -50 -2 Q-20 -6 0 -12 Z" fill="#fff"/><g clip-path="url(#skc)">'+ch+'</g><path d="M24 -8 Q34 0 32 28 L-84 30 Q-98 26 -92 14 Q-84 2 -50 -2 Q-20 -6 0 -12 Z" fill="none" stroke="#111" stroke-width="3"/><rect x="-96" y="28" width="132" height="14" rx="6" fill="#f2f2f2" stroke="#999" stroke-width="2"/>'}
 } return ''}
// one leg: thigh angle a (deg, + = forward/left), knee bend b (deg, foot goes back)
function leg(hx,hy,a,b,kind,color){const r=Math.PI/180, kx=hx-Math.sin(a*r)*LEG, ky=hy+Math.cos(a*r)*LEG, sa=a-b, ax=kx-Math.sin(sa*r)*LEG, ay=ky+Math.cos(sa*r)*LEG;
  return {svg:'<path d="M'+hx.toFixed(1)+' '+hy.toFixed(1)+' L'+kx.toFixed(1)+' '+ky.toFixed(1)+' L'+ax.toFixed(1)+' '+ay.toFixed(1)+'" stroke="'+color+'" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'+
    '<g transform="translate('+ax.toFixed(1)+' '+ay.toFixed(1)+') rotate('+(sa*.35).toFixed(1)+')">'+shoe(kind)+'</g>', ay}}
const LEGCOL={heels:'#2a0a2e',flats:'#ffcfa8',slippers:'#f2b38c',sneakers:'#3a5bd9',boots:'#1f3a7a',cleats:'#f2f2f2',hightops:'#1b1b1b',dress:'#1d2a4a',workboots:'#2f4f86',skate:'#b8a27a'};
// where card i is and how it moves at time t
function stateOf(i,t){const t0=T.START+i*T.CYCLE, tH=t0+T.ENTER, tX=tH+T.HOLD, tE=tX+T.EXIT; const off=540+CW/2+90;
  if(t<t0||t>tE)return null;
  if(t<tH){const q=eOut((t-t0)/T.ENTER); return {x:540+off*(1-q), walk:true, dist:off*q}}
  if(t<tX)return {x:540, walk:false, dist:off, hold:t-tH};
  const q=cl((t-tX)/T.EXIT); return {x:540-off*q, walk:true, dist:off+off*q}}
function card(i,st,t){const d=D[i]; const ph=Math.PI*st.dist/STRIDE; let amp=st.walk?26:0;
  if(!st.walk&&st.hold<.3)amp=26*(1-st.hold/.3); // settle to standing
  const bob=st.walk?-16*Math.abs(Math.cos(ph)):0, tilt=st.walk?Math.sin(ph)*2.2:Math.sin(st.hold*4)*1.2*Math.exp(-st.hold);
  const hipY=CY+CH+8+bob, cx=st.x;
  let tap=0; if(!st.walk){const h=st.hold; for(const t0 of [.55,.85]) if(h>t0&&h<t0+.22) tap=Math.sin((h-t0)/.22*Math.PI)*18}
  const a1=amp*Math.sin(ph), b1=st.walk?Math.max(0,Math.cos(ph))*34:0, b2=st.walk?Math.max(0,-Math.cos(ph))*34:0;
  const L1=leg(cx-95,hipY,a1+tap*.0,b1+tap,d.shoe,LEGCOL[d.shoe]), L2=leg(cx+95,hipY,-a1,b2,d.shoe,LEGCOL[d.shoe]);
  let s='<g filter="url(#sh)">'+L2.svg+L1.svg+'</g>';
  s+='<g transform="translate('+cx.toFixed(1)+' '+(CY+bob).toFixed(1)+') rotate('+tilt.toFixed(2)+' 0 '+(CH/2)+')" filter="url(#sh)">';
  const CC=d.color||GOLD; s+='<rect x="'+(-CW/2)+'" y="0" width="'+CW+'" height="'+CH+'" rx="44" fill="#fff" stroke="'+CC+'" stroke-width="16"/>';
  s+='<rect x="'+(-CW/2+30)+'" y="30" width="'+(CW-60)+'" height="430" rx="28" fill="'+(d.color?d.color+'22':'#fff4f8')+'"/>';
  s+='<image href="'+d.src+'" x="'+(-CW/2+50)+'" y="44" width="'+(CW-100)+'" height="402" preserveAspectRatio="xMidYMid meet"/>';
  s+='<g transform="translate('+(-CW/2+40)+' 40)"><circle r="52" fill="'+(d.color?'#111':INK)+'" stroke="'+(d.color||'#fff')+'" stroke-width="7"/><text y="20" text-anchor="middle" font-family="P" font-weight="800" font-size="56" fill="#fff">#'+d.rank+'</text></g>';
  s+='<text x="0" y="530" text-anchor="middle" font-family="P" font-weight="800" font-size="'+Math.min(52,Math.floor(660/(.6*d.name.length)))+'" fill="'+INK+'">'+esc(d.name)+'</text>';
  s+='<text x="0" y="578" text-anchor="middle" font-family="P" font-weight="600" font-size="32" fill="#9a6b8f">'+esc(d.brand)+'</text>';
  s+='<text x="-20" y="700" text-anchor="end" font-family="P" font-weight="800" font-size="104" fill="'+PINK+'">'+esc(d.price)+'</text>';
  s+='<text x="0" y="672" font-family="P" font-weight="600" font-size="40" fill="#9a8a96" text-decoration="line-through">'+esc(d.list||'')+'</text>';
  s+='<text x="0" y="712" font-family="P" font-weight="600" font-size="28" fill="#9a8a96">list price</text>';
  const save=(parseFloat(String(d.list).replace(/[^0-9.]/g,''))-parseFloat(String(d.price).replace(/[^0-9.]/g,''))).toFixed(2);
  s+='<g transform="translate(0 782)"><rect x="-190" y="-38" width="380" height="68" rx="34" fill="#dff7ea"/><text y="10" text-anchor="middle" font-family="P" font-weight="800" font-size="36" fill="#11804f">You save $'+save+'</text></g>';
  const kb=st.walk?0:back(st.hold/.4,2.2); if(kb>0||st.dist>540+CW/2+90)s+='<g transform="translate('+(CW/2-40)+' 40) rotate(12) scale('+Math.max(.01,st.walk?1:kb).toFixed(3)+')">'+burst('-'+d.off+'%',96)+'</g>';
  return s+'</g>'}
function outro(t){const k=back((t-T.END_AT)/.45); if(k<=0)return''; const sc=Math.max(.01,Math.min(1.06,k));
  return '<g transform="translate(540 980) scale('+sc+')" filter="url(#sh)"><rect x="-430" y="-250" width="860" height="500" rx="50" fill="#fff" stroke="'+(THEME==='punk'?'#39ff14':GOLD)+'" stroke-width="'+(THEME==='punk'?18:12)+'"/>'+
   '<text y="-120" text-anchor="middle" font-family="P" font-weight="800" font-size="64" fill="'+INK+'">'+esc(OUTRO)+'</text>'+
   '<text y="-40" text-anchor="middle" font-family="P" font-weight="600" font-size="40" fill="#9a6b8f">updated every hour</text>'+
   '<rect x="-270" y="20" width="540" height="120" rx="60" fill="'+PINK+'"/><text y="102" text-anchor="middle" font-family="P" font-weight="800" font-size="66" fill="#fff">LINK IN BIO</text>'+
   '<text y="205" text-anchor="middle" font-family="P" font-weight="600" font-size="30" fill="#9a8a96">Prices subject to change</text></g>'}
window.frame=(t)=>{let s=defs+(THEME==='punk'?punkField(t)+punkTitle(t):stage(t)+title(t)); const live=[]; for(let i=0;i<D.length;i++){const st=stateOf(i,t); if(st)live.push([i,st])}
  live.sort((a,b)=>a[1].x-b[1].x); for(const [i,st] of live)s+=card(i,st,t); s+=outro(t); document.getElementById('s').innerHTML=s;
  return live.map(([i,st])=>({i,dist:st.dist,walk:st.walk,hold:st.hold??null}))};
</script>`;

const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html); await p.evaluate(() => document.fonts.ready); mkdirSync(outDir, { recursive: true });
const N = Math.ceil(DURATION * FPS), events = [{ t: 0.1, k: 'pop' }], last = {}, STRIDE = 150;
for (let i = 0; i < deals.length; i++) {
  const t0 = START + i * CYCLE; events.push({ t: t0, k: 'whoosh' }, { t: t0 + ENTER, k: 'pop' }, { t: t0 + ENTER + 0.05, k: 'ding' });
  for (const h of [0.55, 0.85]) events.push({ t: t0 + ENTER + h + 0.11, k: 'step_' + deals[i].shoe });
}
events.push({ t: END_AT, k: 'pop' }, { t: END_AT + 0.05, k: 'ding' });
if (process.env.PREVIEW) { // PREVIEW="2.1,3.3,..." renders just those moments
  for (const t of process.env.PREVIEW.split(',').map(Number)) { await p.evaluate((x) => window.frame(x), t); await p.screenshot({ path: path.join(outDir, `preview-${t}.png`) }); }
  await b.close(); process.exit(0);
}
for (let f = 0; f < N; f++) {
  const t = f / FPS; const live = await p.evaluate((x) => window.frame(x), t);
  for (const c of live) { // a footstep each time a foot passes the front of its swing
    const n = Math.floor(c.dist / STRIDE - 0.5);
    if (c.walk && last[c.i] !== undefined && n > last[c.i]) events.push({ t, k: 'step_' + deals[c.i].shoe });
    last[c.i] = n;
  }
  await p.screenshot({ path: path.join(outDir, String(f).padStart(5, '0') + '.png') });
}
await b.close();
writeFileSync(path.join(outDir, 'events.json'), JSON.stringify({ duration: N / FPS, events: events.sort((a, b) => a.t - b.t) }));
console.log('runway frames', N, 'duration', (N / FPS).toFixed(2), 'events', events.length);
