# Snowy background for the Instagram Reel: the pink gradient (or the cover image for the first seconds)
# with falling snow, written straight to a video. python snow-bg.py <cover.png> <cover_secs> <total_secs> <out.mp4> [WxH]
# Size defaults to 1080x1920 (Reels/TikTok); use 1000x1500 for Pinterest.
import math, random, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
cover_f, cover_secs, total, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
W, H = map(int, (sys.argv[5] if len(sys.argv) > 5 else '1080x1920').split('x'))
FPS = 30
rnd = random.Random(11)
# gradient matching the cover: pink at the top-left to coral at the bottom
yy, xx = np.mgrid[0:H, 0:W]
k = np.clip((xx * 600 / W * 0 + yy) / H * .85 + xx / W * .15, 0, 1)[..., None]
grad = (np.array([255, 61, 127]) * (1 - k) + np.array([255, 138, 61]) * k).astype(np.uint8)
bg = Image.fromarray(grad, 'RGB').convert('RGBA')
cover = Image.open(cover_f).convert('RGBA').resize((W, H))
# three depths of flakes: far (small, slow, soft), mid, near (big, fast)
layers = []
for n, (r0, r1), (v0, v1), alpha, blur in [(110, (1.5, 3), (40, 80), 130, 0.8), (70, (3, 5), (80, 140), 175, 1.0), (28, (5, 8.5), (140, 220), 215, 1.6)]:
    layers.append(([dict(x=rnd.uniform(0, W), y=rnd.uniform(0, H), r=rnd.uniform(r0, r1), v=rnd.uniform(v0, v1),
                         sway=rnd.uniform(8, 36), ph=rnd.uniform(0, 6.3), sp=rnd.uniform(.6, 1.4)) for _ in range(n)], alpha, blur))
sparkles = [dict(x=rnd.uniform(40, W - 40), y=rnd.uniform(40, H - 40), ph=rnd.uniform(0, 6.3)) for _ in range(16)]
ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                       '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
for f in range(int(total * FPS)):
    t = f / FPS
    frame = (cover if t < cover_secs else bg).copy()
    for flakes, alpha, blur in layers:
        lay = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(lay)
        for s in flakes:
            y = (s['y'] + s['v'] * t) % (H + 40) - 20
            x = (s['x'] + s['sway'] * math.sin(t * s['sp'] + s['ph'])) % W
            d.ellipse([x - s['r'], y - s['r'], x + s['r'], y + s['r']], fill=(255, 255, 255, alpha))
        frame = Image.alpha_composite(frame, lay.filter(ImageFilter.GaussianBlur(blur)))
    sp = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(sp)
    for s in sparkles:
        a = max(0, math.sin(t * 2.2 + s['ph'])) ** 3
        if a > .05:
            r = 10 + 8 * a; c = (255, 255, 255, int(220 * a))
            d.line([s['x'] - r, s['y'], s['x'] + r, s['y']], fill=c, width=3); d.line([s['x'], s['y'] - r, s['x'], s['y'] + r], fill=c, width=3)
    frame = Image.alpha_composite(frame, sp)
    ff.stdin.write(frame.convert('RGB').tobytes())
ff.stdin.close(); ff.wait(); print(out)
