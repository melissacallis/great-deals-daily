# Effects menu (from the "pick your favorite 1 to 17" reference reel)

The owner shared a creator's reel showing these effects and wants them in our toolkit. Most rely on the
same core: **cut her out** (selfie segmenter: `tools-cutout-person.py` / the matte in `palm_video.py`) so
graphics can sit **behind** her (between background and body) or **in front** of her. Hand tracking
(`hand-cards/hand_track.py`) and crisp live cards (`hand-cards/card_render.mjs`) feed several of them.

Status: ✅ built and used · 🟡 partly there (same parts exist) · ⬜ not built yet.

| # | Effect | What it looks like | How we build it | Deals idea |
|---|---|---|---|---|
| 1 | **Orbit** 🟡 | Small photo/video cards circle around her; behind her on the far side, in front on the near side | Cards on an elliptical path; draw the far half before compositing her cutout, the near half after | Today's 5 deals orbiting her head while she says "these are flying off the shelf" |
| 2 | **Couch wall** ✅ | Pictures pinned on the wall behind her, popping on one by one | `marketing/hand-cards/couch_wall.py config.json`: pins (card, label, % off, time, x, y, h, rot) taped onto the real wall, her matte drawn on top. Put pins in open wall space (ceiling, sides); cards right behind her head mostly disappear | Gift ideas "pinned" on her wall like a mood board |
| 3 | **UI world** ⬜ | She appears inside an app screen (chat box typing a prompt) | Render a UI frame in Playwright (our site, or a chat bubble), put her video in its window, type text | Her inside the ubottega.com page, typing a search |
| 4 | **Frame break** 🟡 | She's in a phone/picture frame, and part of her steps out over the frame edge | Frame drawn over the video, then her cutout drawn again on top only where it crosses the frame edge | "Breaking out" of a deal card / the site frame |
| 5 | **Digital zoom** ✅ | Sharp punch-in zooms on key words, with a blur flash | zoompan / scale with easing; whip-blur on the cut | Punch in on her face at "79% off!" |
| 6 | **Phone mockup** 🟡 | A phone screen floats beside her showing an app | Phone frame PNG + screen content (site screenshot/scroll) with 3D tilt and shadow | Phone beside her scrolling the Top 50 |
| 7 | **Checklist** ⬜ | A checklist panel; items tick off one by one | HTML/SVG panel rendered per frame; tick + pop sound on each word | "Is it a real deal?" checklist: usual price ✓, history ✓, reviews ✓ |
| 8 | **Headline wall** ⬜ | Newspaper-style headline clippings slap onto the wall behind her | Paper clippings (paper-cut style) composited behind the cutout, stop-motion pops | "BLACK FRIDAY PRICES EARLY", "79% OFF" headlines |
| 9 | **Zoom-through cut** ⬜ | Camera zooms into a dark spot / object and comes out in the next scene | Fast zoom into a point with motion blur, crossfade on the darkest frame into the next clip | From her talking to the screen recording |
| 10 | **Chart grow** 🟡 | A glowing line chart draws itself behind her | Animated SVG line + glow drawn behind the cutout (we had the price-history line) | Price-history line dropping to today's price |
| 11 | **Pull-back reveal** ⬜ | Video shrinks back to reveal it's playing inside an app window, with a sidebar of steps | Scale the whole video down into a rendered app window; animated sidebar items | Reveal she's "inside" the UBottega site / editing timeline |
| 12 | **Green screen** ✅ | Her cutout over a different video (picture-in-picture screen) | Selfie matte over any background (site scroll, product video) | Her in front of the scrolling site (palm video) |
| 13 | **Paper cut** ✅ | Ransom-note letters, torn paper, her cutout with a white sticker border | `paper-cut/overlays.mjs` + cutout with a white outline (dilate the matte) | Paper-cut deals video (11-7) |
| 14 | **Doodle boil** ✅ | Wobbly hand-drawn outline around her, doodle stars and hearts | Doodle overlays + outline traced from her matte, re-jittered ~8×/s | Doodle-boil deal videos |
| 15 | **Vertigo** ⬜ | Background zooms/stretches while she stays the same size (dolly zoom) | Scale the background layer up/down while the cutout stays fixed; fill her hole by blurring/inpainting | Dramatic moment: "and the price is…" |
| 16 | **Cover story** ⬜ | Giant magazine-cover word behind her head (in front of the wall, behind her) | Big serif text rendered between background and cutout, plus small cover lines | "UBOTTEGA" or "DEALS" as the magazine title behind her |

Also in the reel: a **hook line** at the top for the whole video ("pick your favorite 1 to 17"), an
**effect counter** (01/17) under each, and a **comment-keyword CTA** ("comment STUDIO"). Note: the owner
doesn't run comment-keyword funnels (bio link only), so use the counter/hook ideas and skip the keyword CTA.

## Shared building blocks to add when these get built
- `cutout.py`: per-frame matte to a file (PNG sequence or video with alpha) so every effect can layer
  behind/in front of her without re-running segmentation.
- A white **sticker outline** from the matte (dilate + blur) for paper-cut / doodle looks.
- Background fill for vertigo (blur or inpaint where she was).
- One HTML/SVG overlay renderer per effect, using the house fonts and colours.
