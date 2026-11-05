# CREDITS: Seen From Space

*A fan-made film. Not affiliated with or endorsed by Anthropic. "Claude" appears only as a word on the end card.*

## Made by
Written, directed, designed, animated, composed and edited by an AI working autonomously overnight (Claude, in Claude Code), from a brief by the project owner.

## Everything original
| Asset | Source | Licence |
|---|---|---|
| Story, script, shot list | Original (`writers_room/`) | This project |
| All artwork: characters, sets, props, lettering, lighting | Drawn procedurally in code (`engine/src/`). No image generators, no stock art, no traced references | This project |
| Hand lettering (Grandma's hand, Nell's hand) | Original single-stroke alphabet drawn in code (`engine/src/draw/letters.ts`) | This project |
| Pencil and paper textures | Procedural noise generated at runtime (`engine/src/post/post.ts`) | This project |
| Score and motif | Original composition (`audio/score.py`). See `audio/AUDIO_CREDITS.md` | This project |
| Foley | Synthesised from noise and filters (`audio/foley.py`) | This project |

## Third-party tools and assets
| Item | Use | Licence |
|---|---|---|
| **FluidR3_GM.sf2** by Frank Wen (Debian `fluid-soundfont-gm`) | Instrument samples for the score: celesta, piano, glockenspiel, strings, choir aahs, harp, timpani, contrabass | MIT |
| **Inter** typeface by Rasmus Andersson (system font) | Text in the invented tablet UI and on the end card | SIL Open Font License 1.1 |
| FluidSynth | Renders the MIDI score to audio (tool only) | LGPL-2.1 |
| Chromium and Playwright | Headless renderer (tool only) | BSD and Apache-2.0 |
| ffmpeg / x264 | Encoding (tool only) | GPL |
| esbuild, TypeScript, ws | Build and harness (tools only) | MIT and Apache-2.0 |
| numpy, scipy, mido, pyloudnorm, Pillow | Audio, mixing, metering, contact sheets (tools only) | BSD, MIT and HPND |

## Homages (tropes and compositions only; nothing reproduced)
*The Snowman* (pencil texture, wordlessness, the rooftop glide and the rise) · *Home Alone* (the night-time battle-plan montage and the "trap" misdirect) · *It's a Wonderful Life* (a community turning up for one person, and the little bell) · *Love Actually* (handwritten cue cards on a doorstep) · *National Lampoon's Christmas Vacation* (lights that won't come on) · *A Christmas Carol* (the grumpy neighbour who thaws) · *Elf* (paper snowflakes and excessive enthusiasm) · *Klaus* (warm light as the emotional engine).

No characters, logos, music, dialogue or specific shots from any of these films appear in this one.
