# Cinematic holiday edit of the Gemini skillet-soup clip: result-first hook, slowed steps with push-in,
# warm grade + vignette + grain, falling snow, step captions, recipe end card. Music is dropped;
# only the pour / lid / sizzle sounds from the middle of the clip are used.
# python build.py <source.mp4> <overlay dir> <snow dir> <work dir> <out.mp4>
import subprocess, sys, os
src, ov, snow, work, out = sys.argv[1:6]
os.makedirs(work, exist_ok=True)
FPS, X = 24, 0.35  # crossfade length
GRADE = ("eq=contrast=1.07:saturation=1.12:brightness=0.01,"
         "colorbalance=rs=0.05:gs=0.015:bs=-0.05:rm=0.04:bm=-0.03,vignette=PI/4.6,noise=alls=5:allf=t")
# (video start, end, slow factor, audio start, audio end, audio gain, overlay, extra filter)
shots = [
    (9.05, 10.0, 1.7, 6.0, 7.6, 0.55, 'hook', ''),
    (2.0, 3.8, 1.5, 2.0, 3.8, 1.0, 's1', ''),
    (3.8, 5.6, 1.4, 3.8, 5.6, 1.0, 's2', ''),
    (5.6, 7.3, 1.4, 5.6, 7.3, 1.0, 's3', ''),
    (7.35, 8.9, 1.5, 7.35, 8.9, 1.0, 's4', ''),
    (9.4, 10.0, 1.0, 7.0, 8.5, 0.45, 'card', 'gblur=sigma=10,eq=brightness=-0.06,'),
]
END_LEN = 5.5
clips, durs = [], []
for i, (vs, ve, slow, as_, ae, gain, name, extra) in enumerate(shots):
    last = name == 'card'
    dur = END_LEN if last else (ve - vs) * slow
    zoom = "1+0.0009*on" if not last else "1.04+0.0004*on"
    vf = (f"trim={vs}:{ve},setpts=(PTS-STARTPTS)*{slow},fps={FPS},"
          + (f"tpad=stop_mode=clone:stop_duration={dur},trim=0:{dur}," if last else "")
          + f"scale=1200:2134:flags=lanczos,zoompan=z='{zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps={FPS},"
          + extra + GRADE + ",setsar=1")
    a_len = ae - as_; tempo = a_len / dur
    af = (f"atrim={as_}:{ae},asetpts=PTS-STARTPTS,atempo={max(0.5, min(2.0, tempo)):.4f},volume={gain},"
          f"apad=whole_dur={dur:.3f},atrim=0:{dur:.3f},afade=t=in:d=0.08,afade=t=out:st={dur - 0.25:.3f}:d=0.25")
    c = os.path.join(work, f'{i}.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-filter_complex', f"[0:v]{vf}[v];[0:a]{af},aresample=48000[a]",
                    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-c:a', 'pcm_s16le', c.replace('.mp4', '.mov')], check=True)
    clips.append(c.replace('.mp4', '.mov')); durs.append(dur)

# join with crossfades; captions appear just after each shot starts
starts, t = [], 0.0
for i, d in enumerate(durs):
    starts.append(t); t += d - (X if i < len(durs) - 1 else 0)
total = t
inputs = sum([['-i', c] for c in clips], [])
f, prev, aprev = [], '0:v', '0:a'
off = 0.0
for i in range(1, len(clips)):
    off += durs[i - 1] - X
    f.append(f"[{prev}][{i}:v]xfade=transition=fade:duration={X}:offset={off:.3f}[v{i}]")
    f.append(f"[{aprev}][{i}:a]acrossfade=d={X}[a{i}]")
    prev, aprev = f'v{i}', f'a{i}'
n = len(clips)
inputs += ['-framerate', str(FPS), '-i', os.path.join(snow, '%04d.png')]
f.append(f"[{prev}][{n}:v]overlay=0:0:shortest=0:eof_action=pass[sv]"); prev = 'sv'
for i, (*_, name, _e) in enumerate(shots):
    inputs += ['-loop', '1', '-t', f'{total:.2f}', '-i', os.path.join(ov, f'{name}.png')]
    k = n + 1 + i
    s0 = starts[i] + (0.15 if i else 0.0)
    e0 = (starts[i + 1] + X / 2) if i + 1 < len(shots) else total
    f.append(f"[{k}:v]format=rgba,fade=t=in:st={s0:.2f}:d=0.35:alpha=1,fade=t=out:st={e0 - 0.3:.2f}:d=0.3:alpha=1[o{i}]")
    f.append(f"[{prev}][o{i}]overlay=0:0:enable='between(t,{s0:.2f},{e0:.2f})'[c{i}]"); prev = f'c{i}'
f.append(f"[{prev}]format=yuv420p[vout]")
f.append(f"[{aprev}]loudnorm=I=-16:TP=-1.5:LRA=9[aout]")
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(f), '-map', '[vout]', '-map', '[aout]',
                '-t', f'{total:.2f}', '-r', str(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-c:a', 'aac', '-b:a', '160k',
                '-movflags', '+faststart', out], check=True, timeout=580)
print(out, f'{total:.1f}s', [round(s, 2) for s in starts])
