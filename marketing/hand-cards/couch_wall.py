# "Couch wall": deal cards get pinned (taped) on the real wall BEHIND the owner while she talks.
# She is cut out per frame and drawn over the cards, so her hair/shoulders cover their edges.
# python couch_wall.py <config.json>
# config: {"video","segmenter","fonts","whoosh","out","date","cta","cta_at":[a,b],
#          "pins":[{"img","label","off","at","x","y","h","rot"}]}   (x,y,h in 1080x1920 output pixels)
#          optional "pinterest": true -> 1000x1500 crop, "tag_y"
import json, math, os, subprocess, sys, wave
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from ai_edge_litert.interpreter import Interpreter

C = json.load(open(sys.argv[1]))
W, H, FPS = 1080, 1920, 30
FONT = lambda size: ImageFont.truetype(os.path.join(C['fonts'], 'Poppins-ExtraBold.ttf'), max(1, int(size)))
PINK, INK, SUN = (255, 61, 127), (59, 15, 58), (255, 212, 92)
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', C['video']], capture_output=True, text=True).stdout)

def ease_out_back(x, c=1.7):
    x = min(1, max(0, x)); return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2

def pin_image(p):
    """card + label tab + tape strip + corner discount sticker, ready to place"""
    card = Image.open(p['img']).convert('RGBA')
    s = p['h'] / card.height; card = card.resize((int(card.width * s), int(p['h'])), Image.LANCZOS)
    pad = int(p['h'] * .2); out = Image.new('RGBA', (card.width + pad * 2, card.height + pad * 2), (0, 0, 0, 0))
    sh = Image.new('RGBA', out.size, (0, 0, 0, 0)); sh.paste((20, 5, 15, 140), (pad + 8, pad + 14, pad + 8 + card.width, pad + 14 + card.height), card.getchannel('A'))
    out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(pad / 4))); out.alpha_composite(card, (pad, pad))
    d = ImageDraw.Draw(out)
    # label tab
    f = FONT(p['h'] * .065); lw = f.getlength(p['label']) + p['h'] * .06
    d.rounded_rectangle((pad, pad - p['h'] * .085, pad + lw, pad - p['h'] * .005), radius=int(p['h'] * .03), fill=PINK + (255,))
    d.text((pad + p['h'] * .03, pad - p['h'] * .078), p['label'], font=f, fill=(255, 255, 255))
    # tape across the top centre
    tw, th = card.width * .45, p['h'] * .06; tx, ty = pad + card.width / 2, pad + p['h'] * .01
    tape = Image.new('RGBA', (int(tw), int(th)), (255, 247, 215, 200)); tape = tape.rotate(-4, expand=True, resample=Image.BICUBIC)
    out.alpha_composite(tape, (int(tx - tape.width / 2), int(ty - tape.height / 2)))
    # discount sticker on the bottom corner
    if p.get('off'):
        r = p['h'] * .17; size = int(r * 2.4); b = Image.new('RGBA', (size, size), (0, 0, 0, 0)); bd = ImageDraw.Draw(b); c = size / 2
        pts = [(c + math.cos(i * math.pi / 12) * (r if i % 2 == 0 else r * .8), c + math.sin(i * math.pi / 12) * (r if i % 2 == 0 else r * .8)) for i in range(24)]
        bd.polygon(pts, fill=PINK + (255,), outline=(255, 255, 255), width=max(3, int(r * .07)))
        f1, f2 = FONT(r * .6), FONT(r * .3)
        bd.text((c - f1.getlength(p['off']) / 2, c - r * .55), p['off'], font=f1, fill=(255, 255, 255))
        bd.text((c - f2.getlength('OFF') / 2, c + r * .12), 'OFF', font=f2, fill=SUN)
        b = b.rotate(-10, expand=True, resample=Image.BICUBIC)
        out.alpha_composite(b, (int(pad + card.width - b.width * .6), int(pad + card.height - b.height * .75)))
    return out.rotate(-p.get('rot', 0), expand=True, resample=Image.BICUBIC)

pins = [dict(p, im=pin_image(p)) for p in C['pins']]
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
    frame = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    seg.set_tensor(s_in, (cv2.resize(frame, (256, 256), interpolation=cv2.INTER_AREA).astype(np.float32) / 255)[None]); seg.invoke()
    m = cv2.resize(seg.get_tensor(s_out)[0, :, :, 0], (W, H), interpolation=cv2.INTER_LINEAR)
    m = np.clip((cv2.GaussianBlur(m, (9, 9), 0) - .3) / .4, 0, 1)
    prev = m if prev is None else prev * .4 + m * .6
    a = cv2.GaussianBlur(prev, (0, 0), 1.5)[..., None]
    wall = Image.fromarray(frame).convert('RGBA')
    for p in pins:                                    # pinned cards go on the wall layer
        if t < p['at']: continue
        k = ease_out_back((t - p['at']) / .35)
        sc = 1.35 - .35 * min(1, k) if k < 1 else 1 + (k - 1) * .5
        im = p['im'] if abs(sc - 1) < .005 else p['im'].resize((max(2, int(p['im'].width * sc)), max(2, int(p['im'].height * sc))), Image.BILINEAR)
        if t - p['at'] < .12: im.putalpha(im.getchannel('A').point(lambda v, q=(t - p['at']) / .12: int(v * q)))
        wall.alpha_composite(im, (int(p['x'] - im.width / 2), int(p['y'] - im.height / 2)))
    wall = np.asarray(wall.convert('RGB'), np.float32)
    img = Image.fromarray((frame * a + wall * (1 - a)).astype(np.uint8)).convert('RGBA')   # her on top
    d = ImageDraw.Draw(img)
    f1 = FONT(50); txt = f"TOP DEALS TODAY · {C['date']}"; tw = f1.getlength(txt); ty = C.get('tag_y', 120)
    d.rounded_rectangle((W / 2 - tw / 2 - 34, ty, W / 2 + tw / 2 + 34, ty + 90), radius=45, fill=INK + (235,))
    d.text((W / 2 - tw / 2, ty + 13), txt, font=f1, fill=SUN)
    if C.get('cta_at') and C['cta_at'][0] <= t <= C['cta_at'][1]:
        k = ease_out_back((t - C['cta_at'][0]) / .4); f2 = FONT(64 * min(1.1, max(.05, k))); txt = C['cta']; tw = f2.getlength(txt); cy = H * .74
        d.rounded_rectangle((W / 2 - tw / 2 - 40, cy - 60, W / 2 + tw / 2 + 40, cy + 60), radius=60, fill=PINK + (255,), outline=(255, 255, 255), width=6)
        d.text((W / 2 - tw / 2, cy - 44), txt, font=f2, fill=(255, 255, 255))
    enc.stdin.write(img.convert('RGB').tobytes()); n += 1
enc.stdin.close(); enc.wait()

# audio: her voice + a tape rip and a pop for each pin, a ding as the sticker lands
sr = 48000; rng = np.random.default_rng(9)
def save(name, x):
    x = x / max(1e-9, np.abs(x).max()) * .8
    with wave.open(f"{C['out']}.{name}.wav", 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x * 32767).astype('<i2').tobytes())
T = lambda d: np.arange(int(d * sr)) / sr
t_ = T(.3); save('tape', np.convolve(np.diff(rng.standard_normal(len(t_)), prepend=0), np.ones(3) / 3, 'same') * (.4 + .6 * np.sin(2 * np.pi * 70 * t_) ** 2) * np.exp(-7 * t_))
t_ = T(.25); save('pop', np.sin(2 * np.pi * (900 - 2800 * t_) * t_) * np.exp(-22 * t_))
t_ = T(.8); save('ding', (np.sin(2 * np.pi * 1318 * t_) + .6 * np.sin(2 * np.pi * 1975 * t_)) * np.exp(-6 * t_))
events = []
for p in pins: events += [('whoosh', p['at'] - .15), ('pop', p['at'] + .1), ('tape', p['at'] + .2), ('ding', p['at'] + .35)]
if C.get('cta_at'): events.append(('pop', C['cta_at'][0]))
ins, fl = ['-i', tmp, '-i', C['video']], []
for i, (k, at) in enumerate(events):
    ins += ['-i', C['whoosh'] if k == 'whoosh' else f"{C['out']}.{k}.wav"]; ms = max(0, int(at * 1000))
    fl.append(f"[{i + 2}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={ {'whoosh': .3, 'ding': .25, 'tape': .4}.get(k, .5) },adelay={ms}|{ms}[e{i}]")
fl.append("[1:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=80,afftdn=nf=-25,loudnorm=I=-15:TP=-1.5,aresample=48000[vo]")
fl.append('[vo]' + ''.join(f'[e{i}]' for i in range(len(events))) + f"amix=inputs={len(events) + 1}:normalize=0:duration=first,alimiter=limit=0.95[a]")
vmap, vcodec = '0:v', ['-c:v', 'copy']
if C.get('pinterest'):
    fl.append('[0:v]crop=1080:1620:0:140,scale=1000:1500:flags=lanczos[pv]'); vmap, vcodec = '[pv]', ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18']
subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fl), '-map', vmap, '-map', '[a]', *vcodec, '-c:a', 'aac', '-b:a', '160k',
                '-shortest', '-movflags', '+faststart', C['out']], check=True)
print(C['out'], n, 'frames')
