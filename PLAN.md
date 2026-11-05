# PLAN: Seen From Space

One night, one complete film. The guiding rule is that **there is always a complete, watchable film in the repo** from the end of Phase 3 onwards.

## Pipeline

```
writers_room/shot_list.md ──► engine/src/film.ts (edit decision list, frame-exact)
                                   │
         engine/src/** (sets, characters, lighting, post) ──esbuild──► build/engine.js
                                   │
         render/render.mjs ── headless Chromium ×N ── WebSocket ── ffmpeg ──► build/shots/*.mp4
                                   │                                           │
         audio/*.py (score from cue sheet + foley) ──► audio/out/mix.wav ───────┤
                                                                               ▼
                                                         final/seen_from_space.mp4
```

- **Deterministic:** you pass a frame number in and get an image out. Drawings and boil are quantised to 12 fps (animated on twos), and camera moves run at 24 fps.
- **Per-shot segments:** every shot renders to its own clip, so a fix only re-renders that shot. A concat step joins the clips and muxes in the audio.
- **Previews** render at 960×540 with a fast encode. **Masters** render at 1920×1080 using H.264 High, yuv420p, AAC 320k and the slow preset, with a two-pass encode to stay under 95 MB.

## Phases and timebox

| Phase | What | Exit criteria |
|---|---|---|
| 0 Setup | Repo, docs skeleton, tooling benchmark | Render path proven (done: about 0.3 s per 1080p frame) |
| 1 Writers' room | Two alternative pitches scored against the lead, then script, beat sheet and shot list | `writers_room/` complete, timings sum to 2:45 |
| 2 Style frames | Engine core, post stack, characters, four style frames, STYLE_BIBLE.md | Four PNGs I'd be proud of, after critique iterations |
| 3 Animatic | Every shot staged at full length, temporary motif | `final/seen_from_space.mp4` committed |
| 4 Score | Motif, full score locked to the animatic, foley, stems and mix at -14 LUFS | `final/score.wav` plus stems |
| 5 Production | Sequence by sequence, final animation and lighting, re-cutting the whole film after each | Every shot final |
| 6 Polish ×3 | Fresh-eyes subagent critiques (retelling plus rubric), fix the top five each pass | Every rubric line at 8 or above |
| 7 Deliverables | Poster, contact sheet, 30 s and 10 s cut-downs, notes, credits, handoff | Everything committed and pushed |

## Parallelism

- The score is composed by a forked subagent once the cue timings are locked, while I build the visuals.
- Independent critiques come from fresh subagents that have never seen the work.
- Rendering runs up to three Chromium workers in parallel. There are four cores, and ffmpeg needs one.

## Risks and mitigations

- **The procedural look reads as a "filter" or as slop.** Design the drawing itself well, with hand-made imperfection in the shapes, hand-built lettering, real pencil-hatch direction fields and a restrained palette, and judge it on stills before any animation.
- **Character animation is expensive.** Stage for clarity: silhouettes, wide shots, and long holds where the eyebrows act. Keep complex body mechanics to a minimum (walks, a kneel and a hug).
- **Render time.** Shots are cached and previews render at half resolution, and the 1080p master render runs in the background.
- **Running out of time.** Commit a complete film after every sequence. Write HANDOFF.md early and keep it current.
