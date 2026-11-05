# Daily "Top deals" vertical video from a screen recording of the Top 50 page.
# Scrolling plays at 2x; each highlighted deal freezes, zooms in, and its price gets a boiling doodle circle.
# Sound effects only (no music, no original audio).
# python build.py <recording> <work dir> <out.mp4> <fontDir>
import json, os, subprocess, sys
src, work, out, font_dir = sys.argv[1:5]
here = os.path.dirname(os.path.abspath(__file__))
os.makedirs(work, exist_ok=True)
FPS, SW, SH = 30, 553, 480            # browser area in the recording (x 0-553, full height)
PW, PH, PY = 1080, 937, 300           # browser panel in the output
Z = 2.0                               # zoom on highlighted deals

# Highlights: time in the recording, price position (recording pixels), what to say.
HIGHLIGHTS = [
    dict(n=1, at=12.0, price=(39, 365), top=125, cat='FOR HER', colour='#ff3d7f', name=['EverFoams Women’s', 'Fuzzy Slippers'], note='Cozy house shoes, great gift', off='-61%'),
    dict(n=2, at=22.0, price=(44, 402), top=232, cat='ELECTRONICS', colour='#3fb8ff', name=['Bose QuietComfort', 'Headphones'], note='Wireless noise cancelling', off='-53%'),
    dict(n=3, at=29.0, price=(37, 319), top=123, cat='FOR HIM', colour='#3b0f3a', name=['FOGFIRE Men’s', 'Sweatpants'], note='Zipper pockets, gym to couch', off='-51%'),
]
HOLD = 4.6

def view(cx, cy, z):
    w, h = SW / z, SH / z
    return min(max(cx - w / 2, 0), SW - w), min(max(cy - h / 2, 0), SH - h), w, h

segs, cursor = [], 0.0
segs.append(dict(id='intro', kind='intro', src=[0.0, 2.6], secs=2.6))
cursor = 2.6
for h in HIGHLIGHTS:
    segs.append(dict(id=f's{h["n"]}', kind='scroll', src=[cursor, h['at']], secs=round((h['at'] - cursor) / 2, 2)))
    cx, cy = 125, max((h['top'] + h['price'][1]) / 2 + 8, h['price'][1] - 90)  # frame the card, keep room under the price
    x0, y0, w, hh = view(cx, cy, Z)
    rx, ry = (h['price'][0] - x0) / w * PW + 20, PY + (h['price'][1] - y0) / hh * PH
    segs.append(dict(id=f'h{h["n"]}', kind='highlight', n=h['n'], src=[h['at'], h['at']], secs=HOLD, cat=h['cat'], colour=h['colour'],
                     name=h['name'], note=h['note'], off=h['off'], zoom=dict(cx=cx / SW, cy=cy / SH),
                     ring=dict(x=round(rx), y=round(ry), rx=150, ry=62), ringAt=0.9))
    cursor = h['at']
segs.append(dict(id='s4', kind='scroll', src=[cursor, 38.0], secs=round((38.0 - cursor) / 2, 2)))
segs.append(dict(id='outro', kind='outro', src=[38.0, 38.0], secs=3.4))
edl = dict(date='11-5', weekday='THU', segments=segs,
           cta=os.environ.get('CTA', '🔗 Link in bio'), ctaEnd=os.environ.get('CTA_END', '🔗 Link in bio'))  # Pinterest: CTA='👆 Tap to shop'
json.dump(edl, open(f'{work}/edl.json', 'w'), indent=1)

ov = f'{work}/ov'
subprocess.run(['node', os.path.join(here, 'overlays.mjs'), ov, font_dir, f'{work}/edl.json', os.path.join(here, '../../public/img/logo-badge.svg')], check=True)

def piece(seg):
    o = f"{work}/{seg['id']}.mp4"; a, b = seg['src']; secs = seg['secs']
    if seg['kind'] in ('highlight', 'outro'):
        frame = f"{work}/{seg['id']}.png"
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a:.2f}', '-i', src, '-frames:v', '1', '-vf', f'crop={SW}:{SH}:0:0', frame], check=True)
        vin = ['-loop', '1', '-framerate', str(FPS), '-t', f'{secs:.2f}', '-i', frame]; pre = ''
    else:
        vin = ['-ss', f'{a:.2f}', '-t', f'{b - a:.2f}', '-i', src]; pre = f"setpts=(PTS-STARTPTS)*{secs / (b - a):.5f},fps={FPS},crop={SW}:{SH}:0:0,"
    if seg['kind'] == 'highlight':
        N, up, dn = int(secs * FPS), 18, 15
        zexpr = f"1+({Z}-1)*clip(min(on/{up}\\,({N}-on)/{dn})\\,0\\,1)"
        cx, cy = seg['zoom']['cx'], seg['zoom']['cy']
        panel = (f"{pre}scale=2160:1874:flags=lanczos,zoompan=z='{zexpr}':x='clip({cx}*iw-iw/zoom/2,0,iw-iw/zoom)':y='clip({cy}*ih-ih/zoom/2,0,ih-ih/zoom)'"
                 f":d=1:s={PW}x{PH}:fps={FPS},unsharp=5:5:0.6")
    else:
        panel = f"{pre}scale={PW}:{PH}:flags=lanczos,unsharp=5:5:0.5"
    fc = (f"[0:v]{panel}[p];color=c=0xfff3d6:s=1080x1920:r={FPS}:d={secs:.3f}[bg];[bg][p]overlay=0:{PY}:shortest=1[base];"
          f"[1:v]format=rgba[ov];[base][ov]overlay=0:0:eof_action=repeat,trim=0:{secs:.3f},format=yuv420p[v]")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *vin, '-framerate', '12', '-i', os.path.join(ov, seg['id'], '%04d.png'),
                    '-filter_complex', fc, '-map', '[v]', '-an', '-r', str(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', o], check=True)
    return o

parts, events, t = [], [], 0.0
for seg in segs:
    parts.append(piece(seg))
    if seg['kind'] == 'intro': events += [('pop', t + .2), ('ding', t + .5)]
    if seg['kind'] == 'scroll': events += [('whoosh', t), ('tick', t + .3)]
    if seg['kind'] == 'highlight': events += [('riser', t), ('shutter', t + .55), ('pop', t + .75), ('boing', t + 1.0), ('scribble', t + seg['ringAt']), ('ding', t + seg['ringAt'] + .55)]
    if seg['kind'] == 'outro': events += [('whoosh', t), ('chime', t + .4)]
    t += seg['secs']
open(f'{work}/list.txt', 'w').write(''.join(f"file '{p}'\n" for p in parts))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{work}/list.txt', '-c', 'copy', f'{work}/video.mp4'], check=True)

sfx = {
  'ding': "aevalsrc='0.42*(sin(2*PI*1318*t)+0.6*sin(2*PI*1975*t))*exp(-5*t)':d=0.9",
  'chime': "aevalsrc='0.33*(sin(2*PI*1046*t)*lt(t,0.12)+sin(2*PI*1318*t)*gte(t,0.12)*lt(t,0.24)+sin(2*PI*1568*t)*gte(t,0.24))*exp(-3*(t-0.24*gte(t,0.24)))':d=1.0",
  'pop': "aevalsrc='0.55*sin(2*PI*(900-700*t*6)*t)*exp(-22*t)':d=0.25",
  'boing': "aevalsrc='0.4*sin(2*PI*(220+180*sin(2*PI*9*t)*exp(-4*t))*t)*exp(-4*t)':d=0.7",
  'tick': "aevalsrc='0.22*sin(2*PI*3000*t)*exp(-90*mod(t,0.11))*lt(t,1.1)':d=1.1",
  'riser': "aevalsrc='0.16*sin(2*PI*(200+900*t*t)*t)*t*1.6':d=0.6",
  'shutter': "aevalsrc='0.5*(random(0)-0.5)*exp(-40*t)+0.4*(random(1)-0.5)*exp(-40*(t-0.09))*gte(t,0.09)':d=0.25",
  'scribble': "aevalsrc='0.25*(random(0)-0.5)*(0.6+0.4*sin(2*PI*14*t))*lt(t,0.5)':d=0.5",
}
for k, expr in sfx.items():
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', expr + ':s=48000', '-ac', '2', f'{work}/{k}.wav'], check=True)
whoosh = os.path.join(here, '..', 'deal-check', 'whoosh.wav')
ins, fl = [], []
for i, (k, at) in enumerate(events):
    ins += ['-i', whoosh if k == 'whoosh' else f'{work}/{k}.wav']
    ms = max(0, int(at * 1000)); vol = {'whoosh': .5, 'tick': .6}.get(k, .85)
    fl.append(f"[{i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={vol},adelay={ms}|{ms}[e{i}]")
fl.append(''.join(f'[e{i}]' for i in range(len(events))) + f"amix=inputs={len(events)}:normalize=0:duration=longest,apad=whole_dur={t:.2f},atrim=0:{t:.2f},alimiter=limit=0.9[a]")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{work}/video.mp4', *ins, '-filter_complex', ';'.join(fl),
                '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out], check=True)
print(out, f'{t:.1f}s')
