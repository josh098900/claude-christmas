# Seen From Space

*A fan-made animated Christmas film for Claude, made in the tradition of the great UK Christmas adverts.*

> Every Christmas, Grandad and Grandma covered their house in so many lights that, as Grandma always said, you could see it from space. This year, the first without her, Grandad's house is the only dark one on the street. His granddaughter decides to fix that.

**Fan-made. Not affiliated with or endorsed by Anthropic.**

## Watch

| File | What |
|---|---|
| `final/seen_from_space.mp4` | **The film.** 1920×1080, 24 fps, 2:48, H.264 High with AAC 320k |
| `final/seen_from_space_30s.mp4` | 30-second cut-down |
| `final/seen_from_space_10s.mp4` | 10-second teaser |
| `final/poster.png` | 2:3 poster, plus `final/keyart_16x9.png` |
| `final/storyboard_contact_sheet.png` | One frame per shot, all 53 shots |
| `final/score.wav` | Original score and sound design (48 kHz stereo, −14 LUFS) |

## How it was made

Everything in the film is generated from code in this repository, and nothing comes from an image or video model:

- `engine/` is a small 2D animation engine written in TypeScript. Characters are layered Bézier shapes on simple rigs, animated on twos. Sets are painted procedurally. A WebGL post stack adds coloured-pencil grain, paper tooth, line boil, rim light, bloom, light shafts and the grade.
- `render/` drives headless Chromium through Playwright. It steps the deterministic timeline one frame at a time and streams frames to ffmpeg.
- `audio/` holds the score and the foley, written as code. The instruments come from the MIT-licensed FluidR3 General MIDI soundfont, played through FluidSynth, plus sounds synthesised with numpy/scipy. Mixing and mastering are done in Python.

See `HANDOFF.md` to rebuild the film, `STYLE_BIBLE.md` for the look, `writers_room/` for the script and shot list, `DECISIONS.md` for every call that was made, and `DIRECTORS_NOTES.md` for the why.

## Quick start

```bash
npm install
python3 -m pip install numpy scipy mido pyloudnorm   # plus: apt-get install fluidsynth fluid-soundfont-gm
npm run build                                         # bundle the engine
node render/render.mjs --preview                      # 960x540 preview of the whole film
python3 audio/score.py && python3 audio/mix.py        # score + foley + master
node render/master.mjs                                # final 1080p master with audio
```
