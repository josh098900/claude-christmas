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

## Phase 2: look and engine

17. **Look = pencil post on top of designed shapes.** Every frame is drawn as clean, slightly irregular colour shapes (no outlines), then a WebGL pass adds directional hatch, paper tooth, speckle, line boil (re-seeded on twos) and edge breakup. *Why:* it keeps the drawing readable and lets texture do the "handmade" work consistently on all 53 shots.
18. **Klaus lighting is automatic per character.** Each character is shaded in four groups, with a core shadow and a rim taken from the silhouette offset toward and away from the motivated light, plus additive light pools (tablet, torch, blaze). *Why:* flat 2D shapes read as solid and lit by their world, and every shot gets it for free.
19. **Glow is premultiplied additive light**, with a hue-preserving tone map. Fixed after the first street render, where glows un-premultiplied into hard discs and a thousand coloured bulbs summed to white. Now the blaze stays coloured.
20. **Performance:** bulbs are cached sprites and soft shadows use downsample/upsample instead of canvas blur filters (the blaze frame went from 20.7 s to 3.6 s at 540p). Torch beams and shafts use stacked layers rather than blur. *Why:* software Chromium's blur filter was the bottleneck.
21. **Living room relayout:** Grandma's armchair now sits **in the bay window**, so the empty chair is silhouetted against the neighbours' lights (A3, A4, B2), and the coda puts Nell asleep in that chair with the window ablaze behind her (K1). *Why:* it makes the bookend one image instead of two.
22. **The photo (A5) is rendered live** from the same street set, as young Grandma and young Grandad in front of the blazing house, and composited with a faded-print filter. *Why:* the climax re-stages it exactly. Same house, same door, same pose.
23. **A1 and J1 use a small perspective 3D town** (painter's algorithm, projected prisms with pitched roofs, chimneys, gables and eave lights). The flat "stripes" version read as abstract bars. **J1** goes: crane up over the blazing roof, the town spreading out, a cloud dissolve, then an oblique Earth-at-night with city lights, and our dot is the brightest.
24. **The streetlamps stay on during the dead switch.** The neighbours can switch off their own houses but not the council's lamps, and the lamps give the faces in H5 a little light. The darkness still reads because every house is off.
25. **Production split:** I built sequences A, B, I, J, K and L myself. Two forked subagents built C/D/E and F/G/H in parallel on their own bundles, following STYLE_BIBLE.md, and a third forked subagent composed and mixed the score from the locked EDL.

## Phase 4: score (by the composer fork, reviewed)

26. **Motif:** A4 F#4 G4 A4 | D5 C#5 E5 | (D5) in D major, 3/4. Every statement before the blaze hangs on E5 over A. The **missing D5 lands at 136.503 s**, which is frame 3276, the first frame of I4. It was checked in the rendered stems.
27. **Total silence for H5.** Music cuts to digital silence at the dead click (122.75 s, H4 + 6 frames). Only wind remains until Grandad kneels.
28. **Grandad's fingers play the motif:** one piano note per bulb in I2 (131.20 + k × 0.43 s), and the picture is keyed to these times.
29. **Mastered to −14.0 LUFS integrated, −1.3 dBTP.**

## Phase 5: production calls

30. **The coda has no visible reply.** Both versions were rendered (`stills/lab/coda_noreply.png`, `stills/lab/coda_reply.png`). The reply ("You knocked on the doors. Happy Christmas, Nell.") is warm and gives her the credit, but it hands Claude the last line of the film. Without it, the last words are hers, the tablet just glows, and the camera pulls back to show who really did it: Nell asleep in Grandma's chair and Grandad beside her. Claude stays small.
31. **Tagline: "Some problems need a whole street."** See `writers_room/taglines.md` for the 12 candidates and the test against the film. "Keep thinking." was the one to beat. It's the better campaign line but the worse ending for *this* story.
32. **The poster is a 2:3 portrait crop of a 2× key-art render** (`lab:poster`): the blaze, Nell pointing at a single bright star, Grandad laughing, the crowd in silhouette, and the hand-lettered title in the sky.
