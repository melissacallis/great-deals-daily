// Doodle icons and haul items shared by the orbit video and the carousel.
// Doodle icons, drawn in a 120x120 box centred on 0,0. Plum lines, simple shapes.
export const icons = {
  socks: `<path d="M-18,-48 L18,-48 L18,10 Q18,30 36,34 Q52,38 50,52 Q48,62 30,60 L-6,56 Q-22,54 -20,36 Z"/>
          <path d="M-18,-36 L18,-36 M-18,-26 L18,-26"/><circle cx="-6" cy="20" r="3"/><circle cx="8" cy="30" r="3"/><circle cx="24" cy="44" r="3"/>`,
  claw: `<rect x="-46" y="-46" width="92" height="22" rx="11"/>
         <path d="M-38,-24 Q-50,10 -26,40 M-19,-24 Q-26,14 -10,46 M0,-24 L0,48 M19,-24 Q26,14 10,46 M38,-24 Q50,10 26,40"/>`,
  cable: `<rect x="-28" y="-22" width="56" height="44" rx="18"/><path d="M-60,4 Q-60,-40 -28,-6 M28,-6 Q60,-40 60,4 Q60,40 30,30"/><path d="M-10,-22 L-10,22 M10,-22 L10,22"/>`,
  bag: `<path d="M-38,-14 L38,-14 L46,52 L-46,52 Z"/><path d="M-18,-14 Q-18,-44 0,-44 Q18,-44 18,-14"/>
        <path d="M-30,-14 L-22,-34 L-10,-18 L2,-38 L14,-18 L26,-34 L32,-14"/><path d="M-6,10 Q0,2 6,10 Q0,18 -6,10 M0,10 L-12,30 M0,10 L12,30"/>`,
  light: `<rect x="-56" y="-14" width="112" height="28" rx="12"/><circle cx="-24" cy="0" r="6"/><circle cx="24" cy="0" r="6"/>
          <path d="M-40,26 L-48,46 M0,26 L0,50 M40,26 L48,46"/>`,
};
export const items = [
  { key: 'socks', label: 'Fuzzy socks', tag: 'stocking stuffer', colour: '#ffd0e0' },
  { key: 'claw', label: 'Claw clips', tag: 'budget find!', colour: '#ffe08a' },
  { key: 'cable', label: 'Cable clips', tag: 'desk upgrade', colour: '#c9f0e4' },
  { key: 'bag', label: 'Gift bags', tag: 'order early!', colour: '#e3d4ff' },
  { key: 'light', label: 'Closet light', tag: "check today's price", colour: '#ffcfae' },
];

// Keep-or-skip notes for the carousel (from the Amazon Haul Finds campaign).
export const notes = {
  socks: 'The classic stocking stuffer. A multi-pack covers several people; check sizing in the reviews.',
  claw: 'One for the car, the purse and the bathroom. Keep if the teeth close evenly.',
  cable: 'Stops chargers sliding behind the nightstand. An easy cheap desk upgrade.',
  bag: 'Holiday wrapping for less than the party store. Order early: Haul ships slower than Prime.',
  light: 'Stick-on, rechargeable, no wiring. Keep if the sensor turns it on every time.',
};
