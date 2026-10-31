# Soft virtual makeup on the owner's own video: rosy lip tint + light blush, tracked with the
# MediaPipe face-landmark model (run with LiteRT). Teeth stay untinted.
# python makeup.py <in video> <face_landmarks_detector.tflite> <out video> <start box x0,y0,x1,y1> [--frame N out.png]
import sys, subprocess, numpy as np, cv2
from ai_edge_litert.interpreter import Interpreter
src, model, out = sys.argv[1:4]
bx0, by0, bx1, by1 = (int(v) for v in sys.argv[4].split(','))
one = sys.argv.index('--frame') if '--frame' in sys.argv else None
W, H = (int(v) for v in subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout.strip().split(','))
LIP_OUT = [61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185]
LIP_IN = [78,95,88,178,87,14,317,402,318,324,308,415,310,311,312,13,82,81,80,191]
CHEEKS = [(205, 50), (425, 280)]          # cheekbone centre points (left, right)
LIP_COLOR = np.array([206, 100, 118], np.float32)  # soft rosy pink (RGB)
BLUSH = np.array([235, 120, 140], np.float32)     # soft pink
it = Interpreter(model_path=model); it.allocate_tensors()
inp, outp = it.get_input_details()[0]['index'], it.get_output_details()[0]['index']

def landmarks(frame, box):
    cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
    side = max(box[2] - box[0], box[3] - box[1]) * 1.25
    x0, y0 = cx - side / 2, cy - side / 2
    M = np.float32([[256 / side, 0, -x0 * 256 / side], [0, 256 / side, -y0 * 256 / side]])
    crop = cv2.warpAffine(frame, M, (256, 256), borderMode=cv2.BORDER_REPLICATE)
    it.set_tensor(inp, (crop.astype(np.float32) / 255)[None]); it.invoke()
    p = it.get_tensor(outp).reshape(-1, 3)[:, :2]
    return p * side / 256 + [x0, y0]

def apply(frame, pts):
    img = frame.astype(np.float32)
    # lips: outer shape minus the open mouth, feathered
    m = np.zeros((H, W), np.uint8)
    cv2.fillPoly(m, [pts[LIP_OUT].astype(np.int32)], 255); cv2.fillPoly(m, [pts[LIP_IN].astype(np.int32)], 0)
    face_w = np.linalg.norm(pts[234] - pts[454])
    k = max(3, int(face_w * 0.012) | 1)
    m = cv2.GaussianBlur(m, (k, k), 0).astype(np.float32)[..., None] / 255
    lum = img.mean(axis=2, keepdims=True) / 255
    tinted = LIP_COLOR * (0.7 + 0.55 * lum)                      # keep the lips' own light and shine
    img = img * (1 - 0.45 * m) + tinted * 0.45 * m
    # blush: soft round glow on each cheekbone
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    for a, b in CHEEKS:
        c = (pts[a] + pts[b]) / 2; r = face_w * 0.13
        g = np.exp(-(((xx - c[0]) ** 2 + (yy - c[1]) ** 2) / (2 * r * r)))[..., None] * 0.28
        img = img * (1 - g) + (img * 0.4 + BLUSH * 0.6) * g
    return img.clip(0, 255).astype(np.uint8)

box = [bx0, by0, bx1, by1]
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = None if one else subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '30', '-i', '-',
                                         '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '15', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
n, prev = 0, None
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    f = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    pts = landmarks(f, box)
    pts = pts if prev is None else prev * 0.4 + pts * 0.6            # steady the points between frames
    prev = pts
    x0, y0 = pts.min(0); x1, y1 = pts.max(0); box = [x0, y0, x1, y1]  # follow the face
    if one:
        if n == int(sys.argv[one + 1]):
            cv2.imwrite(sys.argv[one + 2], cv2.cvtColor(apply(f, pts), cv2.COLOR_RGB2BGR)); dbg = f.copy()
            for p in pts.astype(int): cv2.circle(dbg, tuple(p), 1, (0, 255, 0), -1)
            cv2.imwrite(sys.argv[one + 2].replace('.png', '-pts.png'), cv2.cvtColor(dbg, cv2.COLOR_RGB2BGR)); break
    else:
        enc.stdin.write(apply(f, pts).tobytes())
    n += 1
if enc: enc.stdin.close(); enc.wait()
print('frames', n)
