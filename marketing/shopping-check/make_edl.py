# Writes edl.json for the "shopping my Top 50" video (recording shopping11-2).
# Times are seconds in the recording; voice parts play at SPEED and are cut at pauses.
import json, sys
SPEED = 1.2
BW, BH, PW, PH, PY = 403, 423, 1080, 1134, 180

def at_frame(cx, cy, z):
    """frame position of browser point (cx, cy) (fractions) once zoomed in on it by z."""
    vw, vh = 1 / z, 1 / z
    x0 = min(max(cx - vw / 2, 0), 1 - vw); y0 = min(max(cy - vh / 2, 0), 1 - vh)
    return round((cx - x0) / vw * PW), round(PY + (cy - y0) / vh * PH)

segs = []
def voice(id, a, b, **kw):
    secs = round((b - a) / SPEED, 2); segs.append(dict(id=id, src=[a, b], secs=secs, voice=True, **kw)); return secs
def skim(id, a, b, secs=2.4):
    segs.append(dict(id=id, kind='skim', src=[a, b], secs=secs, badge=f'▶▶ x{round((b - a) / secs)}',
                     sfx=[['whoosh', 0], ['tick', .2]]))

def product(id, a, b, n, title, sub, off, cx, cy, stickers, z=1.7, extra_sfx=()):
    secs = round((b - a) / SPEED, 2)
    px, py = at_frame(cx, cy, z)
    st = [dict(s, x=s.get('x', 540), y=s.get('y', 1220)) for s in stickers]
    sfx = [['whoosh', 0], ['pop', .4], ['shutter', 1.0]] + [['boing' if s.get('boing') else 'pop', s['at']] for s in stickers] + list(extra_sfx)
    segs.append(dict(id=id, src=[a, b], secs=secs, voice=True, n=n, chip=f'FIND #{n}', title=title, sub=sub, off=off,
                     zoom=dict(start=1.0, end=3.0, cx=cx, cy=cy, **{'from': 1.0, 'to': z}),
                     rings=[dict(x=px + 40, y=py, rx=230, ry=78, at=3.1)], sfx=sfx, stickers=st))

segs.append(dict(id='hook', src=[0.1, 7.5], secs=round(7.4 / SPEED, 2), voice=True,
                 lines=[{'text': 'I shopped my own'}, {'text': 'Top 50 deals', 'colour': '#ff3d7f', 'size': 84}, {'text': 'Real deal or not?', 'size': 52}],
                 sfx=[['pop', .1], ['riser', .2], ['ding', 1.1]]))
voice('intro', 12.9, 25.2, chip='GREAT DEALS DAILY', title="Today's Top 50", sub='Marked down from their usual price',
      sfx=[['whoosh', 0]])
skim('s1', 25.2, 56.6)
product('f1', 56.6, 73.4, 1, 'AUTOMET Oversized Top', 'Long sleeve, relaxed fall fit', '-60%', .53, .51,
        [dict(text='Cozy fall staple', at=5.5, rot=-6, x=300, y=1230)])
skim('s2', 73.4, 148.6)
product('f2', 148.6, 168.0, 2, 'TNNZEET Long-Sleeve Top', 'Fitted crop top, lots of colours', '-54%', .52, .57,
        [dict(text='Price changes by colour!', at=7.0, rot=-4, x=470, y=1235, colour='#3fb8ff', boing=True)])
skim('s3', 168.0, 242.8)
product('f3', 242.8, 262.2, 3, 'Cotton Briefs 5-Pack', 'High-waisted, full coverage', '-33%', .53, .32,
        [dict(text='Price changes by size, too!', at=7.0, rot=5, x=470, y=1235, colour='#3fb8ff', boing=True)])
skim('s4', 262.2, 319.4)
product('f4', 319.4, 339.8, 4, 'CAROTE 21-pc Pots & Pans', 'Nonstick, detachable handles', '-40%', .70, .66,
        [dict(text="Amazon's Choice", at=6.0, rot=-5, x=290, y=1230), dict(text='Is it really a deal?', at=12.0, rot=4, x=600, y=330, colour='#ff3d7f')])
skim('s5', 339.8, 356.7, secs=1.6)
gx, gy = at_frame(.45, .41, 1.5)
segs.append(dict(id='g1', src=[356.7, 369.0], secs=round(12.3 / SPEED, 2), voice=True, chip='PRICE CHECK', chipColour='#3fb8ff',
                 title='I Googled its price history', sub='CAROTE 21-pc set',
                 zoom={'from': 1.0, 'to': 1.5, 'cx': .45, 'cy': .41, 'start': .8, 'end': 3.0},
                 rings=[dict(x=gx, y=gy, rx=470, ry=60, at=3.4, colour='#1fc79a')],
                 stickers=[dict(text='Lowest price on record!', at=4.4, rot=-4, x=540, y=gy + 150, colour='#1fc79a')],
                 sfx=[['whoosh', 0], ['click', .3], ['shutter', .8], ['pop', 4.4]]))
v2 = round((381.1 - 369.9) / SPEED, 2)
segs.append(dict(id='g2', src=[369.9, 381.1], secs=v2 + 2.4, voice=True, chip='PRICE CHECK', chipColour='#3fb8ff',
                 title='CAROTE 21-pc Pots & Pans', sub='Verdict', off='-40%',
                 verdict=dict(kind='yes', label='REAL DEAL', line='At its lowest recorded price', at=v2 - 2.2),
                 sfx=[['riser', v2 - 3.0], ['ding', v2 - 1.9], ['chime', v2 - 1.6]]))
skim('s6', 381.1, 442.8)
product('f5', 442.8, 461.3, 5, 'adidas Daily 4.0 Sneakers', "Men's casual low-tops", '-40%', .65, .26,
        [dict(text='Other colours cost more', at=7.0, rot=-4, x=470, y=1235, colour='#3fb8ff', boing=True)])
skim('s7', 461.3, 521.6)
product('f6', 521.6, 542.6, 6, 'CAROTE Titanium 21-pc Set', 'Limited time deal', '-36%', .70, .66,
        [dict(text='Limited time deal!', at=5.0, rot=-5, x=320, y=1230, colour='#e0344f'),
         dict(text="Check today's price", at=11.0, rot=4, x=600, y=330)])
segs.append(dict(id='outro', src=[598.8, 599.0], hold=True, secs=4.2,
                 lines=[{'text': 'Which one would', 'size': 60}, {'text': 'you grab?', 'size': 60}, {'text': 'Links in my bio', 'colour': '#ff3d7f', 'size': 66},
                        {'text': '#ad  As an Amazon Associate', 'size': 34}, {'text': 'I earn from qualifying purchases', 'size': 34}],
                 sfx=[['whoosh', 0], ['pop', .2], ['chime', .6]]))
json.dump({'segments': segs}, open(sys.argv[1], 'w'), indent=1)
print(round(sum(s['secs'] for s in segs), 1), 's total')
