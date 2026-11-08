---
name: deal-video
description: >-
  Turn the owner's screen recording of ubottega.com (plus optional talking clips) into finished
  short videos for TikTok, Instagram Reels and Pinterest: paper-cut / doodle themes, zoom-ins and
  pop-out deal cards, price rings, bottom header cards, dated headers, sound effects or the original
  holiday jingle, background blur, and platform-specific wording. Use whenever the user uploads a
  recording (.mkv/.mov/.mp4, or names a file in Google Drive) and asks to edit it, "make a video",
  "highlight these deals", "make it for TikTok/Instagram/Pinterest", "add snow/music/sound effects",
  "blur the background", or wants the same style as a previous deal video.
---

# Deal video workflow (UBottega / Data Darling)

Built up over many edits with the owner. Follow it so every video matches what she has approved.

## 0. Get the footage

- **Uploads** land in `/root/.claude/uploads/<session>/…`. Phone files over ~30 MB can't be uploaded:
  she sends them through **Google Drive** instead. Find them with the Google Drive tools
  (`search_files` with `mimeType contains 'video/'` and a recent `modifiedTime`), then
  `download_file_content` and decode the base64 into the scratchpad.
- Probe every file first: `ffprobe` size, duration, fps, audio; `cropdetect` for black borders.
  OBS recordings have often been 852×480 with the browser in only the **top-left 480×480**: crop to it.
- Make a contact sheet (`fps=N/dur,scale,tile`) and look at it before planning anything.
- Rough transcript of speech: `$S/asr/bin/python $S/asr.py <16k raw>` (pocketsphinx; times are good,
  words are rough; confirm by ear-shaped guesses and the on-screen captions).

## 1. Privacy and accuracy checks (always)

- **Never show** her address, city ("Corpus Christi", "78413"), Amazon "Deliver to" lines, browser
  search history / autocomplete suggestions, bookmarks bar (e.g. "CCISD Links"), or other tabs.
  Start the address-bar zoom *after* any history dropdown, crop or blur the rest.
- Videos that show her face or voice stay **out of git** (the repo is public). Only commit scripts.
- Read the deal name, price and % off from the frame you freeze; don't guess.
- Note to the owner each time: Amazon Associates rules don't allow prices or Amazon product photos
  in social posts, and they change fast. Showing them is **her call**; she has chosen to show them.

## 2. House style she has approved

- **Vertical 1080×1920** for TikTok/Reels; **Pinterest 1000×1500 (2:3)**.
- **Instagram/TikTok**: say **"🔗 Link in bio"**. **Pinterest**: "👆 Tap to shop" / "Tap the pin to shop".
- **No "#ad" and no website address on the video itself.** (The disclosure goes in the caption:
  "I earn from qualifying purchases.") The only exception is footage of her typing the address.
- **Sound**: sound effects only unless she asks otherwise. No copyrighted music. Her own talking
  clips keep her voice (normalised), with burned-in captions so it works muted. For Pinterest
  music, use the original jingle (`marketing/daily-video/jingle.py`), quiet under the effects.
- **Dated header**: "Top Deals · on Amazon today" + weekday and date tag (e.g. SAT 11-7).
- Highlights: freeze, zoom in, ring around the price, bottom header card with category
  (FOR HER / FOR HIM / UNDER $25 / ELECTRONICS…), product name, one-line note, "-NN% OFF" sticker.
- Themes: **paper-cut** (latest favourite), **doodle boil**, snowy pink frame for holidays.
- End card: logo + "See all 50 deals" + the platform CTA.

## 3. Tools in the repo

| Need | Script |
|---|---|
| Paper-cut video, all 3 platforms, optional talking intro with captions | `marketing/paper-cut/build.py` (+ `overlays.mjs`) |
| Doodle-boil dated video with freeze-zoom + price circles | `marketing/daily-video/build.py` (+ `overlays.mjs`) |
| Reel/Pinterest framing over snow, hook cover | `marketing/daily-video/reel.sh`, `snow-bg.py`, `reel-cover.mjs` |
| Original royalty-free holiday jingle | `marketing/daily-video/jingle.py <secs> <out.wav>` |
| Blur her room, keep her (+ chair/mic outline) sharp | `marketing/deal-check/tools-blur-background.py` (strength 9 ≈ "50%") |
| Cut her out onto a gradient | `marketing/deal-check/tools-cutout-person.py` |
| Remove background music from a clip | `marketing/deal-check/tools-remove-music.py` |
| Daily Top 10 Pinterest image | live page `www.ubottega.com/pin` |

Scratchpad assets: fonts `$S/fonts` (Poppins), selfie model `$S/model/selfie_segmenter.tflite`,
Python with numpy/OpenCV/LiteRT `$S/cv/bin/python`, whoosh `marketing/deal-check/whoosh.wav`.

To reuse a build for a new recording, edit its highlight list (times, price positions, names),
the scroll ranges and DATE/WEEKDAY. Find price positions by grabbing the frame with a grid
(`drawgrid`) and reading coordinates; then check the rendered frames, since the ring must sit on the price.

## 4. Quality bar (check before sending)

- Pull 6-9 frames across the video (`-ss t -frames:v 1`, tile them) and look: ring on the price,
  text not clipped, header letters not overlapping the date tag, nothing behind TikTok/IG buttons
  (keep key content out of the right ~120 px and bottom ~350 px), Pinterest crop keeps header + card.
- Check audio levels (`volumedetect`) and say plainly that you can't listen to it.
- Commit and push the scripts (never the videos), then send the files with `SendUserFile` and give
  a caption per platform (TikTok/IG caption with hashtags; Pinterest title + description + link
  `https://www.ubottega.com/` + board).

## 5. Palm video ("deals in my hand"), approved 11-8

She talks to camera (phone, upright, waist up); she is cut out and placed in front of her **live site
scrolling** behind her; deal cards lift off the page and land on her **open palm** as she names them,
all cards fan out at the end, "LINK IN BIO" sticker when she says it, date tag on top. Her voice + effects.
1. `ffmpeg -i clip -vf fps=30 … src.mp4`; transcript with `asr-words.py` to find when she names each deal.
2. `python marketing/hand-cards/hand_track.py src.mp4 $S/model/hand track.json preview.mp4`
   (model: MediaPipe `hand_landmarker.task` unzipped into `$S/model/hand`). Summarise `open` per second
   and look at the preview to find open-palm moments; match them to the words.
3. Cards from the live site: `COMPACT=1 sh marketing/hand-cards/live_cards.sh <dir> her him under-10 tech home`
   (needs the "great-deals-daily" environment, which allows www.ubottega.com + m.media-amazon.com).
   Swap any card that doesn't fit the label (e.g. a book as "for him") with `card_render.mjs <url> <dir> 1 <skip>`.
4. Background: `node marketing/hand-cards/site_scroll.mjs https://www.ubottega.com/ site.png`.
5. Write a config (video, track, site, cards with label/in/out, fan in/out, cta_at, date) and run
   `python marketing/hand-cards/palm_video.py config.json`. Check frames at every card time.
Pillow fonts have no emoji: keep on-video text plain ("LINK IN BIO", "UNDER $10").

## 6. Effects menu

`effects.md` (next to this file) lists 16 effects the owner wants available (orbit, couch wall, UI world,
frame break, digital zoom, phone mockup, checklist, headline wall, zoom-through cut, chart grow, pull-back
reveal, green screen, paper cut, doodle boil, vertigo, cover story), how to build each, and which exist.
When she asks for an effect by name, read it, build or reuse it, and mark it ✅ there once it works.

## 7. Work in progress: next-level motion

The owner wants more motion and sharper close-ups:
- **Pop-out cards**: a deal card peels off the page in 3D, comes to the front (page blurs/dims),
  presents with ring + sticker, then flies back to its slot (ghost outline while it's out).
- **Sharpness**: zooming a 480-px-wide recording looks grainy. Prefer **iPhone screen recordings**
  (1170×2532, vertical) or OBS at 1920×1080 with the page at 150%, and/or rebuild featured cards
  crisp from the site's live deal data (needs network access to www.ubottega.com and
  m.media-amazon.com; request it with the environment tools when building this).
- iPhone screen recordings run ~1–1.5 MB/s: under 30 MB ≈ 20–30 s; longer ones come via Google Drive.
- Smooth 60 fps easing, light motion blur on fast moves, sound cues timed to each motion.
Update this skill when that pipeline exists.
