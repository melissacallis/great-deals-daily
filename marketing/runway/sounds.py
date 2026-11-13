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


def cleats():
    t = T(.1); x = band(rng.standard_normal(len(t)), 600, 4000) * np.exp(-40 * t) + .5 * np.sin(2 * np.pi * 140 * t) * np.exp(-40 * t)
    return norm(x, .4)


def hightops():
    squeak_n[0] += 1  # squeakier than plain sneakers
    t = T(.12); x = np.sin(2 * np.pi * 120 * t) * np.exp(-35 * t)
    if squeak_n[0] % 2 == 0:
        ts = T(.1); f = 2600 + 1500 * ts / .1; x[:len(ts)] += .6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * ts / .1)
    return norm(x, .45)


def dress():
    t = T(.07); x = band(rng.standard_normal(len(t)), 1200, 5000) * np.exp(-70 * t) + .4 * np.sin(2 * np.pi * 900 * t) * np.exp(-90 * t)
    return norm(x, .5)


def skate():
    t = T(.09); return norm(band(rng.standard_normal(len(t)), 150, 1400) * np.exp(-45 * t), .4)


def bark():  # cartoon "woof": a buzzy voiced burst with falling pitch and a breathy start
    t = T(.22); f = 560 - 260 * (t / .22); ph = 2 * np.pi * np.cumsum(f) / SR
    voiced = sum(np.sin(k * ph) / k for k in range(1, 9))
    env = np.minimum(1, t / .012) * np.exp(-11 * t)
    x = band(voiced, 250, 3200) * env + .35 * band(rng.standard_normal(len(t)), 600, 3000) * np.exp(-40 * t)
    return norm(x, .8)


def boing():
    t = T(.38); f = 180 + 700 * (t / .38) ** .6 + 30 * np.sin(2 * np.pi * 18 * t)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-5 * t), .45)


def lightup():
    return sneakers()


def rainboots():  # rubbery squelch
    t = T(.14); x = band(rng.standard_normal(len(t)), 120, 900) * np.exp(-22 * t) + .5 * np.sin(2 * np.pi * (220 - 300 * t) * t) * np.exp(-25 * t)
    return norm(x, .5)


def dino():  # soft shuffle with a tiny squeak-toy chirp now and then
    x = slippers(); squeak_n[0] += 1
    if squeak_n[0] % 4 == 0:
        ts = T(.09); x = x.copy(); x[:len(ts)] += .25 * np.sin(2 * np.pi * (1800 + 1200 * ts / .09) * ts) * np.sin(np.pi * ts / .09)
    return x


def velcro():
    return flats()


def snowboots():  # crunchy snow-boot step
    t = T(.13); return norm(band(rng.standard_normal(len(t)), 400, 5000) * (np.abs(rng.standard_normal(len(t))) ** 2) * np.exp(-25 * t), .45)


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
GEN = {'step_heels': heels, 'step_flats': flats, 'step_slippers': slippers, 'step_sneakers': sneakers, 'step_boots': boots, 'step_workboots': boots, 'step_cleats': cleats, 'step_hightops': hightops, 'step_dress': dress, 'step_skate': skate, 'step_lightup': lightup, 'step_rainboots': rainboots, 'step_dino': dino, 'step_velcro': velcro, 'step_snowboots': snowboots, 'bark': bark, 'boing': boing,
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
