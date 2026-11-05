# An original, royalty-free holiday jingle (no samples, no existing melodies): glockenspiel melody,
# sleigh bells, soft bass and warm chords, 120 bpm in C major. python jingle.py <seconds> <out.wav>
import sys, wave
import numpy as np
secs, out = float(sys.argv[1]), sys.argv[2]
SR, BPM = 48000, 120
beat = 60 / BPM
n = int(secs * SR)
L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(3)
f = lambda midi: 440 * 2 ** ((midi - 69) / 12)

def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i >= n: return
    sig = sig[: n - i] * gain
    L[i:i + len(sig)] += sig * (1 - pan) ** .5 * .7071 * 2 ** .5 / 2 ** .5
    R[i:i + len(sig)] += sig * (1 + pan) ** .5 * .7071 * 2 ** .5 / 2 ** .5

def bell(midi, dur=1.6):
    t = np.arange(int(dur * SR)) / SR; fr = f(midi)
    s = (np.sin(2 * np.pi * fr * t) * np.exp(-3.2 * t) + .45 * np.sin(2 * np.pi * fr * 2.76 * t) * np.exp(-6 * t)
         + .2 * np.sin(2 * np.pi * fr * 5.4 * t) * np.exp(-11 * t))
    return s * np.minimum(1, t * 400)

def pluck(midi, dur):
    t = np.arange(int(dur * SR)) / SR; fr = f(midi)
    return (np.sin(2 * np.pi * fr * t) + .25 * np.sin(4 * np.pi * fr * t)) * np.exp(-4 * t) * np.minimum(1, t * 300)

def pad(midis, dur):
    t = np.arange(int(dur * SR)) / SR
    env = np.minimum(1, t / .25) * np.minimum(1, (dur - t) / .4).clip(0)
    return sum(np.sin(2 * np.pi * f(m) * t) + .3 * np.sin(2 * np.pi * f(m) * 1.003 * t) for m in midis) * env / len(midis)

def jingle_bell(dur=.12):
    t = np.arange(int(dur * SR)) / SR
    noise = rng.standard_normal(len(t))
    hp = np.diff(noise, prepend=0)                      # crude high-pass: bright, metallic
    ring = sum(np.sin(2 * np.pi * fr * t) for fr in (5200, 6800, 8100)) * .15
    return (hp * .18 + ring) * np.exp(-34 * t)   # mostly ringing metal, only a touch of noise

# original 8-bar tune (4 beats per bar), (midi, beats); 0 = rest
tune = [(76, 1), (79, 1), (81, 1), (79, 1),  (76, 1), (74, 1), (72, 1), (74, 1),
        (76, 1), (79, 1), (84, 1), (83, 1),  (81, 2), (79, 2),
        (77, 1), (81, 1), (84, 1), (81, 1),  (79, 1), (76, 1), (74, 1), (76, 1),
        (77, 1), (76, 1), (74, 1), (79, 1),  (72, 3), (0, 1)]
chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]] * 2     # C  Am  F  G
bass = [48, 45, 41, 43] * 2
bar = 4 * beat; loop = 8 * bar
start = 0.0
while start < secs:
    t = start
    for midi, b in tune:
        if midi: add(bell(midi), t, pan=.15, gain=.32)
        t += b * beat
    for k in range(8):
        add(pad(chords[k], bar), start + k * bar, gain=.10)
        for q in range(4):
            add(pluck(bass[k], beat * .95), start + k * bar + q * beat, pan=-.1, gain=.22 if q % 2 == 0 else .14)
        for e in range(8):                                   # sleigh bells on the 8th notes, accent on beats
            add(jingle_bell(), start + k * bar + e * beat / 2, pan=.35 * (1 if e % 2 else -1), gain=.06 if e % 2 else .09)
    start += loop
# gentle fade in/out and normalise
env = np.ones(n); fi, fo = int(.6 * SR), int(1.5 * SR)
env[:fi] = np.linspace(0, 1, fi); env[-fo:] = np.linspace(1, 0, fo)
L *= env; R *= env
peak = max(np.abs(L).max(), np.abs(R).max()); L, R = L / peak * .8, R / peak * .8
pcm = (np.stack([L, R], 1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(out, f'{secs:.1f}s')
