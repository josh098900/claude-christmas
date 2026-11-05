# Audio credits: Seen From Space

All music and sound in the film is original and generated from code in this folder.

| Asset | Source | Licence |
|---|---|---|
| Score (motif, all cues, arrangement) | Original composition, written as code in `audio/score.py` | Part of this project |
| Instrument samples: celesta (GM 8), glockenspiel (9), acoustic grand piano (0), string ensembles (48, 49), tremolo strings (44), pizzicato strings (45), harp (46), timpani (47), contrabass (43), choir aahs (52) | **FluidR3_GM.sf2** by Frank Wen, from the Debian/Ubuntu package `fluid-soundfont-gm` (`/usr/share/sounds/sf2/FluidR3_GM.sf2`) | **MIT licence** (Copyright (c) Frank Wen; see `/usr/share/doc/fluid-soundfont-gm/copyright`) |
| Synthesiser | FluidSynth 2.3.4, used as a tool only. Its built-in reverb and chorus are disabled | LGPL-2.1 (tool, not distributed) |
| Foley: clock, snow crunches, sledge, creaks, scrape, keys, door, taps, bulb plinks, thumps, knocks, shop bell, ladder clank, church bells, switch click, knee creak, bulb twist, porch bell, wind, whoosh | Synthesised from noise, impulses and resonant filters in `audio/foley.py` (numpy/scipy) | Part of this project; no recordings or samples used |
| Reverbs | Synthetic impulse responses generated in `audio/mix.py` | Part of this project |
| Loudness metering | pyloudnorm (MIT), used as a tool | MIT (tool) |

No existing songs, melodies, carols or recordings are used. The motif (A4 F#4 G4 A4 | D5 C#5 E5 | D5) and the caper, march and build material were written for this film.
