# Paper-cut daily deals video from a screen recording (browser in the top-left 480x480 of the recording).
# Starts zoomed on the address bar, scrolls at 3x, freezes and zooms on each highlighted deal with a paper ring
# around the price and a paper header card at the bottom. Sound effects only (paper, snips, tape), no music.
# python build.py <recording> <work dir> <out prefix> <fontDir> [talking intro clip]
# The optional intro clip (her talking, portrait) opens the video in a tall paper window with cut-paper captions;
# its voice is kept. Captions: INTRO_CAPTIONS env, JSON [[start, end, text], ...] in clip seconds.
# Writes <out prefix>-tiktok.mp4 / -instagram.mp4 (1080x1920) and -pinterest.mp4 (1000x1500).
import json, os, subprocess, sys
src, work, out, font_dir = sys.argv[1:5]
intro = sys.argv[5] if len(sys.argv) > 5 else None
INTRO = (0.6, 13.2)  # part of the intro clip to use
here = os.path.dirname(os.path.abspath(__file__))
os.makedirs(work, exist_ok=True)
FPS = 30
SW, SH, SY = 480, 423, 57            # page area in the recording: x 0-480, y 57-480 (below the browser bar)
PX, PY, PW, PH = 40, 350, 1000, 881  # browser window in the output
Z = 2.0

HIGH = [  # time, price text left/baseline (recording px), card centre x, header text
    dict(n=1, at=20.0, price=(366, 382), cx=411, cat='FOR HER', colour='#ff6f9c', name=['EverFoams Women’s', 'Fuzzy Slippers'], note='Cozy, comfy and gift-ready', off='-61%'),
    dict(n=2, at=28.0, price=(248, 418), cx=293, cat='FOR HIM', colour='#8cc8ff', name=['New Balance Men’s', '408 Sneakers'], note='Everyday comfy kicks', off='-54%'),
    dict(n=3, at=40.0, price=(248, 441), cx=295, cat='UNDER $25', colour='#ffd45c', name=['soundcore P30i', 'Noise-Cancelling Earbuds'], note='By Anker', off='-50%'),
    dict(n=4, at=70.0, price=(132, 420), cx=177, cat='ELECTRONICS', colour='#7fd6b8', name=['Amazon Fire HD 10', 'Tablet'], note='Big screen, small price', off='-53%'),
]
HOLD = 4.6
def view(cx, cy, z, sw=SW, sh=SH):
    w, h = sw / z, sh / z
    return min(max(cx - w / 2, 0), sw - w), min(max(cy - h / 2, 0), sh - h), w, h

segs = []
if intro:
    a0, a1 = INTRO
    caps = [[x - a0, y - a0, txt] for x, y, txt in json.loads(os.environ.get('INTRO_CAPTIONS', '[]'))]
    segs.append(dict(id='talk', kind='talk', src=[a0, a1], secs=round(a1 - a0, 2), win=[140, 330, 800, 1066], captions=caps, capY=1470))
segs += [dict(id='intro', kind='addr', src=[4.0, 8.7], secs=4.7, crop=(480, 423, 0, 0), zoom=dict(cx=97, cy=30, z=3.4, start=.2, end=1.6))]
scrolls = [(8.7, 20.0), (20.0, 28.0), (28.0, 40.0), (63.5, 70.0)]
for (a, b), h in zip(scrolls, HIGH):
    segs.append(dict(id=f's{h["n"]}', kind='scroll', src=[a, b], secs=round((b - a) / 3, 2)))
    px, py = h['price'][0] + 30, h['price'][1] - SY - 7      # middle of the price text, page coordinates
    cx, cy = h['cx'], min(py - 40, SH)
    x0, y0, w, hh = view(cx, cy, Z)
    segs.append(dict(id=f'h{h["n"]}', kind='highlight', n=h['n'], src=[h['at'], h['at']], secs=HOLD, cat=h['cat'], colour=h['colour'],
                     name=h['name'], note=h['note'], off=h['off'], zoom=dict(cx=cx, cy=cy, z=Z, start=0, end=.6),
                     ring=dict(x=round(PX + (px - x0) / w * PW), y=round(PY + (py - y0) / hh * PH), rx=118, ry=50), ringAt=.75))
segs.append(dict(id='outro', kind='outro', src=[70.0, 70.0], secs=3.4))

def render(variant, cta, cta_end):
    vw = f'{work}/{variant}'; os.makedirs(vw, exist_ok=True)
    edl = dict(PX=PX, PY=PY, PW=PW, PH=PH, date=os.environ.get('DATE', '11-7'), weekday=os.environ.get('WEEKDAY', 'SAT'), cta=cta, ctaEnd=cta_end, segments=segs)
    json.dump(edl, open(f'{vw}/edl.json', 'w'), indent=1)
    subprocess.run(['node', os.path.join(here, 'overlays.mjs'), f'{vw}/ov', font_dir, f'{vw}/edl.json', os.path.join(here, '../../public/img/logo-badge.svg')], check=True)
    parts, events, t = [], [], 0.0
    for seg in segs:
        o = f"{vw}/{seg['id']}.mp4"; a, b = seg['src']; secs = seg['secs']
        cw, ch, cxo, cyo = seg.get('crop', (SW, SH, 0, SY))
        if seg['kind'] == 'talk':
            wx, wy, ww, wh = seg['win']
            fc = (f"[0:v]setpts=PTS-STARTPTS,fps={FPS},scale=720:1280,crop=720:960:0:90,scale={ww}:{wh}:flags=lanczos[p];color=c=0xe9d3b4:s=1080x1920:r={FPS}:d={secs:.3f}[bg];"
                  f"[bg][p]overlay={wx}:{wy}:shortest=1[base];[1:v]format=rgba[ov];[base][ov]overlay=0:0:eof_action=repeat,trim=0:{secs:.3f},format=yuv420p[v]")
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a:.2f}', '-t', f'{secs:.2f}', '-i', intro, '-framerate', '12', '-i', f"{vw}/ov/{seg['id']}/%04d.png",
                            '-filter_complex', fc, '-map', '[v]', '-an', '-r', str(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', o], check=True)
            parts.append(o); events += [('pop', t + .1)]; t += secs; continue
        if seg['kind'] in ('highlight', 'outro'):
            frame = f"{vw}/{seg['id']}.png"
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a:.2f}', '-i', src, '-frames:v', '1', frame], check=True)
            vin = ['-loop', '1', '-framerate', str(FPS), '-t', f'{secs:.2f}', '-i', frame]; pre = ''
        else:
            vin = ['-ss', f'{a:.2f}', '-t', f'{b - a:.2f}', '-i', src]; pre = f"setpts=(PTS-STARTPTS)*{secs / (b - a):.5f},fps={FPS},"
        z = seg.get('zoom')
        if z:
            n0, n1 = int(z['start'] * FPS), max(1, int((z['end'] - z['start']) * FPS))
            zx = f"1+({z['z']}-1)*(1-cos(PI*clip((on-{n0})/{n1},0,1)))/2"
            panel = (f"{pre}crop={cw}:{ch}:{cxo}:{cyo},scale={PW * 2}:{PH * 2}:flags=lanczos,zoompan=z='{zx}':x='clip({z['cx'] / cw}*iw-iw/zoom/2,0,iw-iw/zoom)'"
                     f":y='clip({z['cy'] / ch}*ih-ih/zoom/2,0,ih-ih/zoom)':d=1:s={PW}x{PH}:fps={FPS},unsharp=5:5:0.7")
        else:
            panel = f"{pre}crop={cw}:{ch}:{cxo}:{cyo},scale={PW}:{PH}:flags=lanczos,unsharp=5:5:0.5"
        fc = (f"[0:v]{panel}[p];color=c=0xe9d3b4:s=1080x1920:r={FPS}:d={secs:.3f}[bg];[bg][p]overlay={PX}:{PY}:shortest=1[base];"
              f"[1:v]format=rgba[ov];[base][ov]overlay=0:0:eof_action=repeat,trim=0:{secs:.3f},format=yuv420p[v]")
        subprocess.run(['ffmpeg', '-v', 'error', '-y', *vin, '-framerate', '12', '-i', f"{vw}/ov/{seg['id']}/%04d.png", '-filter_complex', fc,
                        '-map', '[v]', '-an', '-r', str(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', o], check=True)
        parts.append(o)
        k = seg['kind']
        if k == 'addr': events += [('rustle', t), ('snip', t + .3), ('pop', t + 1.7), ('tape', t + 2.4)]
        if k == 'scroll': events += [('rustle', t), ('tick', t + .2)]
        if k == 'highlight': events += [('snip', t + .05), ('rustle', t + .15), ('tape', t + .5), ('pop', t + seg['ringAt']), ('pop', t + .7), ('ding', t + seg['ringAt'] + .3)]
        if k == 'outro': events += [('rustle', t), ('snip', t + .35), ('chime', t + .7)]
        t += secs
    open(f'{vw}/list.txt', 'w').write(''.join(f"file '{p}'\n" for p in parts))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', f'{vw}/list.txt', '-c', 'copy', f'{vw}/video.mp4'], check=True)
    return f'{vw}/video.mp4', events, t

def sfx_files():
    import numpy as np, wave
    sr = 48000; rng = np.random.default_rng(5)
    def save(name, x):
        x = x / max(1e-9, np.abs(x).max()) * .8
        with wave.open(f'{work}/{name}.wav', 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x * 32767).astype('<i2').tobytes())
    T = lambda d: np.arange(int(d * sr)) / sr
    def hp(x): return np.diff(x, prepend=0)
    def bp(x, k=6): return np.convolve(hp(x), np.ones(k) / k, mode='same')
    t = T(.55); n = rng.standard_normal(len(t))
    flutter = (np.abs(np.sin(2 * np.pi * 11 * t + rng.uniform(0, 6))) ** 3 + .3 * rng.random(len(t))) * np.minimum(1, t * 30) * np.exp(-3 * t)
    save('rustle', bp(n, 4) * flutter)
    def click(d=.025): u = T(d); return hp(rng.standard_normal(len(u))) * np.exp(-180 * u) + .6 * np.sin(2 * np.pi * 4200 * u) * np.exp(-200 * u)
    s = np.zeros(int(.2 * sr)); c = click(); s[:len(c)] += c; s[int(.09 * sr):int(.09 * sr) + len(c)] += c * .9; save('snip', s)
    t = T(.35); save('tape', bp(rng.standard_normal(len(t)), 3) * (.4 + .6 * np.sin(2 * np.pi * 60 * t) ** 2) * np.minimum(1, t * 40) * np.exp(-6 * t))
    t = T(.25); save('pop', np.sin(2 * np.pi * (900 - 2800 * t) * t) * np.exp(-22 * t))
    t = T(.9); save('ding', (np.sin(2 * np.pi * 1318 * t) + .6 * np.sin(2 * np.pi * 1975 * t)) * np.exp(-5 * t))
    t = T(1.0); f = np.where(t < .12, 1046, np.where(t < .24, 1318, 1568)); save('chime', np.sin(2 * np.pi * f * t) * np.exp(-3 * (t - .24 * (t >= .24))))
    t = T(1.1); save('tick', np.sin(2 * np.pi * 3000 * t) * np.exp(-90 * (t % .11)) * .5)

def mix(video, events, total, out_file):
    ins, fl = [], []
    voice = None
    if intro:
        voice = len(events) + 1
        a0, a1 = INTRO
        ins_v = ['-ss', f'{a0:.2f}', '-t', f'{a1 - a0:.2f}', '-i', intro]
    for i, (k, at) in enumerate(events):
        ins += ['-i', f'{work}/{k}.wav']; ms = max(0, int(at * 1000))
        vol = {'rustle': .55, 'tick': .5, 'tape': .5}.get(k, .8)
        fl.append(f"[{i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={vol},adelay={ms}|{ms}[e{i}]")
    n_in = len(events)
    if voice:
        ins += ins_v
        fl.append(f"[{voice}:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=80,afftdn=nf=-25,loudnorm=I=-15:TP=-1.5,aresample=48000[vo]")
    fl.append(''.join(f'[e{i}]' for i in range(n_in)) + ('[vo]' if voice else '') + f"amix=inputs={n_in + (1 if voice else 0)}:normalize=0:duration=longest,apad=whole_dur={total:.2f},atrim=0:{total:.2f},alimiter=limit=0.9[a]")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, *ins, '-filter_complex', ';'.join(fl), '-map', '0:v', '-map', '[a]',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out_file], check=True)

sfx_files()
v, ev, total = render('social', '🔗 Link in bio', '🔗 Link in bio')
mix(v, ev, total, f'{out}-tiktok.mp4')
subprocess.run(['cp', f'{out}-tiktok.mp4', f'{out}-instagram.mp4'], check=True)
v, ev, total = render('pin', '👆 Tap the pin to shop', '👆 Tap to shop')
mix(v, ev, total, f'{work}/pin-full.mp4')
# Pinterest 2:3: keep y 120-1740 (header, window and bottom card), scale to 1000x1500
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{work}/pin-full.mp4', '-vf', 'crop=1080:1620:0:110,scale=1000:1500:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium',
                '-crf', '18', '-c:a', 'copy', '-movflags', '+faststart', f'{out}-pinterest.mp4'], check=True)
print('done', f'{total:.1f}s')
