# Split-screen episode: animated slides on top (synced to the owner's talking), the owner's own video below.
# python3 split-video.py <frames folder> <owner video> <out prefix> <start,start,...> [bottom video]
# bottom video: the owner already cut out onto the gradient (tools-cutout-person.py); her audio comes from <owner video>.
# Slide i appears at start[i] seconds; the owner's audio is kept as recorded.
import os, subprocess, sys, shutil
from PIL import Image
frames, src, out_prefix, starts = sys.argv[1], sys.argv[2], sys.argv[3], [float(v) for v in sys.argv[4].split(',')]
bottom = sys.argv[5] if len(sys.argv) > 5 else src
FPS, ANIM_FPS, TRANS, TOP_H = 30, 24, 8, 1120
here = os.path.dirname(os.path.abspath(__file__))
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout)
font = os.environ.get('FONT', '')

def frame(fmt, slide, j):
    folder = os.path.join(frames, 'anim', fmt, str(slide))
    lead = sorted((n for n in os.listdir(folder) if n.startswith(('in-', 'draw-', 'pop-'))), key=lambda n: (('in-', 'draw-', 'pop-').index(n.split('-')[0] + '-'), n))
    name = lead[j] if j < len(lead) else f'boil-{(j - len(lead)) // 3 % 3 + 1}.jpg'
    return os.path.join(folder, name)

ease = lambda t: 1 - (1 - t) ** 3
for fmt, handle in [('split-tiktok', 'tiktok'), ('split-reel', 'reel')]:
    seq = os.path.join(frames, f'seq-{fmt}'); shutil.rmtree(seq, ignore_errors=True); os.makedirs(seq)
    n_total = int(dur * FPS)
    for n in range(n_total):
        t = n / FPS
        i = max(k for k, s in enumerate(starts) if s <= t)
        local = int((t - starts[i]) * ANIM_FPS)
        dst = os.path.join(seq, f'{n:05d}.jpg')
        since = int((t - starts[i]) * FPS)
        if i > 0 and since < TRANS:  # the new slide slides in over the old one
            prev_local = int((t - starts[i - 1]) * ANIM_FPS)
            a = Image.open(frame(fmt, i - 1, prev_local)); b = Image.open(frame(fmt, i, local))
            W = a.width; x = int(W * (1 - ease((since + 1) / TRANS)))
            c = Image.new('RGB', a.size); c.paste(a, (x - W, 0)); c.paste(b, (x, 0)); c.save(dst, quality=90)
        else:
            os.symlink(frame(fmt, i, local), dst)
    label = (f"drawtext=fontfile={font}:text='#ad':fontsize=34:fontcolor=white:box=1:boxcolor=0xff3d7f:boxborderw=14:x=40:y={TOP_H + 40},"
             f"drawtext=fontfile={font}:text='Is this deal real?':fontsize=44:fontcolor=white:shadowcolor=0x3b0f3a66:shadowx=0:shadowy=3:x=40:y={TOP_H + 150},"
             f"drawtext=fontfile={font}:text='with Data Darling':fontsize=34:fontcolor=0x3b0f3a:x=40:y={TOP_H + 210}," if font else '')
    fc = (f"[2:v]fps={FPS},scale=1080:-2,crop=1080:{1920 - TOP_H}:0:0,setsar=1[me];"
          f"[1:v]scale=1080:{TOP_H},setsar=1[top];"
          f"color=c=0xffffff:s=1080x1920:r={FPS}[bg];[bg][top]overlay=0:0:shortest=1[a];[a][me]overlay=0:{TOP_H}:shortest=1,"
          f"{label}format=yuv420p[v]")
    out = f'{out_prefix}-{handle}.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-framerate', str(FPS), '-i', os.path.join(seq, '%05d.jpg'), '-i', bottom,
                    '-filter_complex', fc, '-map', '[v]', '-map', '0:a', '-t', f'{dur:.2f}',
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out],
                   check=True, timeout=580)
    print(out, f'{dur:.1f}s')
