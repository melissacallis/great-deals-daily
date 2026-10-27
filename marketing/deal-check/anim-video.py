# Builds the doodle-animated episode videos from frames made by `ANIM=1 node render.mjs ...`.
# python3 anim-video.py <episode folder> <frames folder> [--no-voice]
# Each slide: 14 frames rising in with doodles drawing on, then the doodles "boil" (3 versions, 8 per second).
# Slides follow voice-durations.json (the owner's voiceover); a slide-in transition and a quiet whoosh at each change.
import json, os, subprocess, sys, shutil
from PIL import Image
ep, frames = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
FPS, TRANS, X = 24, 8, 0.35
NO_VOICE = '--no-voice' in sys.argv
# Without the voiceover, each slide stays up long enough to read (the script's timing).
durs = [3.3, 3.6, 4.7, 3.6, 3.3, 6.1, 3.4] if NO_VOICE else json.load(open(os.path.join(ep, 'voice-durations.json')))
durs[-1] += X
counts = [round(d * FPS) for d in durs]

def frame(fmt, slide, j):
    name = f'in-{j:02d}.jpg' if j < 14 else f'boil-{(j - 14) // 3 % 3 + 1}.jpg'
    return os.path.join(frames, 'anim', fmt, str(slide), name)

ease = lambda t: 1 - (1 - t) ** 3
suffix = '-no-voice' if NO_VOICE else ''
for fmt, out in [('reel', f'video-reel{suffix}.mp4'), ('tiktok', f'video-tiktok{suffix}.mp4')]:
    seq = os.path.join(frames, f'seq-{fmt}'); shutil.rmtree(seq, ignore_errors=True); os.makedirs(seq)
    n = 0
    for i, c in enumerate(counts):
        for j in range(c):
            dst = os.path.join(seq, f'{n:05d}.jpg')
            if i > 0 and j < TRANS:  # slide the new slide in over the old one
                a = Image.open(frame(fmt, i - 1, counts[i - 1] + j)); b = Image.open(frame(fmt, i, j))
                W = a.width; x = int(W * (1 - ease((j + 1) / TRANS)))
                canvas = Image.new('RGB', a.size); canvas.paste(a, (x - W, 0)); canvas.paste(b, (x, 0)); canvas.save(dst, quality=90)
            else:
                os.symlink(frame(fmt, i, j), dst)
            n += 1
    total = n / FPS
    starts, t = [], 0.0
    for c in counts[:-1]:
        t += c / FPS; starts.append(t - 0.12)
    k = len(starts)
    f = [f"[1:a]asplit={k}" + ''.join(f'[s{j}]' for j in range(k))]
    f += [f"[s{j}]adelay={int(st * 1000)}|{int(st * 1000)}[w{j}]" for j, st in enumerate(starts)]
    if NO_VOICE:
        f.append(''.join(f'[w{j}]' for j in range(k)) + f"amix=inputs={k}:normalize=0:duration=longest,volume=0.6,apad=whole_dur={total:.2f}[a]")
    else:
        f.append(''.join(f'[w{j}]' for j in range(k)) + f"amix=inputs={k}:normalize=0:duration=longest,volume=0.3,apad=whole_dur={total:.2f}[fx]")
        f.append(f"[2:a]apad=whole_dur={total:.2f}[vo];[vo][fx]amix=inputs=2:normalize=0:duration=first[a]")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', os.path.join(seq, '%05d.jpg'),
                    '-i', os.path.join(here, 'whoosh.wav'), *([] if NO_VOICE else ['-i', os.path.join(ep, 'voiceover.wav')]),
                    '-filter_complex', ';'.join(f), '-map', '0:v', '-map', '[a]', '-t', f'{total:.2f}',
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', str(FPS),
                    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', os.path.join(ep, out)], check=True, timeout=550)
    print(fmt, f'{total:.1f}s', n, 'frames')
