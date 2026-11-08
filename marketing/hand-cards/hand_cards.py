# Puts a fan of deal cards on the owner's hand: the cards fly in from the page, land fanned above her palm,
# follow her hand while she talks, then fly back. Uses the per-frame palm data from hand_track.py.
# python hand_cards.py <video> <track.json> <cards dir with card1.png..cardN.png> <start s> <end s> <out.mp4> [from x,y]
#   from x,y = where the cards come from (e.g. a spot on the website behind her); default top centre
import json, math, subprocess, sys, glob
import numpy as np
from PIL import Image, ImageFilter

src, track_f, cards_dir, T0, T1, out = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
tr = json.load(open(track_f)); W, H, FPS = tr['w'], tr['h'], tr['fps']
FROM = tuple(float(v) for v in sys.argv[7].split(',')) if len(sys.argv) > 7 else (W / 2, -H * .1)
cards = [Image.open(f).convert('RGBA') for f in sorted(glob.glob(f'{cards_dir}/card*.png'))]
N = len(cards)

# palm track with gaps filled (hold the last good position) and extra smoothing
frames = tr['frames']; palm, size = [], []
last = None
for f in frames:
    if f.get('ok'): last = (f['palm'], f['size'])
    palm.append(last[0] if last else None); size.append(last[1] if last else None)
first = next((p for p in palm if p), [W / 2, H * .7]); fsz = next((s for s in size if s), H * .08)
palm = np.array([p or first for p in palm], np.float32); size = np.array([s or fsz for s in size], np.float32)
k = np.ones(5) / 5
palm = np.stack([np.convolve(np.pad(palm[:, i], 2, mode='edge'), k, mode='valid') for i in (0, 1)], 1)
size = np.convolve(np.pad(size, 2, mode='edge'), k, mode='valid')

def ease_out_back(x):
    x = min(1, max(0, x)); c = 1.4
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2

def card_sprite(img, h, angle, alpha=1.0):
    s = img.resize((max(2, int(img.width * h / img.height)), max(2, int(h))), Image.LANCZOS)
    if alpha < 1: s.putalpha(s.getchannel('A').point(lambda a: int(a * alpha)))
    sh = Image.new('RGBA', (s.width + 40, s.height + 40), (0, 0, 0, 0))
    sh.paste((40, 15, 35, int(110 * alpha)), (20, 30, 20 + s.width, 30 + s.height), s.getchannel('A'))
    sh = sh.filter(ImageFilter.GaussianBlur(10)); sh.alpha_composite(s, (20, 20))
    return sh.rotate(-angle, resample=Image.BICUBIC, expand=True)

FAN = np.linspace(-26, 26, N) if N > 1 else np.array([0.0])
IN_DUR, STAGGER, OUT_DUR = .55, .14, .45
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', f'{FPS:.3f}', '-i', '-', '-i', src,
                        '-map', '0:v', '-map', '1:a?', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'copy', out], stdin=subprocess.PIPE)
n = 0
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    t = n / FPS
    if T0 <= t <= T1 + OUT_DUR + STAGGER * N:
        frame = Image.frombytes('RGB', (W, H), buf).convert('RGBA')
        i_f = min(n, len(palm) - 1); px, py = palm[i_f]; ps = size[i_f]
        card_h = float(np.clip(ps * 2.4, H * .12, H * .30))
        pivot = np.array([px, py + card_h * .35])                     # fan pivot just below the palm
        for i in range(N):
            ti = t - T0 - i * STAGGER
            to = t - T1 - (N - 1 - i) * STAGGER * .6
            a = math.radians(FAN[i]); r = card_h * .95
            slot = pivot + np.array([math.sin(a) * r, -math.cos(a) * r])
            if ti < 0 or to > OUT_DUR: continue
            if to > 0:                                                  # flying back to the page
                e = min(1, to / OUT_DUR) ** 2
                pos = slot * (1 - e) + np.array(FROM) * e; hh = card_h * (1 - .7 * e); ang = FAN[i] * (1 - e); al = 1 - .5 * e
            else:                                                       # flying in, then resting with a gentle bob
                e = ease_out_back(ti / IN_DUR); lin = min(1, ti / IN_DUR)
                pos = np.array(FROM) * (1 - lin) + slot * lin
                pos = pos + (slot - pos) * (e - lin)                    # overshoot
                hh = card_h * (.3 + .7 * min(1, e)); ang = FAN[i] * min(1, e) + (1 - lin) * 25
                pos = pos + np.array([0, math.sin(t * 2.2 + i) * card_h * .015]); al = min(1, ti / .15)
            spr = card_sprite(cards[i], hh, ang, al)
            frame.alpha_composite(spr, (int(pos[0] - spr.width / 2), int(pos[1] - spr.height / 2)))
        buf = frame.convert('RGB').tobytes()
    enc.stdin.write(buf); n += 1
enc.stdin.close(); enc.wait(); print(out, n, 'frames')
