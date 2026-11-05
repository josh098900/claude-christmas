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

## Phase 6, pass 1 (a blind critic who had not seen the script)

The critic scored misdirect 3, brand 3, blaze 4 and Grandad's arc 5, with several more at 6. Fixes:
33. **Brand safety, child plus AI:** consumer Claude is for adults, and a 9-year-old alone at night with a chat app would stop a brand team. **Mum now sits with Nell for the Turn** (E), and she checks in during the time-lapse. That also explains why Mum, the co-conspirator, takes Grandad out on Christmas Eve. Mum was redesigned with long hair and a teal scarf, because the critic read her as "a man" in D7.
34. **The readable reply is now "Good rule. This bit needs more people. Who lives on the street?"** "His street" gave the reveal away three seconds early, and Claude couldn't have known whose street it was from the questions shown.
35. **The misdirect is sold harder:** the wall now has a sleigh with reindeer, an arrow down the chimney and a trap sketch. The shed boxes still say LIGHTS. The misdirect is now about *what she's using them for* (catching or signalling Santa from her own roof), not about whether they're lights.
36. **Grandad finishes it:** the loose bulb visibly hangs out of its socket, and when his finger wiggles it **the whole string blinks on for two frames.** That pays off "why does 1 bulb make them ALL go off". His big hand then closes over her mitten and they twist it together, so he still lets her be the one. **I4 now cuts to a close-up of his face lit by the blaze** (2.25 s in), which is the arc's missing beat.
37. **The blaze is less white:** lower bloom, a higher threshold and a shorter flash. In I5 the neighbours come back at 72%, so no. 40 stays the brightest, and the shot opens closer on his house.
38. **The bell gets a picture:** a 0.7 s insert of the thawed bell tinkling, on the bell sound at I6 + 1.0. I6's reaction beats were retimed around it.
39. **A2 is tighter**, so the one dark house can't be missed. In **B2** Grandad no longer gestures (it read as "waving her away"). In **B3** her decision reads as resolve and a small smile rather than anger at Grandad.
40. **J1:** the cloud pass is darker and shorter (the lilac haze read as a render fault), and the town rows now curve and skew instead of forming a grid.
41. **Tagline changed to "Think it through. Then knock on doors."** The critic pointed out that "Some problems need a whole street" repeats the tablet's "the whole street came" three seconds earlier. The new line names both halves of the film and exactly what Claude did: helped her think it through, then sent her to people.

## Phase 6, pass 2 (a second blind critic)

Scores: reads 7, misdirect 4, switch/blaze 6, Grandad 6, Claude 8, handmade 6, animation 5, blaze 3, sync 9, pacing 6, homages 8, brand 4. Fixes:
42. **The blaze is saturated, not bloomed.** Bulbs are 20% bigger with tighter, dimmer halos and almost no white core. Grandad's windows stay dark inside their frames of lights, so the panes read, and the colour comes from a coloured wash and pools on the snow. Bloom is down to 0.7. Both critics had called it a "pink-white bloom".
43. **Grandad does the twist.** His bare hand closes on the loose bulb and turns it, and her mitten rests on top of his. He re-engages and finishes the job himself, and she's there with him. This departs slightly from the brief's "lets her be the one to twist it": two blind critics in a row read the earlier version as *her* fix, and the rubric line ("he finishes the job himself") takes precedence.
44. **The dead switch gives hope, then nothing:** the string flickers weakly on the click and dies, and in the H5 wide the crowd's torches swing up to the dead roof, then drop (forks).
45. **The coda line is "it worked. everyone helped."** It credits the people, not the tablet, and it frees the end card.
46. **The tagline goes back to "Some problems need a whole street."**, set larger and appearing faster. Critic 2 noted that "knock on doors", after a child door-knocking, carries a stranger-danger and canvasser tone, and preferred this line as "warm, true to the film, modest about Claude". With the coda line changed there's no longer an echo.
47. **Child safety, continued:** Mum is now at the gate when Nell sets off door-knocking (at blue hour, not night), and she's clearly on Nell's side of the tablet in E1.
48. **Misdirect:** the wall is now one consistent idea, a Santa landing runway. In B3 the idea arrives with a glance up toward the chimney, not at Grandad.
49. **Grandma in the photo** has adult proportions. She had read as "child-sized".
50. **I5:** each house now pops on with a bloom burst on its glockenspiel note. **J1** spends less time on the top-down town grid, and the Earth drifts and rotates slowly instead of holding still. **A1** gains firs and bare winter trees in the back gardens, so it's less grid-like.

## Phase 6, pass 3 (a third blind critic) and final fixes

Scores: reads 7, misdirect 3, switch/blaze 5, Grandad 6, Claude 7, handmade 6, animation 5, blaze 5, sync 8, pacing 6, homages 7, brand 4. The critic reviewed the build before the zoom-scaled blaze fix (51).
51. **Blaze close-ups:** the coloured washes now scale with camera zoom. They had stacked into a pink-white haze in I4's close-up and I6. Window panes stay dark and the bulbs stay saturated. From above (J1) the house now carries ten rows of lights, so it's unmistakably *the* house.
52. **Dead bulbs are darker glass** (all five off-colours darkened), so a dead string never reads as lit. In H, the torches no longer whiten the dead roof net, No. 40 is the darkest thing in the frame, and Grandad's face is in the wide (fork).
53. **Brand safety, third time:** Mum is now visibly with Nell for *every* tablet question (D3, D5, D8 and E). The montage's comic worry belongs to Dad alone in D7. Across the film, every exchange with the assistant happens with a parent present.
54. **Grandad's hand does the twist alone.** Nell's mitten holds a small torch steady on the bulb. That's her contribution (light, not hands), so "he finishes the job himself" reads cleanly. This departs from the brief's "lets her be the one to twist it": three blind critics in a row read any shared twist as *hers*, and the rubric's arc line wins.
55. **The street went dark on purpose:** in H1 a neighbour's lights visibly click off as Grandad passes (fork), so it reads as courtesy, not a power cut.
56. **Readability fixes from the critic's confusions:**
    - The ladder man now has dark hair and a dark moustache and brown sleeves. He'd read as Grandad, and his maroon sleeves at ladder height had read as Nell up a ladder.
    - Grandad's skin is less grey in A3, where he'd read as "a ghost".
    - The wedding-era photo is framed tighter, so young Grandma and Grandad read as adults.
    - In B3 a blinking light crosses the sky behind Nell as the idea lands, so her plan reads as sky- and Santa-driven, which strengthens the misdirect.
57. **Not taken:** a "small Claude mark in the title bar" (the brief forbids any logo or real UI; "Claude" appears only as plain type on the end card), and "Some lights need a whole street" (lovely, but it drops the line's quiet point about what a thinking partner can't do, and that point is the brand).
