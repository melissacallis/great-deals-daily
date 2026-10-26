// Hand-drawn doodles for the deal-check slides, drawn in the browser.
// Elements marked data-dd="circle|underline|arrow-down|arrow-left|sparkles|burst|check|hearts" get a doodle;
// data-dd-box="x0,y0,x1,y1" (fractions) targets part of an element, e.g. a button inside a screenshot.
// drawDoodles(seed, progress): a new seed redraws every stroke slightly differently (the "boil");
// progress 0..1 draws the strokes on one after another.
window.drawDoodles = function (seed, progress) {
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const jit = (a) => (rnd() - 0.5) * 2 * a;
  const slide = document.querySelector('.slide');
  const sr = slide.getBoundingClientRect();
  document.querySelector('#dd')?.remove();
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.id = 'dd';
  svg.setAttribute('width', sr.width); svg.setAttribute('height', sr.height);
  svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;overflow:visible';
  slide.appendChild(svg);
  const strokes = [];
  const line = (pts, colour, width) => {
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ` Q${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`;
    }
    const l = pts[pts.length - 1]; d += ` L${l[0].toFixed(1)},${l[1].toFixed(1)}`;
    strokes.push({ d, colour, width });
  };
  const box = (el) => {
    const r = el.getBoundingClientRect();
    let b = { x0: r.left - sr.left, y0: r.top - sr.top, x1: r.right - sr.left, y1: r.bottom - sr.top };
    if (el.dataset.ddBox) {
      const [a, c, e, f] = el.dataset.ddBox.split(',').map(Number), w = b.x1 - b.x0, h = b.y1 - b.y0;
      b = { x0: b.x0 + a * w, y0: b.y0 + c * h, x1: b.x0 + e * w, y1: b.y0 + f * h };
    }
    return b;
  };
  const shapes = {
    circle(b, c) {
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, rx = (b.x1 - b.x0) / 2 + 26, ry = (b.y1 - b.y0) / 2 + 22;
      const a0 = -2.2 + jit(0.2), turns = 1.1 + jit(0.04), n = 46, ph = rnd() * 6, pts = [];
      for (let i = 0; i <= n; i++) {
        const a = a0 + (i / n) * turns * Math.PI * 2, w = 1 + 0.045 * Math.sin(i * 0.45 + ph) + jit(0.012) + (i / n) * 0.06;
        pts.push([cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w]);
      }
      line(pts, c, 9);
    },
    underline(b, c) {
      const y = b.y1 - (b.y1 - b.y0) * 0.16 + 6, pts = [], n = 18, ph = rnd() * 6; // near the baseline, not the bottom of the line box
      for (let i = 0; i <= n; i++) pts.push([b.x0 - 6 + (i / n) * (b.x1 - b.x0 + 12), y + 5 * Math.sin(i * 0.9 + ph) + jit(1.5)]);
      line(pts, c, 8);
    },
    arrow(from, to, c) {
      const mx = (from[0] + to[0]) / 2 + jit(30), my = (from[1] + to[1]) / 2 - 40 + jit(20), pts = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16, u = 1 - t;
        pts.push([u * u * from[0] + 2 * u * t * mx + t * t * to[0] + jit(1.5), u * u * from[1] + 2 * u * t * my + t * t * to[1] + jit(1.5)]);
      }
      line(pts, c, 9);
      const ang = Math.atan2(to[1] - pts[14][1], to[0] - pts[14][0]);
      for (const side of [-1, 1]) {
        const a = ang + Math.PI + side * (0.55 + jit(0.08)), L = 34 + jit(4);
        line([[to[0], to[1]], [to[0] + Math.cos(a) * L * 0.5 + jit(2), to[1] + Math.sin(a) * L * 0.5 + jit(2)], [to[0] + Math.cos(a) * L, to[1] + Math.sin(a) * L]], c, 9);
      }
    },
    'arrow-down'(b, c) { const x = (b.x0 + b.x1) / 2; shapes.arrow([x + 120, b.y0 - 150], [x + 10, b.y0 - 18], c); },
    'arrow-left'(b, c) { const y = (b.y0 + b.y1) / 2; shapes.arrow([b.x1 + 170, y - 110], [b.x1 + 22, y - 6], c); },
    sparkle(x, y, r, c) {
      line([[x, y - r + jit(3)], [x + jit(3), y], [x + jit(2), y + r + jit(3)]], c, 7);
      line([[x - r + jit(3), y], [x, y + jit(3)], [x + r + jit(3), y + jit(2)]], c, 7);
    },
    sparkles(b, c) {
      shapes.sparkle(b.x1 + 34 + jit(3), b.y0 - 10 + jit(3), 26, c);
      shapes.sparkle(b.x1 + 78 + jit(3), b.y0 + 44 + jit(3), 15, c);
      shapes.sparkle(b.x0 - 30 + jit(3), b.y1 + 10 + jit(3), 18, c);
    },
    burst(b, c) {
      const x = b.x1 + 26, y = b.y0 + 20;
      for (const a of [-0.9, -0.35, 0.2]) line([[x + Math.cos(a) * 16, y + Math.sin(a) * 16], [x + Math.cos(a) * (52 + jit(5)) + jit(2), y + Math.sin(a) * (52 + jit(5)) + jit(2)]], c, 8);
    },
    check(b, c) {
      const x = b.x1 + 40, y = (b.y0 + b.y1) / 2;
      line([[x + jit(2), y + jit(2)], [x + 22 + jit(2), y + 26 + jit(2)], [x + 70 + jit(3), y - 40 + jit(3)]], c, 11);
    },
    hearts(b, c) {
      for (const [x, y, k] of [[b.x1 - 20, b.y0 - 34, 1], [b.x1 + 26, b.y0 + 10, 0.65]]) {
        const pts = [];
        for (let i = 0; i <= 30; i++) {
          const t = (i / 30) * Math.PI * 2;
          pts.push([x + k * 16 * Math.pow(Math.sin(t), 3) * 1.6 + jit(1.2), y - k * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 1.6 + jit(1.2)]);
        }
        line(pts, c, 7);
      }
    },
  };
  for (const el of document.querySelectorAll('[data-dd]')) {
    const b = box(el), c = el.dataset.ddColour || '#ffffff';
    for (const kind of el.dataset.dd.split(' ')) {
      if (kind === 'underline' && !el.dataset.ddBox) {
        // one wavy line under each line of wrapped text
        for (const r of el.getClientRects()) shapes.underline({ x0: r.left - sr.left, y0: r.top - sr.top, x1: r.right - sr.left, y1: r.bottom - sr.top }, c);
      } else shapes[kind](b, c);
    }
  }
  strokes.forEach((st, i) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', st.d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', st.colour);
    p.setAttribute('stroke-width', st.width); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
    p.style.filter = 'drop-shadow(0 3px 6px rgba(59,15,58,.18))';
    svg.appendChild(p);
    const len = p.getTotalLength(), n = strokes.length;
    const local = Math.max(0, Math.min(1, progress * n - i * 0.85));
    p.setAttribute('stroke-dasharray', `${len} ${len}`);
    p.setAttribute('stroke-dashoffset', `${len * (1 - local)}`);
  });
};
// Entrance: headline, cards and badges rise in one after another (t = 0..1).
window.enter = function (t) {
  const els = [...document.querySelectorAll('.slide > *:not(.foot):not(#dd)')];
  els.forEach((el, i) => {
    const k = Math.max(0, Math.min(1, t * 1.7 - i * 0.18)), e = 1 - Math.pow(1 - k, 3);
    el.style.opacity = e; el.style.transform = `translateY(${(1 - e) * 60}px) scale(${0.96 + 0.04 * e})`;
  });
};
