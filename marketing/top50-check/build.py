# Builds the vertical "I checked the Top 50" video from the owner's screen recording.
# Top: browser area (header with the delivery address and the right-hand buy box cropped away), sped up.
# Bottom: the owner's webcam with a soft filter. Overlays: doodle banner + verdict. Audio: sound effects only.
# python build.py <recording> <overlay dir> <deals.json> <work dir> <out.mp4>
import json, os, subprocess, sys, math
src, ov, deals_f, work, out = sys.argv[1:6]
os.makedirs(work, exist_ok=True)
d = json.load(open(deals_f)); FPS = 30
TOP = "crop=525:544:410:135,scale=1080:1120:flags=lanczos"
CAM = ("crop=410:304:0:180,scale=1080:800:flags=lanczos,split[o][s];[s]bilateral=sigmaS=14:sigmaR=0.10[sm];"
       "[o][sm]blend=all_mode=normal:all_opacity=0.65,eq=brightness=0.05:contrast=0.95:saturation=1.06:gamma=1.07")
# blur boxes (source coords) where a page names the owner's city/store
BLURS = [(873, 900, 471, 383, 433, 30), (749, 756, 460, 594, 450, 28)]

def piece(name, a, b, secs, ovdir, hold=0.0):
    """a..b of the recording squeezed into secs (or a still of b held for hold secs), with an overlay sequence."""
    o = f'{work}/{name}.mp4'
    if hold:
        vin = ['-ss', f'{b - 0.05:.2f}', '-i', src]; trim = f"trim=0:0.04,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={hold}"
        dur = hold
    else:
        vin = ['-ss', f'{a:.2f}', '-t', f'{b - a:.2f}', '-i', src]; trim = f"setpts=(PTS-STARTPTS)*{secs / (b - a):.5f}"
        dur = secs
    blur = ''
    for (t0, t1, x, y, w, h) in BLURS:
        if not (b < t0 or a > t1):
            k = 1080 / 525  # blur boxes are in recording pixels; the browser area is zoomed by k
            X, Y, W, H = int((x - 410) * k), int((y - 135) * k), int(w * k), int(h * k)
            blur += f"[t]split[t1][t2];[t2]crop={W}:{H}:{X}:{Y},gblur=sigma=14[bb];[t1][bb]overlay={X}:{Y}[t];"
    fc = (f"[0:v]{trim},fps={FPS},split[a][b];[a]crop=1278:720:0:0,{TOP}[t];{blur}"
          f"[b]{CAM}[c];[t][c]vstack=inputs=2,scale=1080:1920,setsar=1[base];"
          f"[1:v]format=rgba[ov];[base][ov]overlay=0:0:eof_action=repeat,trim=0:{dur:.3f},format=yuv420p[v]")
    fc = fc.replace("crop=1278:720:0:0,", "")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *vin, '-framerate', '12', '-i', os.path.join(ov, ovdir, '%04d.png'),
                    '-filter_complex', fc, '-map', '[v]', '-an', '-r', str(FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', o], check=True)
    return o, dur

parts, events, t = [], [], 0.0
first = d['items'][0]
p, du = piece('intro', first['product'][0], first['product'][0] + 4, d['introSecs'], 'intro'); parts.append(p); events.append(('pop', 0.15)); t += du
for it in d['items']:
    n = it['n']; events.append(('whoosh', t - 0.1))
    a, b = it['product']
    if it['verdict'] == 'unk':
        p, du = piece(f'p{n}', a, b, it['productSecs'], f'banner{n}'); parts.append(p); t += du
        p, du = piece(f'v{n}', a, b, 0, f'verdict{n}', hold=it['verdictSecs']); parts.append(p); events.append(('pop', t + 0.05)); t += du
        continue
    # product then price history share one banner sequence: split the banner frames by time
    p, du = piece(f'p{n}', a, b, it['productSecs'], f'banner{n}'); parts.append(p); t += du
    ha, hb = it['history']
    # banner frames continue during history: make a shifted copy of the banner dir
    shifted = f'{work}/banner{n}-h'; os.makedirs(shifted, exist_ok=True)
    frames = sorted(os.listdir(f'{ov}/banner{n}')); skip = int(it['productSecs'] * 12)
    for i, f in enumerate(frames[skip:]):
        dst = f'{shifted}/{i:04d}.png'
        if not os.path.exists(dst): os.symlink(f'{ov}/banner{n}/{f}', dst)
    events.append(('click', t + 0.05))
    p, du = piece(f'h{n}', ha, hb, it['historySecs'], shifted); parts.append(p); t += du
    p, du = piece(f'v{n}', ha, hb, 0, f'verdict{n}', hold=it['verdictSecs']); parts.append(p)
    events.append(('ding' if it['verdict'] == 'yes' else 'buzz', t + (0.35 if it['verdict'] == 'yes' else 0.05)))
    if it['verdict'] == 'no': events.append(('buzz2', t + 0.32))
    t += du
last = d['items'][-1]
p, du = piece('outro', last['history'][1] - 1, last['history'][1], 0, 'outro', hold=d['outroSecs']); parts.append(p); events.append(('whoosh', t - 0.1)); events.append(('ding', t + 0.4)); t += du
open(f'{work}/list.txt', 'w').write(''.join(f"file '{x}'\n" for x in parts))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{work}/list.txt', '-c', 'copy', f'{work}/video.mp4'], check=True)

# sound effects (made here, no music)
sfx = {
  'ding': "aevalsrc='0.5*(sin(2*PI*1318*t)+0.6*sin(2*PI*1975*t))*exp(-5*t)':d=0.9",
  'buzz': "aevalsrc='0.32*sgn(sin(2*PI*110*t))*exp(-2.2*t)':d=0.45",
  'buzz2': "aevalsrc='0.32*sgn(sin(2*PI*92*t))*exp(-2.2*t)':d=0.5",
  'pop': "aevalsrc='0.6*sin(2*PI*(900-700*t*6)*t)*exp(-22*t)':d=0.25",
  'click': "aevalsrc='0.5*sin(2*PI*2400*t)*exp(-60*t)':d=0.08",
}
for k, expr in sfx.items():
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', expr + ':s=48000', '-ac', '2', f'{work}/{k}.wav'], check=True)
whoosh = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'deal-check', 'whoosh.wav')
ins, fl = [], []
for i, (k, at) in enumerate(events):
    ins += ['-i', whoosh if k == 'whoosh' else f'{work}/{k}.wav']
    ms = max(0, int(at * 1000)); vol = 0.55 if k == 'whoosh' else 1.0
    fl.append(f"[{i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={vol},adelay={ms}|{ms}[e{i}]")
fl.append(''.join(f'[e{i}]' for i in range(len(events))) + f"amix=inputs={len(events)}:normalize=0:duration=longest,apad=whole_dur={t:.2f},atrim=0:{t:.2f},alimiter=limit=0.9[a]")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{work}/video.mp4', *ins, '-filter_complex', ';'.join(fl),
                '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out], check=True)
print(out, f'{t:.1f}s', len(parts), 'pieces')
