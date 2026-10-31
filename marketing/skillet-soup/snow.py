# Falling snow + warm bokeh as transparent PNG frames (1080x1920).  python snow.py <outDir> <seconds> <fps>
import sys, os, random, math
from PIL import Image, ImageDraw, ImageFilter
out, secs, fps = sys.argv[1], float(sys.argv[2]), int(sys.argv[3]); os.makedirs(out, exist_ok=True)
W, H = 1080, 1920; rnd = random.Random(7)
flakes = [dict(x=rnd.uniform(0, W), y=rnd.uniform(-H, H), r=rnd.uniform(2, 7), v=rnd.uniform(60, 170), sway=rnd.uniform(10, 40), ph=rnd.uniform(0, 6)) for _ in range(140)]
bokeh = [dict(x=rnd.uniform(0, W), y=rnd.uniform(0, H * .45), r=rnd.uniform(18, 46), ph=rnd.uniform(0, 6)) for _ in range(14)]
for f in range(int(secs * fps)):
    t = f / fps
    glow = Image.new('RGBA', (W, H)); g = ImageDraw.Draw(glow)
    for b in bokeh:
        a = int(38 + 22 * math.sin(t * 1.3 + b['ph']))
        g.ellipse([b['x'] - b['r'], b['y'] - b['r'], b['x'] + b['r'], b['y'] + b['r']], fill=(255, 200, 120, a))
    glow = glow.filter(ImageFilter.GaussianBlur(10))
    snow = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(snow)
    for s in flakes:
        y = (s['y'] + s['v'] * t) % (H + 40) - 20; x = s['x'] + s['sway'] * math.sin(t * 1.1 + s['ph'])
        d.ellipse([x - s['r'], y - s['r'], x + s['r'], y + s['r']], fill=(255, 255, 255, 200 if s['r'] > 4 else 150))
    snow = snow.filter(ImageFilter.GaussianBlur(1.2))
    Image.alpha_composite(glow, snow).save(os.path.join(out, f'{f:04d}.png'), compress_level=1)
