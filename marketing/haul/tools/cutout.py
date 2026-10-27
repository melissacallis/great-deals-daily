# Cuts a product out of its photo background with OpenCV GrabCut (no AI model needed).
# python cutout.py <in> <out.png> <crop x,y,w,h> <object rect x,y,w,h inside the crop>
import sys, cv2, numpy as np
src, out, crop, rect = sys.argv[1], sys.argv[2], [int(v) for v in sys.argv[3].split(',')], [int(v) for v in sys.argv[4].split(',')]
img = cv2.imread(src, cv2.IMREAD_COLOR)
x, y, w, h = crop
img = img[y:y + h, x:x + w]
scale = 900 / max(img.shape[:2]) if max(img.shape[:2]) < 900 else 1.0  # small photos: work at a larger size
if scale != 1.0:
    img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    rect = [int(v * scale) for v in rect]
mask = np.zeros(img.shape[:2], np.uint8)
bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
cv2.grabCut(img, mask, tuple(rect), bg, fg, 8, cv2.GC_INIT_WITH_RECT)
m = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
# keep the bigger pieces only (drops specks of background)
n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
keep = np.zeros_like(m)
big = stats[1:, cv2.CC_STAT_AREA].max() if n > 1 else 0
for i in range(1, n):
    if stats[i, cv2.CC_STAT_AREA] > big * 0.04:
        keep[lab == i] = 255
alpha = cv2.GaussianBlur(keep, (5, 5), 0)
rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA); rgba[:, :, 3] = alpha
ys, xs = np.where(alpha > 10)
pad = 12
rgba = rgba[max(0, ys.min() - pad):ys.max() + pad, max(0, xs.min() - pad):xs.max() + pad]
cv2.imwrite(out, rgba)
print(out, rgba.shape[1], 'x', rgba.shape[0])
