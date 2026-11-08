# "Deals in my hand" video: the owner (cut out) talks in front of her website scrolling behind her;
# deal cards lift off the page, land on her open palm while she names them, and fly back; at the end
# all cards fan out in front of her. Her voice is kept; card moves get sound effects.
# python palm_video.py <config.json>
# config: { "video", "track", "site" (tall phone screenshot), "segmenter", "fonts", "out", "start", "end",
#           "date", "cta", "cards": [{"img", "label", "in", "out"}], "fan": {"in", "out"}, "cta_at", "whoosh" }
import json, math, subprocess, sys, os
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from ai_edge_litert.interpreter import Interpreter

C = json.load(open(sys.argv[1]))
W, H, FPS = 1080, 1920, 30
T0, T1 = C['start'], C['end']
DUR = T1 - T0
FONT = lambda size, w='ExtraBold': ImageFont.truetype(os.path.join(C['fonts'], f'Poppins-{w}.ttf'), size)
PINK, INK, SUN = (255, 61, 127), (59, 15, 58), (255, 212, 92)

# --- hand track (video pixels -> output pixels) ---
tr = json.load(open(C['track'])); vw, vh = tr['w'], tr['h']; S = W / vw
frames = tr['frames']; last = None; palms = []
for f in frames:
    if f.get('ok'): last = (f['palm'][0] * S, f['palm'][1] * S, f['size'] * S, f.get('open', 1))
    palms.append(last)
def palm_at(t):
    i = min(len(palms) - 1, max(0, int(round(t * tr['fps']))))
    window = [p for p in palms[max(0, i - 3):i + 4] if p]
    if not window: return None
    return tuple(float(np.mean([p[k] for p in window])) for k in range(4))

# --- cards with a label tab on top ---
def labelled(path, label):
    card = Image.open(path).convert('RGBA')
    f = FONT(64); tw = int(f.getlength(label)) + 70
    out = Image.new('RGBA', (max(card.width, tw), card.height + 110), (0, 0, 0, 0))
    out.alpha_composite(card, (0, 110))
    d = ImageDraw.Draw(out)
    d.rounded_rectangle((0, 0, tw, 120), radius=40, fill=PINK + (255,))
    d.text((35, 18), label, font=f, fill=(255, 255, 255))
    return out
cards = [dict(c, im=labelled(c['img'], c['label'])) for c in C['cards']]

def sprite(img, h, angle, alpha=1.0, shadow=1.0):
    s = img.resize((max(2, int(img.width * h / img.height)), max(2, int(h))), Image.LANCZOS)
    if alpha < 1: s.putalpha(s.getchannel('A').point(lambda a: int(a * alpha)))
    pad = int(h * .12)
    sh = Image.new('RGBA', (s.width + pad * 2, s.height + pad * 2), (0, 0, 0, 0))
    sh.paste((30, 10, 25, int(120 * alpha * shadow)), (pad, int(pad * 1.5), pad + s.width, int(pad * 1.5) + s.height), s.getchannel('A'))
    sh = sh.filter(ImageFilter.GaussianBlur(pad / 2.5)); sh.alpha_composite(s, (pad, pad))
    return sh.rotate(-angle, resample=Image.BICUBIC, expand=True)

def burst(off, r, rot):
    # big discount starburst: pink star with white outline, "-61%" and "OFF"
    size = int(r * 2.4); im = Image.new('RGBA', (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = size / 2
    pts = [(c + math.cos(i * math.pi / 12) * (r if i % 2 == 0 else r * .8), c + math.sin(i * math.pi / 12) * (r if i % 2 == 0 else r * .8)) for i in range(24)]
    d.polygon([(x + r * .05, y + r * .08) for x, y in pts], fill=(40, 10, 30, 90))
    d.polygon(pts, fill=PINK + (255,), outline=(255, 255, 255), width=max(3, int(r * .07)))
    f1, f2 = FONT(int(r * .62)), FONT(int(r * .32))
    w1 = f1.getlength(off); d.text((c - w1 / 2, c - r * .55), off, font=f1, fill=(255, 255, 255))
    w2 = f2.getlength('OFF'); d.text((c - w2 / 2, c + r * .12), 'OFF', font=f2, fill=SUN)
    return im.rotate(rot, resample=Image.BICUBIC, expand=True)

def ease_out_back(x, c=1.6):
    x = min(1, max(0, x)); return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2
def ease_in(x): x = min(1, max(0, x)); return x * x * x
def smooth(x): x = min(1, max(0, x)); return x * x * (3 - 2 * x)

# --- background: the site scrolling slowly behind her ---
Image.MAX_IMAGE_PIXELS = None
site = Image.open(C['site']).convert('RGB')
sw = site.width; view_h = int(sw * H / W)
scroll_start, scroll_px = int(sw * .9), min(site.height - view_h - int(sw * .9), int(DUR * 95 * sw / W))
def background(t):
    y = scroll_start + int(scroll_px * smooth(t / DUR) * .15 + scroll_px * .85 * (t / DUR))
    bg = site.crop((0, y, sw, y + view_h)).resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(3))
    return Image.blend(bg, Image.new('RGB', (W, H), (40, 12, 35)), .28)

# where cards come from: a card-sized spot on the background, upper right
SRC = (W * .78, H * .28)

seg = Interpreter(model_path=C['segmenter']); seg.allocate_tensors()
s_in, s_out = seg.get_input_details()[0]['index'], seg.get_output_details()[0]['index']
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', str(T0), '-t', str(DUR), '-i', C['video'], '-vf', f'fps={FPS},scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
tmp_video = C['out'] + '.video.mp4'
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', tmp_video], stdin=subprocess.PIPE)
prev_m, n = None, 0
date_tag = None
events = []
for c in cards: events += [('whoosh', c['in'] - T0), ('pop', c['in'] - T0 + .45), ('ding', c['in'] - T0 + .5), ('swish', c['out'] - T0)]
if C.get('fan'): events += [('whoosh', C['fan']['in'] - T0), ('pop', C['fan']['in'] - T0 + .6), ('swish', C['fan']['out'] - T0)]
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    t = T0 + n / FPS
    frame = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    seg.set_tensor(s_in, (cv2.resize(frame, (256, 256), interpolation=cv2.INTER_AREA).astype(np.float32) / 255)[None]); seg.invoke()
    m = cv2.resize(seg.get_tensor(s_out)[0, :, :, 0], (W, H), interpolation=cv2.INTER_LINEAR)
    m = np.clip((cv2.GaussianBlur(m, (9, 9), 0) - .3) / .4, 0, 1)
    prev_m = m if prev_m is None else prev_m * .4 + m * .6
    a = cv2.GaussianBlur(prev_m, (0, 0), 1.5)[..., None]
    bg = np.asarray(background(t - T0), np.float32)
    img = Image.fromarray((frame * a + bg * (1 - a)).astype(np.uint8)).convert('RGBA')

    # cards on her palm
    for c in cards:
        if not (c['in'] - .05 <= t <= c['out'] + .5): continue
        p = palm_at(min(max(t, c['in'] + .2), c['out']))
        if not p: continue
        px, py, ps, _ = p
        h = float(np.clip(ps * 2.6, H * .22, H * .30))
        slot = np.array([px, py - h * .62])
        slot[0] = np.clip(slot[0], h * .3, W - h * .3)
        ti, to = t - c['in'], t - c['out']
        if to > 0:   # back to the page
            e = ease_in(to / .45); pos = slot * (1 - e) + np.array(SRC) * e; hh = h * (1 - .75 * e); ang = -8 * e; al = 1 - e * .6
        else:        # lift off the page, overshoot onto her palm, gentle bob
            lin = min(1, ti / .5); e = ease_out_back(ti / .5)
            pos = np.array(SRC) * (1 - lin) + slot * lin + (slot - np.array(SRC)) * (e - lin) * .25
            hh = h * (.25 + .75 * min(1.05, e)); ang = (1 - lin) * -18 + math.sin(t * 2.3) * 2.5; al = min(1, ti / .12)
            pos = pos + np.array([0, math.sin(t * 2.6) * h * .012])
        sp = sprite(c['im'], hh, ang, al)
        img.alpha_composite(sp, (int(pos[0] - sp.width / 2), int(pos[1] - sp.height / 2)))
        if c.get('off') and to <= 0 and ti > .4:
            k = ease_out_back((ti - .4) / .35, 2.2)
            r = h * .19 * k
            if r < 12: continue
            bx = pos[0] + hh * .3 * (1 if pos[0] < W * .62 else -1); by = pos[1] - hh * .42
            b = burst(c['off'], r, 12 * (1 if bx > pos[0] else -1) + math.sin(t * 4) * 3)
            img.alpha_composite(b, (int(bx - b.width / 2), int(by - b.height / 2)))

    # all cards fanned in front of her
    if C.get('fan') and C['fan']['in'] <= t <= C['fan']['out'] + .7:
        fi, fo = t - C['fan']['in'], t - C['fan']['out']; N = len(cards)
        h = H * .26; pivot = np.array([W / 2, H * .93])
        for i, c in enumerate(cards):
            ang0 = (i - (N - 1) / 2) * 13; r = H * .42
            slot = pivot + np.array([math.sin(math.radians(ang0)) * r, -math.cos(math.radians(ang0)) * r])
            ti = fi - i * .1; to = fo - (N - 1 - i) * .06
            if ti < 0 or to > .5: continue
            if to > 0: e = ease_in(to / .45); pos = slot * (1 - e) + np.array(SRC) * e; hh = h * (1 - .75 * e); ang = ang0 * (1 - e); al = 1 - .6 * e
            else:
                lin = min(1, ti / .55); e = ease_out_back(ti / .55)
                pos = np.array(SRC) * (1 - lin) + slot * lin; hh = h * (.25 + .75 * min(1.05, e)); ang = ang0 * min(1, e); al = min(1, ti / .12)
                pos = pos + np.array([0, math.sin(t * 2.2 + i) * h * .01])
            sp = sprite(c['im'], hh, ang, al)
            img.alpha_composite(sp, (int(pos[0] - sp.width / 2), int(pos[1] - sp.height / 2)))

    d = ImageDraw.Draw(img)
    # date tag, top
    f1 = FONT(50); txt = f"TOP DEALS TODAY · {C['date']}"; tw = f1.getlength(txt)
    ty = C.get('tag_y', 120)
    d.rounded_rectangle((W / 2 - tw / 2 - 34, ty, W / 2 + tw / 2 + 34, ty + 90), radius=45, fill=INK + (235,))
    d.text((W / 2 - tw / 2, ty + 13), txt, font=f1, fill=SUN)
    # call to action sticker
    if C.get('cta_at') and C['cta_at'][0] <= t <= C['cta_at'][1]:
        k = ease_out_back((t - C['cta_at'][0]) / .4); f2 = FONT(int(64 * min(1.1, k)) or 1); txt = C['cta']; tw = f2.getlength(txt)
        cy = H * .74
        d.rounded_rectangle((W / 2 - tw / 2 - 40, cy - 60, W / 2 + tw / 2 + 40, cy + 60), radius=60, fill=PINK + (255,), outline=(255, 255, 255), width=6)
        d.text((W / 2 - tw / 2, cy - 44), txt, font=f2, fill=(255, 255, 255))
    enc.stdin.write(img.convert('RGB').tobytes()); n += 1
enc.stdin.close(); enc.wait()

# --- audio: her voice + effects ---
import wave
sr = 48000; rng = np.random.default_rng(3)
def save(name, x):
    x = x / max(1e-9, np.abs(x).max()) * .8
    with wave.open(f"{C['out']}.{name}.wav", 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x * 32767).astype('<i2').tobytes())
T = lambda d: np.arange(int(d * sr)) / sr
t_ = T(.8); save('ding', (np.sin(2 * np.pi * 1318 * t_) + .6 * np.sin(2 * np.pi * 1975 * t_)) * np.exp(-6 * t_))
t_ = T(.25); save('pop', np.sin(2 * np.pi * (900 - 2800 * t_) * t_) * np.exp(-22 * t_))
t_ = T(.35); nz = np.diff(rng.standard_normal(len(t_)), prepend=0); save('swish', np.convolve(nz, np.ones(8) / 8, 'same') * np.sin(np.pi * t_ / .35) ** 2)
ins, fl = ['-i', tmp_video, '-ss', str(T0), '-t', str(DUR), '-i', C['video']], []
for i, (k, at) in enumerate(events):
    ins += ['-i', C['whoosh'] if k == 'whoosh' else f"{C['out']}.{k}.wav"]; ms = max(0, int(at * 1000))
    fl.append(f"[{i + 2}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={ {'whoosh': .35, 'ding': .3}.get(k, .5) },adelay={ms}|{ms}[e{i}]")
fl.append("[1:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=80,afftdn=nf=-25,loudnorm=I=-15:TP=-1.5,aresample=48000[vo]")
fl.append('[vo]' + ''.join(f'[e{i}]' for i in range(len(events))) + f"amix=inputs={len(events) + 1}:normalize=0:duration=first,alimiter=limit=0.95[a]")
vcodec = ['-c:v', 'copy']
if C.get('pinterest'):   # 2:3 for Pinterest: keep y 140-1760, scale to 1000x1500
    fl.append('[0:v]crop=1080:1620:0:140,scale=1000:1500:flags=lanczos[pv]'); vcodec = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18']
subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fl), '-map', '[pv]' if C.get('pinterest') else '0:v', '-map', '[a]', *vcodec, '-c:a', 'aac', '-b:a', '160k',
                '-shortest', '-movflags', '+faststart', C['out']], check=True)
print(C['out'], f'{n} frames')
