# Builds the vertical "shopping my Top 50" video from the owner's screen + webcam recording.
# Layout: 180px doodle headline band, browser (address header and right buy box cropped away), webcam.
# Voice segments keep the owner's voice; skim segments are sped up and silent; sound effects on top, no music.
# python build.py <recording> <overlay dir> <edl.json> <work dir> <out.mp4>
import json, os, subprocess, sys
src, ov, edl_f, work, out = sys.argv[1:6]
os.makedirs(work, exist_ok=True)
edl = json.load(open(edl_f)); FPS = 30
BROWSER = (403, 423, 367, 102)   # w, h, x, y in the recording
CAM = (340, 193, 566, 527)
SOFT = ("split[o][s];[s]bilateral=sigmaS=14:sigmaR=0.10[sm];[o][sm]blend=all_mode=normal:all_opacity=0.6,"
        "eq=brightness=0.04:contrast=0.96:saturation=1.08:gamma=1.06")

def piece(seg):
    o = f"{work}/{seg['id']}.mp4"; a, b = seg['src']; secs = seg['secs']
    if os.environ.get('REUSE') and seg['id'] not in os.environ['REUSE'].split(',') and os.path.exists(o): return o  # REUSE=ids to redo
    if seg.get('hold'):
        vin = ['-ss', f'{a:.2f}', '-i', src]; trim = f"trim=0:0.04,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={secs}"
        speed = None
    else:
        speed = (b - a) / secs
        vin = ['-ss', f'{a:.2f}', '-t', f'{b - a:.2f}', '-i', src]; trim = f"setpts=(PTS-STARTPTS)/{speed:.5f}"
    z = seg.get('zoom', {}); z0, z1 = z.get('from', 1.0), z.get('to', 1.0); cx, cy = z.get('cx', .5), z.get('cy', .5)
    zs, ze = z.get('start', 0), z.get('end', secs)
    n0, n1 = int(zs * FPS), max(1, int((ze - zs) * FPS))
    p = f"(1-cos(PI*clip((on-{n0})/{n1},0,1)))/2"
    zexpr = f"{z0}+({z1}-{z0})*{p}"
    bw, bh, bx, by = BROWSER; cw, ch, cxx, cyy = CAM
    fc = (f"[0:v]{trim},fps={FPS},split[a][b];"
          f"[a]crop={bw}:{bh}:{bx}:{by},scale=2160:2268:flags=lanczos,"
          f"zoompan=z='{zexpr}':x='clip({cx}*iw-iw/zoom/2,0,iw-iw/zoom)':y='clip({cy}*ih-ih/zoom/2,0,ih-ih/zoom)':d=1:s=1080x1134:fps={FPS}[t];"
          f"[b]crop={cw}:{ch}:{cxx}:{cyy},scale=1080:606:flags=lanczos,{SOFT}[c];"
          f"color=c=0xfff3d6:s=1080x180:r={FPS}[band];"
          f"[band][t][c]vstack=inputs=3:shortest=1,setsar=1[base];"
          f"[1:v]format=rgba[ov];[base][ov]overlay=0:0:eof_action=repeat,trim=0:{secs:.3f},format=yuv420p[v]")
    if seg.get('voice') and speed:
        tempo = f"atempo={speed:.4f}," if abs(speed - 1) > .01 else ''
        fc += f";[0:a]{tempo}highpass=f=80,afftdn=nf=-25,loudnorm=I=-16:TP=-1.5,aresample=48000,apad,atrim=0:{secs:.3f}[au]"
    else:
        fc += f";anullsrc=r=48000:cl=stereo,atrim=0:{secs:.3f}[au]"
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *vin, '-framerate', '12', '-i', os.path.join(ov, seg['id'], '%04d.png'),
                    '-filter_complex', fc, '-map', '[v]', '-map', '[au]', '-r', str(FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19',
                    '-c:a', 'aac', '-b:a', '160k', '-ac', '2', '-ar', '48000', o], check=True)
    return o

only = os.environ.get('ONLY')
parts, events, t = [], [], 0.0
for seg in edl['segments']:
    if not only or seg['id'] in only.split(','):
        parts.append(piece(seg))
    else:
        parts.append(f"{work}/{seg['id']}.mp4")
    for name, at in seg.get('sfx', []): events.append((name, t + at))
    t += seg['secs']
if only: sys.exit(0)
open(f'{work}/list.txt', 'w').write(''.join(f"file '{x}'\n" for x in parts))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{work}/list.txt', '-c', 'copy', f'{work}/joined.mp4'], check=True)

sfx = {  # generated here: no music, no licensed audio
  'ding': "aevalsrc='0.45*(sin(2*PI*1318*t)+0.6*sin(2*PI*1975*t))*exp(-5*t)':d=0.9",
  'chime': "aevalsrc='0.35*(sin(2*PI*1046*t)*lt(t,0.12)+sin(2*PI*1318*t)*gte(t,0.12)*lt(t,0.24)+sin(2*PI*1568*t)*gte(t,0.24))*exp(-3*(t-0.24*gte(t,0.24)))':d=1.0",
  'buzz': "aevalsrc='0.3*sgn(sin(2*PI*110*t))*exp(-2.2*t)':d=0.45",
  'pop': "aevalsrc='0.55*sin(2*PI*(900-700*t*6)*t)*exp(-22*t)':d=0.25",
  'boing': "aevalsrc='0.45*sin(2*PI*(220+180*sin(2*PI*9*t)*exp(-4*t))*t)*exp(-4*t)':d=0.7",
  'click': "aevalsrc='0.5*sin(2*PI*2400*t)*exp(-60*t)':d=0.08",
  'tick': "aevalsrc='0.25*sin(2*PI*3000*t)*exp(-90*mod(t,0.11))*lt(t,1.1)':d=1.1",
  'riser': "aevalsrc='0.18*sin(2*PI*(200+900*t*t)*t)*t':d=0.9",
  'shutter': "aevalsrc='0.5*(random(0)-0.5)*exp(-40*t)+0.4*(random(1)-0.5)*exp(-40*(t-0.09))*gte(t,0.09)':d=0.25",
}
for k, expr in sfx.items():
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', expr + ':s=48000', '-ac', '2', f'{work}/{k}.wav'], check=True)
whoosh = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'deal-check', 'whoosh.wav')
ins, fl = [], []
for i, (k, at) in enumerate(events):
    ins += ['-i', whoosh if k == 'whoosh' else f'{work}/{k}.wav']
    ms = max(0, int(at * 1000)); vol = {'whoosh': .5, 'tick': .6, 'riser': .7}.get(k, .85)
    fl.append(f"[{i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={vol},adelay={ms}|{ms}[e{i}]")
fl.append('[0:a]' + ''.join(f'[e{i}]' for i in range(len(events))) + f"amix=inputs={len(events) + 1}:normalize=0:duration=first,alimiter=limit=0.95[a]")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{work}/joined.mp4', *ins, '-filter_complex', ';'.join(fl),
                '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out], check=True)
print(out, f'{t:.1f}s', len(parts), 'pieces')
