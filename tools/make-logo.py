# Builds the UBottega badge logo (public/img/logo-badge.svg): the two shopping bags from the hero art,
# "UBottega" on the front bag and "BY DATA DARLING" around the ring. Letters are converted to outlines
# (Poppins, SIL Open Font License) so the logo looks the same everywhere, even where the font isn't installed.
# python tools/make-logo.py <dir with Poppins-ExtraBold.ttf> <out.svg>
import math, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

font_dir, out = sys.argv[1:3]
F = TTFont(f'{font_dir}/Poppins-ExtraBold.ttf')
gs, cmap, hmtx, upm = F.getGlyphSet(), F.getBestCmap(), F['hmtx'], F['head'].unitsPerEm

def glyph(ch, matrix):
    pen = SVGPathPen(gs); gs[cmap[ord(ch)]].draw(TransformPen(pen, matrix)); return pen.getCommands()

def adv(ch, size, track=0):
    return hmtx[cmap[ord(ch)]][0] * size / upm + track

def line(text, size, x, y, track=0):
    """Text along a straight baseline starting at x (left), y."""
    s, d = size / upm, []
    for ch in text:
        if ch != ' ': d.append(glyph(ch, (s, 0, 0, -s, x, y)))
        x += adv(ch, size, track)
    return ' '.join(d)

def width(text, size, track=0):
    return sum(adv(ch, size, track) for ch in text) - track

def ring(items, size, cx, cy, r):
    """Glyphs and separator stars spread evenly around a circle, clockwise from the top.
    items: list of strings; '*' means a star. Returns (glyph path, list of star centres)."""
    seq = [ch for it in items for ch in it]
    widths = [size * .9 if ch == '*' else adv(ch, size) for ch in seq]
    track = (2 * math.pi * r - sum(widths)) / len(seq)  # spread to fill the whole circle
    first = len(items[0])  # start so the first phrase is centred at the top
    s, d, stars = size / upm, [], []
    pos = -(sum(widths[:first]) + track * (first - 1)) / 2
    for ch, w in zip(seq, widths):
        th = (pos + w / 2) / r; pos += w + track
        if ch == '*': stars.append((cx + r * math.sin(th) + size * .33 * math.sin(th), cy - r * math.cos(th) - size * .33 * math.cos(th), th)); continue
        if ch == ' ': continue
        a, b = s * math.cos(th), s * math.sin(th)
        e = cx - (w / 2) * math.cos(th) + r * math.sin(th)
        f = cy - (w / 2) * math.sin(th) - r * math.cos(th)
        d.append(glyph(ch, (a, b, b, -a, e, f)))
    return ' '.join(d), stars

def star(x, y, r, rot=0):
    pts = []
    for i in range(8):
        a = rot + i * math.pi / 4; rr = r if i % 2 == 0 else r * .38
        pts.append(f'{x + rr * math.sin(a):.1f},{y - rr * math.cos(a):.1f}')
    return 'M' + ' L'.join(pts) + 'Z'

C = 256
ring_d, stars = ring(['BY DATA DARLING', '*', 'BY DATA DARLING', '*'], 31, C, C, 210)
star_d = ' '.join(star(x, y, 13, th) for x, y, th in stars)
# "UBottega" across the front bag (bag is 170 wide, centred on x=0 in its own frame)
u_w, word_w = width('U', 33), width('UBottega', 33, -0.5)
u_d = line('U', 33, -word_w / 2, 0)
rest_d = line('Bottega', 33, -word_w / 2 + u_w - 0.5, 0, -0.5)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="UBottega by Data Darling">
  <defs>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff3d7f"/><stop offset="1" stop-color="#ff8a4c"/></linearGradient>
    <linearGradient id="bag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#ffe3ec"/></linearGradient>
    <linearGradient id="bag2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd23f"/><stop offset="1" stop-color="#ffb02e"/></linearGradient>
  </defs>
  <circle cx="256" cy="256" r="252" fill="url(#ring)"/>
  <circle cx="256" cy="256" r="178" fill="#3b0f3a"/>
  <circle cx="256" cy="256" r="178" fill="none" stroke="#ffd23f" stroke-width="5"/>
  <path d="{ring_d}" fill="#fff"/>
  <path d="{star_d}" fill="#ffd23f"/>
  <!-- back bag -->
  <g transform="translate(300 262) rotate(10)">
    <path d="M-34 -78c0-24 15-39 34-39s34 15 34 39" fill="none" stroke="#ffd23f" stroke-width="9" stroke-linecap="round"/>
    <rect x="-66" y="-80" width="132" height="150" rx="16" fill="url(#bag2)"/>
    <rect x="-66" y="-80" width="132" height="22" rx="11" fill="#000" opacity=".07"/>
  </g>
  <!-- front bag with the name -->
  <g transform="translate(232 282) rotate(-7)">
    <path d="M-38 -84c0-28 17-45 38-45s38 17 38 45" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
    <rect x="-90" y="-86" width="180" height="172" rx="20" fill="url(#bag)"/>
    <rect x="-90" y="-86" width="180" height="24" rx="12" fill="#000" opacity=".05"/>
    <g transform="translate(0 22)"><path d="{u_d}" fill="#ff3d7f"/><path d="{rest_d}" fill="#3b0f3a"/></g>
    <path d="M-50 44 Q0 58 50 44" fill="none" stroke="#ff3d7f" stroke-width="5" stroke-linecap="round"/>
  </g>
  <!-- sparkles -->
  <path d="{star(138, 160, 14)} {star(384, 168, 10)} {star(372, 360, 8)}" fill="#ffd23f"/>
  <path d="{star(150, 352, 7)}" fill="#fff"/>
</svg>
'''
open(out, 'w').write(svg)
print(out, len(svg), 'bytes')
