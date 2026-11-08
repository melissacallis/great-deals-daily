# Tracks the owner's hand in a video (MediaPipe hand detector + 21-point hand landmarks, run with LiteRT),
# and writes per-frame palm data for placing deal cards on her hand.
# python hand_track.py <video> <model dir with hand_detector.tflite + hand_landmarks_detector.tflite> <out.json> [preview.mp4]
# out.json: {"w","h","fps","frames":[{"t", "ok", "score", "pts":[[x,y]*21], "palm":[x,y], "size", "angle", "open"}...]}
#   palm  = centre of the palm (between wrist and the finger knuckles), in video pixels
#   size  = wrist-to-middle-knuckle distance in pixels (scales the cards)
#   angle = direction from wrist to middle knuckle, degrees (0 = pointing right, -90 = pointing up)
#   open  = how flat/open the hand is, 0..1 (fingers spread and straight)
import json, math, subprocess, sys
import numpy as np, cv2
from ai_edge_litert.interpreter import Interpreter

src, mdir, out = sys.argv[1:4]
preview = sys.argv[4] if len(sys.argv) > 4 else None
W, H = (int(v) for v in subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src],
                                          capture_output=True, text=True).stdout.strip().split(','))
num, den = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', src],
                          capture_output=True, text=True).stdout.strip().split('/')
FPS = float(num) / float(den)

det = Interpreter(model_path=f'{mdir}/hand_detector.tflite'); det.allocate_tensors()
lm = Interpreter(model_path=f'{mdir}/hand_landmarks_detector.tflite'); lm.allocate_tensors()
D_IN, D_OUT = det.get_input_details()[0]['index'], {o['name']: o['index'] for o in det.get_output_details()}
L_IN, L_OUT = lm.get_input_details()[0]['index'], {o['name']: o['index'] for o in lm.get_output_details()}

# SSD anchors for the 192x192 palm detector: stride 8 (24x24, 2 per cell) + stride 16 (12x12, 6 per cell) = 2016
anchors = []
for stride, per in ((8, 2), (16, 6)):
    n = 192 // stride
    for y in range(n):
        for x in range(n):
            anchors += [((x + .5) / n, (y + .5) / n)] * per
anchors = np.array(anchors, np.float32)

def detect_palm(rgb):
    """Best palm in the frame: (centre x,y, size, rotation) in pixels/radians, or None."""
    s = max(W, H); pad = np.zeros((s, s, 3), np.uint8); ox, oy = (s - W) // 2, (s - H) // 2
    pad[oy:oy + H, ox:ox + W] = rgb
    det.set_tensor(D_IN, (cv2.resize(pad, (192, 192)).astype(np.float32) / 255)[None]); det.invoke()
    raw, sc = det.get_tensor(D_OUT['Identity'])[0], det.get_tensor(D_OUT['Identity_1'])[0, :, 0]
    i = int(np.argmax(sc)); score = 1 / (1 + math.exp(-max(-80, min(80, sc[i]))))
    if score < .5: return None
    r = raw[i] / 192; ax, ay = anchors[i]
    cx, cy, bw = (r[0] + ax) * s - ox, (r[1] + ay) * s - oy, r[2] * s
    wx, wy = (r[4] + ax) * s - ox, (r[5] + ay) * s - oy          # keypoint 0: wrist
    mx, my = (r[8] + ax) * s - ox, (r[9] + ay) * s - oy          # keypoint 2: middle finger knuckle
    rot = math.pi / 2 - math.atan2(-(my - wy), mx - wx)
    return dict(cx=cx, cy=cy, size=bw, rot=rot, score=score)

def roi_from_palm(p):
    # MediaPipe: shift the box up half its size along the hand, then scale it 2.6x
    rot, size = p['rot'], p['size']
    cx = p['cx'] + .5 * size * math.sin(rot); cy = p['cy'] - .5 * size * math.cos(rot)
    return cx, cy, size * 2.6, rot

def roi_from_landmarks(pts):
    wrist, mid = pts[0], pts[9]
    rot = math.pi / 2 - math.atan2(-(mid[1] - wrist[1]), mid[0] - wrist[0])
    xs, ys = pts[:, 0], pts[:, 1]
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    size = max(xs.max() - xs.min(), ys.max() - ys.min()) * 2.0
    return cx, cy, size, rot

def landmarks(rgb, roi):
    cx, cy, size, rot = roi
    c, s_ = math.cos(rot), math.sin(rot)
    # affine: 224x224 crop (rotated so the hand points up) <- frame
    M = np.array([[c, -s_], [s_, c]]) * (size / 224)
    A = np.hstack([M, np.array([[cx], [cy]]) - M @ np.array([[112], [112]])])
    crop = cv2.warpAffine(rgb, cv2.invertAffineTransform(A), (224, 224), flags=cv2.INTER_LINEAR, borderValue=0)
    lm.set_tensor(L_IN, (crop.astype(np.float32) / 255)[None]); lm.invoke()
    pts = lm.get_tensor(L_OUT['Identity'])[0].reshape(21, 3)[:, :2]
    pres = float(lm.get_tensor(L_OUT['Identity_1'])[0, 0])
    pres = pres if 0 <= pres <= 1 else 1 / (1 + math.exp(-pres))
    full = (A[:, :2] @ pts.T).T + A[:, 2]
    return full, pres

def describe(pts):
    wrist, mcps = pts[0], pts[[5, 9, 13, 17]]
    palm = (wrist + mcps.sum(0)) / 5
    v = pts[9] - wrist; size = float(np.hypot(*v)); angle = math.degrees(math.atan2(v[1], v[0]))
    # openness: fingertips far from the wrist compared with their knuckles
    tips, knuck = pts[[8, 12, 16, 20]], pts[[5, 9, 13, 17]]
    ratio = np.mean(np.hypot(*(tips - wrist).T) / np.maximum(1, np.hypot(*(knuck - wrist).T)))
    return palm, size, angle, float(np.clip((ratio - 1.2) / .7, 0, 1))

dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = None
if preview:
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', f'{FPS:.3f}', '-i', '-',
                            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', preview], stdin=subprocess.PIPE)
BONES = [(0, 1), (1, 2), (2, 3), (3, 4), (0, 5), (5, 6), (6, 7), (7, 8), (5, 9), (9, 10), (10, 11), (11, 12), (9, 13), (13, 14), (14, 15), (15, 16), (13, 17), (0, 17), (17, 18), (18, 19), (19, 20)]
frames, roi, n, smooth = [], None, 0, None
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    rgb = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    rec = dict(t=round(n / FPS, 3), ok=False)
    if roi is None:
        p = detect_palm(rgb)
        if p: roi = roi_from_palm(p)
    if roi is not None:
        pts, pres = landmarks(rgb, roi)
        if pres > .5:
            smooth = pts if smooth is None else smooth * .5 + pts * .5      # calm the jitter
            palm, size, angle, openv = describe(smooth)
            rec.update(ok=True, score=round(pres, 3), pts=np.round(smooth, 1).tolist(), palm=[round(float(palm[0]), 1), round(float(palm[1]), 1)],
                       size=round(size, 1), angle=round(angle, 1), open=round(openv, 2))
            roi = roi_from_landmarks(pts)                                     # follow the hand into the next frame
        else:
            roi, smooth = None, None
    frames.append(rec)
    if enc:
        img = rgb.copy()
        if rec['ok']:
            P = np.array(rec['pts'])
            for a, b in BONES: cv2.line(img, tuple(map(int, P[a])), tuple(map(int, P[b])), (255, 61, 127), 3)
            for q in P: cv2.circle(img, tuple(map(int, q)), 4, (255, 212, 92), -1)
            cx, cy = map(int, rec['palm']); cv2.circle(img, (cx, cy), int(rec['size'] * .45), (31, 199, 154), 3)
            cv2.putText(img, f"open {rec['open']:.2f}", (cx + 10, cy - 10), cv2.FONT_HERSHEY_SIMPLEX, .8, (255, 255, 255), 2)
        enc.stdin.write(img.tobytes())
    n += 1
if enc: enc.stdin.close(); enc.wait()
json.dump(dict(w=W, h=H, fps=FPS, frames=frames), open(out, 'w'))
ok = sum(f['ok'] for f in frames)
print(f'{out}: {n} frames, hand found in {ok} ({ok / max(1, n):.0%})')
