# HANDOFF

How to rebuild *Seen From Space*, where everything lives, and what's unfinished.

## Rebuild from scratch

```bash
# one-time setup (Ubuntu)
npm install                                        # esbuild, typescript, ws
python3 -m pip install numpy scipy mido pyloudnorm pillow
sudo apt-get install -y fluidsynth fluid-soundfont-gm ffmpeg
# Chromium: the repo uses the globally installed Playwright at /opt/node22/lib/node_modules/playwright.
# Elsewhere: npm i -g playwright && npx playwright install chromium, then fix the require path in render/harness.mjs.
```

```bash
bash audio/build_audio.sh                          # score + foley + mix -> audio/out/mix.wav, final/score.wav (~1 min)
node render/build.mjs                              # bundle the engine -> build/engine.js
node render/render.mjs --workers 3                 # 960x540 preview of every shot -> build/seg_540/*.mp4 + build/film_540.mp4
node render/render.mjs --final --workers 3         # 1920x1080 masters -> build/seg_1080/*.mp4 (slow: about 1 h on 4 cores)
node render/master.mjs --tag 1080                  # two-pass H.264 + AAC -> final/seen_from_space.mp4 (< 95 MB)
```

## Useful one-offs

```bash
node render/still.mjs --scale 0.5 I4@1.5 K1@4      # stills (shot@seconds) -> build/stills/
node render/still.mjs --scale 1 --out stills lab:lineup   # dev "lab" frames (turnarounds)
node render/render.mjs --shots I4,I5 --no-concat   # re-render a few shots
node render/concat.mjs 540                          # re-join segments + audio
python3 render/sheet.py out.png 3 600 a.png b.png   # contact sheet
node render/shotlist.mjs                            # regenerate writers_room/shot_list.md from film/edl.json
npx tsc -p .                                        # typecheck the engine
```

Use `SFS_BUNDLE=engine_x.js` with both `render/build.mjs` and the render scripts to work on a private bundle without disturbing other renders.

## Where things are

| Path | What |
|---|---|
| `film/edl.json` | **Single source of truth for timing.** 53 shots, 168 s. Picture, shot list and score all read it. |
| `writers_room/` | Concepts and scores, script, generated shot list |
| `engine/src/core/` | math/noise/easing, keyframes (`anim.ts`), stage (canvases) |
| `engine/src/post/post.ts` | WebGL pencil/paper/boil/bloom/grade stack |
| `engine/src/draw/` | brush (hand-made shapes), light (bulbs, glows, beams), shade (Klaus lighting), letters (hand lettering), tablet (invented UI) |
| `engine/src/chars/` | rig (person drawing, poses, walk) and cast (all characters) |
| `engine/src/sets/` | street, livingroom, bedroom, town3d (A1/J1), aerial (Earth), plus the forks' sets (shed, doorstep, shop, …) |
| `engine/src/shots/seqX.ts` | one file per sequence, `shot('A1', f => …)` |
| `render/` | build, still, render (parallel per-shot), concat, master, sheet, shotlist |
| `audio/` | `score.py`, `foley.py`, `mix.py`, `CUE_SHEET.md`, `AUDIO_CREDITS.md` |
| `stills/` | style frames and lab turnarounds |
| `final/` | deliverables |

## Status (end of the night)

- [x] Writers' room, EDL, shot list (`writers_room/`)
- [x] Engine and post stack, style frames (`stills/`), style bible
- [x] Score and foley, mastered to -14 LUFS; the missing note lands on frame 3276
- [x] All 53 shots, built by me plus two production forks
- [x] Three blind-critic polish passes, each followed by fixes (DECISIONS.md, entries 33–57)
- [x] 1080p master, poster, contact sheet, 30 s and 10 s cut-downs (`final/`)

## Known issues and what's unfinished

- **Misdirect strength.** Every blind critic guessed her real plan early, because Act 1 (the photo, Grandad and Grandma's labelled boxes) telegraphs it. The Santa material reads as a brief red herring, not a full misdirect. Fixing it properly means restructuring Act 1: hide whose lights they are until the reveal, which the brief's own beat order makes hard.
- **Animation.** Poses are clean but often frontal and stiff. Crowd figures in wide shots are small and simple. The rig has no squash and stretch and no overlapping action on coats.
- **J1, mid-rise.** The top-down town reads as procedural for about a second.
- **Score.** The General MIDI strings are serviceable but thin. `audio/score.py` is the place to swap in a better sample library.
- **Shot-by-shot ownership.** C/D/E were built by production fork 1 (`seqC/D/E.ts`, `sets/shed.ts`, `hallway.ts`, `props.ts`). F/G/H were built by production fork 2 (`seqF/G/H.ts`, `sets/doorstep.ts`, `shop.ts`). Everything else is mine.
