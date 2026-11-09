# Talking video with layered effects: punch-in zooms, graphics BEHIND the owner (wall sticker, notes, price chart),
# her cutout, graphics IN FRONT (checklist, tags, CTA), and a deal card landing on her palm. Voice kept + sound effects.
# python talk_fx.py <config.json>
# config: {"video", "segmenter", "fonts", "whoosh", "out", "fx_dir" (from fx_layers.mjs), "fx_fps",
#          "zooms": [{"start","end","scale","cx","cy"}],            (cx,cy = 0..1 of the frame to zoom toward)
#          "palm": {"track","img","label","off","in","out"} (optional), "sfx": [["ding", 12.3], ...],
#          "pinterest": false}
import json, math, os, subprocess, sys, wave
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from ai_edge_litert.interpreter import Interpreter

C = json.load(open(sys.argv[1]))
W, H, FPS = 1080, 1920, 30
FX_FPS = C.get('fx_fps', 15)
FONT = lambda s: ImageFont.truetype(os.path.join(C['fonts'], 'Poppins-ExtraBold.ttf'), max(1, int(s)))
PINK, SUN = (255, 61, 127), (255, 212, 92)
def back(x, c=1.7):
    x = min(1, max(0, x)); return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2
def smooth(x):
    x = min(1, max(0, x)); return x * x * (3 - 2 * x)

def zoom_at(t):
    """current zoom (scale, cx, cy): eases in over .35 s, holds, eases out over .35 s"""
    for z in C.get('zooms', []):
        if z['start'] <= t <= z['end']:
            k = min(smooth((t - z['start']) / .35), smooth((z['end'] - t) / .35))
            return 1 + (z['scale'] - 1) * k, z['cx'], z['cy']
    return 1, .5, .5
def apply_zoom(img, s, cx, cy):
    if s <= 1.001: return img
    w, h = W / s, H / s; x0 = min(max(cx * W - w / 2, 0), W - w); y0 = min(max(cy * H - h / 2, 0), H - h)
    M = np.array([[s, 0, -x0 * s], [0, s, -y0 * s]], np.float32)
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

# palm card
palm = C.get('palm'); track = None
if palm:
    tr = json.load(open(palm['track'])); S = W / tr['w']; last = None; track = []
    for f in tr['frames']:
        if f.get('ok'): last = (f['palm'][0] * S, f['palm'][1] * S, f['size'] * S)
        track.append(last)
    card = Image.open(palm['img']).convert('RGBA'); f = FONT(64); tw = int(f.getlength(palm['label'])) + 70
    lab = Image.new('RGBA', (max(card.width, tw), card.height + 110), (0, 0, 0, 0)); lab.alpha_composite(card, (0, 110))
    d = ImageDraw.Draw(lab); d.rounded_rectangle((0, 0, tw, 120), radius=40, fill=PINK + (255,)); d.text((35, 18), palm['label'], font=f, fill=(255, 255, 255))
    palm['im'] = lab
def palm_at(t):
    i = min(len(track) - 1, max(0, int(round(t * 30))))
    w = [p for p in track[max(0, i - 3):i + 4] if p]
    return tuple(np.mean([p[k] for p in w]) for k in range(3)) if w else None
def sprite(img, h, ang, alpha=1.0):
    s = img.resize((max(2, int(img.width * h / img.height)), max(2, int(h))), Image.LANCZOS)
    if alpha < 1: s.putalpha(s.getchannel('A').point(lambda a: int(a * alpha)))
    pad = int(h * .12); sh = Image.new('RGBA', (s.width + pad * 2, s.height + pad * 2), (0, 0, 0, 0))
    sh.paste((30, 10, 25, int(120 * alpha)), (pad, int(pad * 1.5), pad + s.width, int(pad * 1.5) + s.height), s.getchannel('A'))
    sh = sh.filter(ImageFilter.GaussianBlur(pad / 2.5)); sh.alpha_composite(s, (pad, pad))
    return sh.rotate(-ang, resample=Image.BICUBIC, expand=True)
def burst(off, r):
    size = int(r * 2.4); im = Image.new('RGBA', (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = size / 2
    pts = [(c + math.cos(i * math.pi / 12) * (r if i % 2 == 0 else r * .8), c + math.sin(i * math.pi / 12) * (r if i % 2 == 0 else r * .8)) for i in range(24)]
    d.polygon(pts, fill=PINK + (255,), outline=(255, 255, 255), width=max(3, int(r * .07)))
    f1, f2 = FONT(r * .62), FONT(r * .32)
    d.text((c - f1.getlength(off) / 2, c - r * .55), off, font=f1, fill=(255, 255, 255)); d.text((c - f2.getlength('OFF') / 2, c + r * .12), 'OFF', font=f2, fill=SUN)
    return im.rotate(12, resample=Image.BICUBIC, expand=True)

def layer(name, t):
    i = int(t * FX_FPS); p = os.path.join(C['fx_dir'], name, f'{i:05d}.png')
    return cv2.imread(p, cv2.IMREAD_UNCHANGED) if os.path.exists(p) else None
def over(base, rgba):
    if rgba is None or rgba[..., 3].max() == 0: return base
    a = rgba[..., 3:4].astype(np.float32) / 255; rgb = rgba[..., 2::-1].astype(np.float32)
    return base * (1 - a) + rgb * a

seg = Interpreter(model_path=C['segmenter']); seg.allocate_tensors()
s_in, s_out = seg.get_input_details()[0]['index'], seg.get_output_details()[0]['index']
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', C['video'], '-vf', f'fps={FPS},scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
tmp = C['out'] + '.video.mp4'
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', tmp], stdin=subprocess.PIPE)
prev, n = None, 0
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    t = n / FPS
    frame = apply_zoom(np.frombuffer(buf, np.uint8).reshape(H, W, 3), *zoom_at(t))
    seg.set_tensor(s_in, (cv2.resize(frame, (256, 256), interpolation=cv2.INTER_AREA).astype(np.float32) / 255)[None]); seg.invoke()
    m = cv2.resize(seg.get_tensor(s_out)[0, :, :, 0], (W, H), interpolation=cv2.INTER_LINEAR)
    m = np.clip((cv2.GaussianBlur(m, (9, 9), 0) - .3) / .4, 0, 1)
    prev = m if prev is None else prev * .4 + m * .6
    a = cv2.GaussianBlur(prev, (0, 0), 1.5)[..., None]
    f32 = frame.astype(np.float32)
    wall = over(f32, layer('behind', t))
    img = over(f32 * a + wall * (1 - a), layer('front', t))
    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).convert('RGBA')
    if palm and palm['in'] - .05 <= t <= palm['out'] + .5:
        p = palm_at(min(max(t, palm['in'] + .2), palm['out']))
        if p:
            px, py, ps = p; h = float(np.clip(ps * 2.6, H * .24, H * .32)); slot = np.array([px, py - h * .62]); slot[0] = np.clip(slot[0], h * .3, W - h * .3)
            src = np.array([W * .8, H * .25]); ti, to = t - palm['in'], t - palm['out']
            if to > 0: e = min(1, to / .45) ** 3; pos = slot * (1 - e) + src * e; hh = h * (1 - .75 * e); ang = -8 * e; al = 1 - .6 * e
            else:
                lin = min(1, ti / .5); e = back(ti / .5, 1.6); pos = src * (1 - lin) + slot * lin; hh = h * (.25 + .75 * min(1.05, e)); ang = (1 - lin) * -18 + math.sin(t * 2.3) * 2.5; al = min(1, ti / .12)
            sp = sprite(palm['im'], hh, ang, al); out.alpha_composite(sp, (int(pos[0] - sp.width / 2), int(pos[1] - sp.height / 2)))
            if to <= 0 and ti > .4:
                r = h * .2 * back((ti - .4) / .35, 2.2)
                if r > 12:
                    b = burst(palm['off'], r); bx = pos[0] + hh * .3 * (1 if pos[0] < W * .62 else -1); by = pos[1] - hh * .42
                    out.alpha_composite(b, (int(bx - b.width / 2), int(by - b.height / 2)))
    enc.stdin.write(out.convert('RGB').tobytes()); n += 1
enc.stdin.close(); enc.wait()

# sound effects
sr = 48000; rng = np.random.default_rng(4)
def save(name, x):
    x = x / max(1e-9, np.abs(x).max()) * .8
    with wave.open(f"{C['out']}.{name}.wav", 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x * 32767).astype('<i2').tobytes())
T = lambda d: np.arange(int(d * sr)) / sr
t_ = T(.25); save('pop', np.sin(2 * np.pi * (900 - 2800 * t_) * t_) * np.exp(-22 * t_))
t_ = T(.8); save('ding', (np.sin(2 * np.pi * 1318 * t_) + .6 * np.sin(2 * np.pi * 1975 * t_)) * np.exp(-6 * t_))
t_ = T(.45); save('buzz', np.sign(np.sin(2 * np.pi * 110 * t_)) * np.exp(-3 * t_))
t_ = T(.3); save('stamp', np.convolve(rng.standard_normal(len(t_)), np.ones(30) / 30, 'same') * np.exp(-14 * t_) + np.sin(2 * np.pi * 70 * t_) * np.exp(-12 * t_))
t_ = T(.12); save('tick', np.sin(2 * np.pi * 2600 * t_) * np.exp(-50 * t_))
t_ = T(.3); save('tape', np.convolve(np.diff(rng.standard_normal(len(t_)), prepend=0), np.ones(3) / 3, 'same') * (.4 + .6 * np.sin(2 * np.pi * 70 * t_) ** 2) * np.exp(-7 * t_))
events = C.get('sfx', [])
ins, fl = ['-i', tmp, '-i', C['video']], []
for i, (k, at) in enumerate(events):
    ins += ['-i', C['whoosh'] if k == 'whoosh' else f"{C['out']}.{k}.wav"]; ms = max(0, int(at * 1000))
    fl.append(f"[{i + 2}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={ {'whoosh': .3, 'ding': .3, 'buzz': .25, 'tick': .4}.get(k, .5) },adelay={ms}|{ms}[e{i}]")
fl.append("[1:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=80,afftdn=nf=-25,loudnorm=I=-15:TP=-1.5,aresample=48000[vo]")
fl.append('[vo]' + ''.join(f'[e{i}]' for i in range(len(events))) + f"amix=inputs={len(events) + 1}:normalize=0:duration=first,alimiter=limit=0.95[a]")
vmap, vcodec = '0:v', ['-c:v', 'copy']
if C.get('pinterest'):
    fl.append('[0:v]crop=1080:1620:0:140,scale=1000:1500:flags=lanczos[pv]'); vmap, vcodec = '[pv]', ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18']
subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fl), '-map', vmap, '-map', '[a]', *vcodec, '-c:a', 'aac', '-b:a', '160k',
                '-shortest', '-movflags', '+faststart', C['out']], check=True)
print(C['out'], n, 'frames')
