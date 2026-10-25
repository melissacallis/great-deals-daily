// Placeholder products shown when no API credentials are configured, so the
// site can be previewed. They are clearly labelled as demo data in the UI.

const COLORS = ['#ffedd5', '#dbeafe', '#dcfce7', '#fce7f3', '#ede9fe', '#fef9c3', '#cffafe'];

const SAMPLES = {
  tech: [['🎧', 'Wireless Noise-Cancelling Headphones', 129.99, 249.99], ['🔊', 'Portable Bluetooth Speaker, Waterproof', 39.99, 69.99], ['⌚', 'Fitness Smartwatch with Heart Rate Monitor', 59.99, 119.99], ['🔌', 'USB-C Fast Charger 65W, 3-Port', 24.99, 45.99], ['📷', '4K Action Camera with Accessories Kit', 79.99, 149.99], ['🖱️', 'Ergonomic Wireless Mouse', 17.99, 29.99]],
  home: [['🍳', 'Nonstick Ceramic Frying Pan Set (3 pc)', 34.99, 69.99], ['☕', 'Programmable 12-Cup Coffee Maker', 44.99, 79.99], ['🧹', 'Robot Vacuum with App Control', 149.99, 299.99], ['🛏️', 'Cooling Memory Foam Pillow, 2-Pack', 29.99, 59.99], ['🔪', 'Stainless Steel Knife Block Set', 49.99, 99.99], ['🕯️', 'Scented Soy Candle Gift Set', 15.99, 27.99]],
  fashion: [['👟', 'Lightweight Running Shoes', 44.99, 89.99], ['🧥', 'Packable Puffer Jacket', 54.99, 119.99], ['🎒', 'Water-Resistant Laptop Backpack', 27.99, 49.99], ['🕶️', 'Polarized Sunglasses', 14.99, 34.99], ['🧦', 'Cushioned Athletic Socks, 8-Pack', 12.99, 24.99], ['👜', 'Vegan Leather Crossbody Bag', 22.99, 45.99]],
  beauty: [['💄', 'Long-Wear Lipstick Set', 13.99, 26.99], ['🧴', 'Hyaluronic Acid Face Serum', 11.99, 24.99], ['💇', 'Ionic Hair Dryer with Diffuser', 39.99, 79.99], ['🪥', 'Rechargeable Electric Toothbrush', 29.99, 59.99], ['🧼', 'Gentle Foaming Cleanser', 8.99, 15.99], ['💅', 'Gel Nail Polish Kit with UV Lamp', 25.99, 49.99]],
  toys: [['🧸', 'Plush Teddy Bear, 18 inch', 16.99, 29.99], ['🧩', '1000-Piece Jigsaw Puzzle', 12.99, 22.99], ['🚁', 'Mini Drone for Kids with Camera', 39.99, 79.99], ['🎲', 'Family Board Game Night Bundle', 24.99, 44.99], ['🧱', 'Building Bricks Classic Set (500 pc)', 22.99, 39.99], ['🚂', 'Wooden Train Set', 29.99, 54.99]],
  outdoors: [['⛺', '4-Person Instant Camping Tent', 69.99, 139.99], ['🚲', 'Bike Repair Tool Kit', 19.99, 34.99], ['🧘', 'Non-Slip Yoga Mat with Strap', 18.99, 35.99], ['🏋️', 'Adjustable Dumbbell Set', 89.99, 179.99], ['🥾', 'Waterproof Hiking Boots', 59.99, 109.99], ['🔦', 'Rechargeable LED Headlamp', 13.99, 24.99]],
};

function placeholderImage(emoji, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${color}"/><text x="200" y="250" font-size="170" text-anchor="middle">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

let seq = 0;
function build(categoryId, [emoji, title, price, list], i) {
  seq++;
  const pct = Math.round((1 - price / list) * 100);
  return {
    asin: `DEMO${String(seq).padStart(6, '0')}`,
    title,
    brand: 'Demo Brand',
    features: [],
    image: placeholderImage(emoji, COLORS[(i + categoryId.length) % COLORS.length]),
    url: '#demo',
    price: `$${price.toFixed(2)}`,
    priceAmount: price,
    listPrice: `$${list.toFixed(2)}`,
    listPriceLabel: 'List',
    savingsPct: pct,
    dealBadge: pct >= 50 ? 'Limited time deal' : null,
    dealEndsAt: pct >= 50 ? new Date(Date.now() + (3 + i) * 3600_000).toISOString() : null,
    rating: Math.round((3.9 + ((i * 7) % 11) / 10) * 10) / 10,
    reviewCount: 120 + i * 937,
    availability: 'In Stock',
  };
}

export function demoDeals(categoryId, query) {
  let items;
  if (categoryId === 'top' || !SAMPLES[categoryId]) {
    items = Object.entries(SAMPLES).flatMap(([id, list]) => list.map((s, i) => build(id, s, i)));
    items.sort((a, b) => b.savingsPct - a.savingsPct);
    items = items.slice(0, 12);
  } else {
    items = SAMPLES[categoryId].map((s, i) => build(categoryId, s, i));
  }
  if (query) {
    const q = query.toLowerCase();
    items = Object.entries(SAMPLES).flatMap(([id, list]) => list.map((s, i) => build(id, s, i)))
      .filter((it) => it.title.toLowerCase().includes(q));
  }
  return items;
}
