# Builds the episode videos from the tall slides: slow zoom on each slide, slide-left transitions, a whoosh per change.
# python3 make-video.py <episode folder>
# If the folder has voiceover.wav + voice-durations.json, slides follow the owner's voice and the whooshes sit quietly under it.
import subprocess, sys, os, json
ep = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
slides = ['1-hook', '2-compared', '3-history', '4-catch', '5-skip', '6-verdict', '8-cta']
durs = [3.3, 3.6, 4.7, 3.6, 3.3, 6.1, 3.4]
voice = os.path.join(ep, 'voiceover.wav')
has_voice = os.path.exists(voice)
if has_voice:
    durs = json.load(open(os.path.join(ep, 'voice-durations.json')))
X = 0.35
for folder, out in [('reel', 'video-reel.mp4'), ('tiktok', 'video-tiktok.mp4')]:
    args = ['ffmpeg', '-v', 'error', '-y']
    for s, d in zip(slides, durs):
        args += ['-loop', '1', '-t', f'{d + X:.2f}', '-framerate', '30', '-i', os.path.join(ep, folder, f'{s}.jpg')]
    f = []
    for i, d in enumerate(durs):
        n = int((d + X) * 30)
        f.append(f"[{i}:v]scale=1188:2112,zoompan=z='1+0.05*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,setsar=1[v{i}]")
    prev, t = 'v0', 0.0
    for i in range(1, len(durs)):
        t += durs[i - 1]
        f.append(f"[{prev}][v{i}]xfade=transition=slideleft:duration={X}:offset={t:.2f}[x{i}]")
        prev = f'x{i}'
    total = sum(durs) + X
    times, t = [], 0.0
    for d in durs[:-1]:
        t += d; times.append(t - 0.12)
    k = len(times)
    f.append(f"[{len(durs)}:a]asplit={k}" + ''.join(f'[s{j}]' for j in range(k)))
    for j, tt in enumerate(times):
        ms = int(tt * 1000); f.append(f"[s{j}]adelay={ms}|{ms}[w{j}]")
    if has_voice:
        f.append(''.join(f'[w{j}]' for j in range(k)) + f"amix=inputs={k}:normalize=0:duration=longest,volume=0.3,apad=whole_dur={total:.2f}[fx]")
        f.append(f"[{len(durs) + 1}:a]apad=whole_dur={total:.2f}[vo];[vo][fx]amix=inputs=2:normalize=0:duration=first[a]")
    else:
        f.append(''.join(f'[w{j}]' for j in range(k)) + f"amix=inputs={k}:normalize=0:duration=longest,apad=whole_dur={total:.2f}[a]")
    args += ['-i', os.path.join(here, 'whoosh.wav')] + (['-i', voice] if has_voice else []) + ['-filter_complex', ';'.join(f), '-map', f'[{prev}]', '-map', '[a]', '-t', f'{total:.2f}',
             '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
             os.path.join(ep, out)]
    subprocess.run(args, check=True, timeout=500)
print('ok')
