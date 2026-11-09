# Cuts dead space out of a talking video and speeds it up a little (voice pitch kept).
# Pauses longer than MAX_GAP are shortened to MAX_GAP; ranges listed in --keep are never cut (e.g. a gesture).
# python tighten.py <in> <out.mp4> <map.json> [--speed 1.15] [--gap 0.18] [--noise -35] [--keep 61.5-65.6,68.3-71.8]
# map.json: {"segments": [[src_start, src_end, out_start], ...], "speed": s} to convert source times to output times.
import json, re, subprocess, sys
args = sys.argv[1:]; src, out, mapf = args[:3]
opt = dict(zip(args[3::2], args[4::2]))
SPEED, GAP, NOISE = float(opt.get('--speed', 1.15)), float(opt.get('--gap', .18)), opt.get('--noise', '-35')
KEEP = [tuple(map(float, r.split('-'))) for r in opt.get('--keep', '').split(',') if r]
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout)
log = subprocess.run(['ffmpeg', '-i', src, '-af', f'silencedetect=n={NOISE}dB:d={GAP + .1}', '-vn', '-f', 'null', '-'], capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)]; ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]
cuts = []
for s, e in zip(starts, ends + [dur] * (len(starts) - len(ends))):
    a, b = s + GAP / 2, e - GAP / 2                      # keep a little breath on each side
    for k0, k1 in KEEP:                                   # never cut inside a protected range
        if a < k1 and b > k0:
            if a < k0 < b: cuts.append((a, k0))
            a = max(a, k1)
    if b - a > .05: cuts.append((a, b))
cuts.sort(); keep, t = [], 0.0
for a, b in cuts:
    if a > t + .05: keep.append((t, a))
    t = max(t, b)
if dur > t + .05: keep.append((t, dur))
segs, o = [], 0.0
for a, b in keep: segs.append([round(a, 3), round(b, 3), round(o, 3)]); o += (b - a) / SPEED
json.dump(dict(segments=segs, speed=SPEED), open(mapf, 'w'))
parts = ''.join(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS[v{i}];[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={max(0, b - a - .02):.3f}:d=0.02[a{i}];"
                for i, (a, b) in enumerate(keep))
cat = ''.join(f'[v{i}][a{i}]' for i in range(len(keep))) + f'concat=n={len(keep)}:v=1:a=1[cv][ca]'
fc = parts + cat + f';[cv]setpts=PTS/{SPEED},fps=30[v];[ca]atempo={SPEED}[a]'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17',
                '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', out], check=True)
print(f'{dur:.1f}s -> {o:.1f}s, {len(keep)} pieces, {len(cuts)} pauses cut')
