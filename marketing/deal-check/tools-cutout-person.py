# Cuts the owner out of her video (MediaPipe selfie segmenter model, run with LiteRT) and puts the brand gradient behind her.
# python tools-cutout-person.py <video> <model.tflite> <out.mp4> <crop y0,y1 in source px> <out w,h>
import sys, subprocess, numpy as np, cv2
from ai_edge_litert.interpreter import Interpreter
src, model, out = sys.argv[1], sys.argv[2], sys.argv[3]
y0, y1 = (int(v) for v in sys.argv[4].split(','))
OW, OH = (int(v) for v in sys.argv[5].split(','))
probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout.strip().split(',')
W, H = int(probe[0]), int(probe[1]); CH = (y1 - y0) // 2 * 2  # even height: yuv420 video can't crop to odd sizes
# canvas wider than the video, in source pixels, so the owner fits at the output's shape with gradient beside her
CW = max(W, int(round(CH * OW / OH / 2)) * 2); XOFF = CW - W

def gradient(w, h):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    t = (xx / w + yy / h) / 2
    stops = [(0, (180, 140, 240)), (0.45, (255, 180, 140)), (1, (247, 156, 196))]
    img = np.zeros((h, w, 3), np.float32)
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        m = (t >= a) & (t <= b); k = ((t - a) / (b - a))[..., None]
        img[m] = (np.array(ca) * (1 - k) + np.array(cb) * k)[m]
    for bx, by, r, c in [(-0.05, 0.35, 0.75, (138, 111, 240)), (0.6, 0.05, 0.7, (255, 176, 119)), (0.9, 0.6, 0.55, (255, 140, 186))]:
        d = np.sqrt((xx - bx * w) ** 2 + (yy - by * h) ** 2) / (r * max(w, h))
        a = np.clip(1 - d, 0, 1)[..., None] * 0.85
        img = img * (1 - a) + np.array(c) * a
    return img

bg = gradient(CW, CH)
seg = Interpreter(model_path=model); seg.allocate_tensors()
inp, outp = seg.get_input_details()[0]['index'], seg.get_output_details()[0]['index']
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', src, '-vf', f'fps=30,crop={W}:{CH}:0:{y0}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{CW}x{CH}', '-r', '30', '-i', '-',
                        '-vf', f'scale={OW}:{OH}:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
prev, n = None, 0
while True:
    buf = dec.stdout.read(W * CH * 3)
    if len(buf) < W * CH * 3: break
    frame = np.frombuffer(buf, np.uint8).reshape(CH, W, 3)
    seg.set_tensor(inp, (cv2.resize(frame, (256, 256), interpolation=cv2.INTER_AREA).astype(np.float32) / 255)[None])
    seg.invoke()
    m = cv2.resize(seg.get_tensor(outp)[0, :, :, 0], (W, CH), interpolation=cv2.INTER_LINEAR)
    m = cv2.GaussianBlur(m, (7, 7), 0)
    m = np.clip((m - 0.35) / 0.4, 0, 1)                       # firm up the edge
    # keep only the biggest person shape (drops small photos of people in the background)
    n_lab, lab, stats, _ = cv2.connectedComponentsWithStats((m > 0.5).astype(np.uint8))
    if n_lab > 2:
        keep = (lab == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
        keep = cv2.dilate(keep, np.ones((15, 15), np.uint8))
        m = m * cv2.GaussianBlur(keep.astype(np.float32), (15, 15), 0)
    prev = m if prev is None else prev * 0.45 + m * 0.55       # steady the mask between frames
    a = np.zeros((CH, CW, 1), np.float32); a[:, XOFF:] = prev[..., None]
    full = np.zeros((CH, CW, 3), np.float32); full[:, XOFF:] = frame
    enc.stdin.write((full * a + bg * (1 - a)).astype(np.uint8).tobytes())
    n += 1
enc.stdin.close(); enc.wait(); print('frames', n)
