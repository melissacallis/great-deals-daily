// Puts a product photo on the brand's soft purple/peach/pink gradient (the
// same look as the owner's headshot) before it is uploaded.
//
// - A cut-out photo (PNG with a transparent background, e.g. from the
//   iPhone's "lift subject") is trimmed, centred and given a soft shadow.
// - A regular photo is placed as a rounded, framed picture on the gradient.

const SIZE = 1200;

function paintGradient(ctx, w, h) {
  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, '#b48cf0');
  base.addColorStop(0.45, '#ffb48c');
  base.addColorStop(1, '#f79cc4');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // Soft colour clouds, like a studio backdrop.
  const blobs = [
    { x: -0.05, y: 0.35, r: 0.75, c: '138, 111, 240' }, // purple, left
    { x: 0.6, y: 0.05, r: 0.7, c: '255, 176, 119' }, // warm orange, top
    { x: 0.35, y: 0.8, r: 0.6, c: '255, 195, 154' }, // peach, bottom
    { x: 0.9, y: 0.6, r: 0.55, c: '255, 140, 186' }, // pink, right
    { x: 1.05, y: 1.05, r: 0.5, c: '157, 176, 255' }, // lilac-blue, corner
  ];
  for (const b of blobs) {
    const g = ctx.createRadialGradient(b.x * w, b.y * h, 0, b.x * w, b.y * h, b.r * Math.max(w, h));
    g.addColorStop(0, `rgba(${b.c}, 0.85)`);
    g.addColorStop(1, `rgba(${b.c}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

// Bounding box of the visible (non-transparent) pixels, or null if the image
// has no transparency at all.
function opaqueBounds(bitmap) {
  const scale = Math.min(1, 300 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale)), h = Math.max(1, Math.round(bitmap.height * scale));
  const c = new OffscreenCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  let transparent = 0, minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a < 200) transparent++;
      if (a > 20) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
  }
  if (transparent < w * h * 0.03 || maxX < 0) return null; // basically opaque
  return { x: minX / scale, y: minY / scale, w: (maxX - minX + 1) / scale, h: (maxY - minY + 1) / scale };
}

export async function brandBackdrop(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  paintGradient(ctx, SIZE, SIZE);

  const cut = opaqueBounds(bitmap);
  ctx.save();
  ctx.shadowColor = 'rgba(59, 15, 58, 0.28)';
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 26;
  if (cut) {
    // Cut-out: trim to the product and fill ~76% of the frame.
    const s = Math.min((SIZE * 0.76) / cut.w, (SIZE * 0.76) / cut.h);
    const dw = cut.w * s, dh = cut.h * s;
    ctx.drawImage(bitmap, cut.x, cut.y, cut.w, cut.h, (SIZE - dw) / 2, (SIZE - dh) / 2 - 10, dw, dh);
  } else {
    // Regular photo: a rounded picture with a white border, centred.
    const box = SIZE * 0.78, border = 18, r = 44;
    const s = Math.min(box / bitmap.width, box / bitmap.height);
    const dw = bitmap.width * s, dh = bitmap.height * s;
    const x = (SIZE - dw) / 2, y = (SIZE - dh) / 2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(x - border, y - border, dw + border * 2, dh + border * 2, r + border); ctx.fill();
    ctx.restore(); ctx.save();
    ctx.beginPath(); ctx.roundRect(x, y, dw, dh, r); ctx.clip();
    ctx.drawImage(bitmap, x, y, dw, dh);
  }
  ctx.restore();
  bitmap.close?.();
  return { blob: await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 }), cutout: Boolean(cut) };
}
