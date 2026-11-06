# Blurs the room behind the owner in a webcam video (MediaPipe selfie segmenter run with LiteRT), keeps her sharp,
# trims black borders and keeps the original audio.
# python tools-blur-background.py <video> <model.tflite> <out.mp4> [blur strength, default 35] [keep-chair: 1 or x0,y0,x1,y1]
# With keep-chair, the dark office chair touching her (behind and beside her) stays sharp too.
import sys, subprocess, re, numpy as np, cv2
from ai_edge_litert.interpreter import Interpreter
src, model, out = sys.argv[1:4]
STRENGTH = float(sys.argv[4]) if len(sys.argv) > 4 else 35
KEEP_CHAIR = len(sys.argv) > 5 and sys.argv[5] not in ('', '0')
# optional box (in the trimmed picture's pixels) the chair sits in, so dark shadows next to it stay blurred
CHAIR_BOX = tuple(int(v) for v in sys.argv[5].split(',')) if KEEP_CHAIR and ',' in sys.argv[5] else None

# find black borders around the picture
det = subprocess.run(['ffmpeg', '-i', src, '-t', '3', '-vf', 'cropdetect=limit=24:round=2:reset=0', '-f', 'null', '-'], capture_output=True, text=True).stderr
crops = re.findall(r'crop=(\d+):(\d+):(\d+):(\d+)', det)
W, H, X, Y = (int(v) for v in crops[-1]) if crops else (None,) * 4
if not crops:
    W, H = (int(v) for v in subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout.strip().split(','))
    X = Y = 0
fps = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout.strip()

seg = Interpreter(model_path=model); seg.allocate_tensors()
inp, outp = seg.get_input_details()[0]['index'], seg.get_output_details()[0]['index']
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', src, '-vf', f'crop={W}:{H}:{X}:{Y}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', fps, '-i', '-', '-i', src,
                        '-map', '0:v', '-map', '1:a?', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
                        '-c:a', 'aac', '-b:a', '160k', '-shortest', out], stdin=subprocess.PIPE)
prev, n = None, 0
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    frame = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    seg.set_tensor(inp, (cv2.resize(frame, (256, 256), interpolation=cv2.INTER_AREA).astype(np.float32) / 255)[None])
    seg.invoke()
    m = cv2.resize(seg.get_tensor(outp)[0, :, :, 0], (W, H), interpolation=cv2.INTER_LINEAR)
    m = np.clip((cv2.GaussianBlur(m, (7, 7), 0) - 0.3) / 0.4, 0, 1)
    n_lab, lab, stats, _ = cv2.connectedComponentsWithStats((m > 0.5).astype(np.uint8))
    if n_lab > 2:   # keep only the biggest person shape
        keep = cv2.dilate((lab == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype(np.uint8), np.ones((15, 15), np.uint8))
        m = m * cv2.GaussianBlur(keep.astype(np.float32), (15, 15), 0)
    if KEEP_CHAIR:
        # the chair: dark, low-colour pixels in one piece that touches her outline (so dark things elsewhere stay blurred)
        hsv = cv2.cvtColor(frame, cv2.COLOR_RGB2HSV)
        dark = ((hsv[..., 2] < 70) & (hsv[..., 1] < 110)).astype(np.uint8)
        dark[: H // 4] = 0                                         # the chair is behind her shoulders, not up on the shelves
        if CHAIR_BOX:
            x0, y0, x1, y1 = CHAIR_BOX; box = np.zeros_like(dark); box[y0:y1, x0:x1] = 1; dark &= box
        dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
        dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        near = cv2.dilate((m > 0.5).astype(np.uint8), np.ones((25, 25), np.uint8))
        n_lab, lab, stats, _ = cv2.connectedComponentsWithStats(dark)
        chair = np.zeros((H, W), np.float32)
        for i in range(1, n_lab):
            if stats[i, cv2.CC_STAT_AREA] > W * H * 0.01 and (near & (lab == i)).any():
                chair[lab == i] = 1
        chair = cv2.morphologyEx(chair, cv2.MORPH_CLOSE, np.ones((21, 21), np.uint8))
        m = np.maximum(m, cv2.GaussianBlur(chair, (0, 0), 3))
    prev = m if prev is None else prev * 0.45 + m * 0.55      # steady the edge between frames
    # strong blur of the room: blur a small copy (fast and smooth), then scale back up
    small = cv2.resize(frame, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    bg = cv2.resize(cv2.GaussianBlur(small, (0, 0), STRENGTH / 4), (W, H), interpolation=cv2.INTER_LINEAR).astype(np.float32)
    a = cv2.GaussianBlur(prev, (0, 0), 2)[..., None]
    enc.stdin.write((frame * a + bg * (1 - a)).astype(np.uint8).tobytes())
    n += 1
enc.stdin.close(); enc.wait(); print(out, 'frames', n, f'{W}x{H}')
