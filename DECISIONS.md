# DECISIONS

Every call I made without asking, in order, with the reason for each. (The brief said: decide, log it, keep going.)

## Phase 0: setup

1. **Render path: headless Chromium with Canvas2D for drawing and WebGL2 for post-processing.** Frames are read back with `readPixels` and streamed over a localhost WebSocket into ffmpeg. I benchmarked three options. HTTP POST of raw frames cost 275 ms per frame. Playwright `evaluate` round-trips per frame were also slow. A WebSocket from an in-page render loop cost about 65 ms per frame. *Why:* the brief suggested Chromium, Playwright was preinstalled, and WebGL gives a real post stack (bloom, grain, boil) even though it runs on SwiftShader on the CPU.
2. **Bundling with esbuild.** It's fast and needs no config, and TypeScript is compiled for type checking only.
3. **Audio uses FluidSynth plus the FluidR3_GM soundfont (MIT licence, Debian package `fluid-soundfont-gm`), mixed and mastered in numpy/scipy.** *Why:* a sampled celesta, piano, strings, glockenspiel and choir sound far less "synthetic" than pure additive synthesis. The brief explicitly allows a freely licensed soundfont. Foley is synthesised from scratch.
4. **The single source of truth for timing is `film/edl.json`.** The engine, the shot-list generator and the score scripts all read it, so picture and music can't drift apart.
5. **Fonts:** in-world lettering uses a hand-built single-stroke alphabet drawn in code, with no font file involved. The invented tablet UI and the end card use **Inter** (SIL Open Font License), which is installed on the system and credited in CREDITS.md.

## Phase 1: writers' room

6. **The concept stays "Seen From Space".** It scored 111/120 predicted, against 84 for "The Recipe" and 82 for "Ground Control". See `writers_room/concepts.md`.
7. **Loft → garden shed.** A loft needs a ladder, which breaks the hard rule *and* undercuts her Turn line ("im not allowed up ladders"). The shed is more visual in snow, and it gives us the torch-beam-through-dust shot.
8. **The photo is staged to rhyme with the climax:** Grandma points at the sky while Grandad crouches by the door with a bulb. The climax re-stages it with Nell in Grandma's role. That rhyme is the reason Grandad finally laughs, and it motivates the camera rising to space.
9. **The misdirect gets a double meaning:** "seen from space" reads as "seen by Santa's sleigh", and the wall shows roofs, a chimney and an X.
10. **The reveal is a picture:** the pull-back from her wall shows every string leading to a drawing of Grandad's house. The readable reply says "*his* street", and the drawing says whose.
11. **The ladder man shuts the door, then the ladder comes out first.** That's the laugh and the lump in one move.
12. **The dead-switch fix is played on the motif:** Grandad's fingers walk the bulbs, one piano note per bulb, and stop on the missing note.
13. **The coda moves from Nell's bedroom to Grandad's armchair.** *This departs from the brief on purpose.* The film opens on an empty armchair with Grandma's cardigan, and it should close on that chair, no longer empty. The tablet on her lap still carries the closing message.
14. **The frosted bell is planted by the door in A2** (frozen and silent) and tinkles after the blaze.
15. **Every neighbour switches their own lights off for the reveal,** so Grandad's house is the brightest thing on Earth when it blazes. They then come back on one by one like a fuse. This is borrowed from the "Ground Control" pitch.
16. **Running time is 2:48 including a 5 s end card, across 53 shots.** The blaze lands at 2:16.5, frame 3276.
