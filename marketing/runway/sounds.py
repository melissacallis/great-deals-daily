# Sound mix for the runway video: a different footstep per shoe (heel clicks, sneaker squeaks, boot clomps,
# slipper shuffles, flat taps), plus whooshes, pops and dings. No music.
# python sounds.py <events.json> <whoosh.wav> <out.wav>
import json, sys, wave
import numpy as np

SR = 48000
ev_file, whoosh_file, out = sys.argv[1:4]
E = json.load(open(ev_file))
rng = np.random.default_rng(7)
T = lambda d: np.arange(int(d * SR)) / SR


def band(x, lo, hi):  # crude band-pass with FFT
    f = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    f[(fr < lo) | (fr > hi)] = 0
    return np.fft.irfft(f, len(x))


def norm(x, peak):
    return x / (np.abs(x).max() + 1e-9) * peak


def heels():
    t = T(.09); x = band(rng.standard_normal(len(t)), 2500, 7000) * np.exp(-60 * t) + .5 * np.sin(2 * np.pi * 2100 * t) * np.exp(-80 * t)
    return norm(x, .55)


def flats():
    t = T(.08); return norm(band(rng.standard_normal(len(t)), 700, 2200) * np.exp(-55 * t), .35)


def slippers():
    t = T(.22); env = np.sin(np.pi * t / .22) ** 2
    return norm(band(rng.standard_normal(len(t)), 300, 1600) * env, .22)


squeak_n = [0]
def sneakers():
    t = T(.12); x = np.sin(2 * np.pi * 110 * t) * np.exp(-35 * t) + .4 * band(rng.standard_normal(len(t)), 200, 900) * np.exp(-40 * t)
    squeak_n[0] += 1
    if squeak_n[0] % 3 == 0:  # an occasional rubber squeak
        ts = T(.11); f = 2200 + 1400 * ts / .11; x[:len(ts)] += .5 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * ts / .11)
    return norm(x, .45)


def boots():
    t = T(.16); x = np.sin(2 * np.pi * 70 * t) * np.exp(-22 * t) + .6 * band(rng.standard_normal(len(t)), 80, 900) * np.exp(-30 * t)
    return norm(x, .7)


def pop():
    t = T(.12); return norm(np.sin(2 * np.pi * 600 * t * (1 + 4 * t)) * np.exp(-28 * t), .45)


def ding():
    t = T(.9); return norm((np.sin(2 * np.pi * 1318 * t) + .6 * np.sin(2 * np.pi * 1975 * t)) * np.exp(-5 * t), .28)


def load(path):
    with wave.open(path) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
        if w.getnchannels() == 2: a = a.reshape(-1, 2).mean(1)
        if w.getframerate() != SR: a = np.interp(np.arange(int(len(a) * SR / w.getframerate())) * w.getframerate() / SR, np.arange(len(a)), a)
    return norm(a, .35)


WH = load(whoosh_file)
GEN = {'step_heels': heels, 'step_flats': flats, 'step_slippers': slippers, 'step_sneakers': sneakers, 'step_boots': boots,
       'pop': pop, 'ding': ding, 'whoosh': lambda: WH}
mix = np.zeros(int((E['duration'] + 1) * SR))
for e in E['events']:
    s = GEN[e['k']](); i = int(e['t'] * SR); mix[i:i + len(s)] += s[:len(mix) - i]
mix = mix[:int(E['duration'] * SR)]
mix = norm(mix, .89)
st = np.repeat((mix * 32767).astype(np.int16)[:, None], 2, axis=1)
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print(out, len(E['events']), 'sounds')
