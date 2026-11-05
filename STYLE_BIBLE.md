# STYLE BIBLE: Seen From Space

> Coloured pencil on toned paper, lit like a Klaus frame. Wordless and warm, and never glossy.

Reference stills: `stills/` (style frames) and `stills/lab/` (turnarounds and lineup). Every look rule below is implemented in code. The file that enforces each rule is named next to it.

## 1. Texture: handmade, never vector (`engine/src/post/post.ts`, `draw/brush.ts`)

- **No outlines.** Shapes are defined only by colour and value, the way Briggs worked. The only drawn lines are *objects that are lines*: wires, glasses frames, string, lettering and the plaits' braid marks.
- **Pencil grain** is applied to every pixel in post. It has a dominant right-hand diagonal hatch at about 58°, a cross-hatch that appears only in the darks, isotropic paper tooth, and paper speckle where the pigment misses the tooth. Grain is strongest in the mid-tones.
- **Line boil.** A low-frequency wobble of about 1.4 px and a high-frequency "tooth" edge breakup of about 1.1 px are both re-seeded every 2 frames. Holds still breathe.
- **Imperfect geometry.** `handRect` and `handPoly` add wobble to straight edges. `blobEllipse` makes no perfect circles. Snow caps are irregular, and no two houses' brick hints match.
- **Paper mottling:** a large-scale ±3% luminance variation, so flat fills never look digital.

## 2. Movement (`core/anim.ts`)

- **Drawings run on twos (12 fps).** `f.t` is quantised and all poses, props and boil use it. **Camera moves run on ones** (`f.tc`) so pans stay smooth.
- Use anticipation and settle (`antic`, `settle`) on every big action, and follow-through on plaits, ponytail and scarf.
- Hold emotional beats for at least 1.5 s, with only blinks and boil moving.

## 3. Lighting: Klaus rules (`draw/shade.ts`, `draw/light.ts`)

Every character is lit by the world through a `CharLight`:

| Parameter | Meaning |
|---|---|
| `key` | direction *toward* the motivating light (tablet, window, streetlamp, blaze) |
| `shadow` | core shadow made by offsetting the silhouette away from the key, multiplied in a cool colour |
| `rim` | coloured rim on the far edge, made by offsetting toward the rim light and blurring, then added |
| `spots` | local light pools (tablet glow on Nell's face, torches, bulbs) added and masked to the shape |
| `ambient` | the scene's colour multiplied into every design colour |

- Characters are shaded in four groups (back limbs, body, head and front arm), so overlapping parts separate.
- **Every shot has one clear motivating key light.** Bulbs, windows, torches, the tablet and streetlamps all live in the additive **glow layer**, which feeds a three-radius bloom.
- Light shafts and torch beams are drawn as gradients in the glow layer and pick up pencil texture in post, so they look drawn rather than rendered.
- The tone map is a hue-preserving shoulder, so a thousand coloured bulbs stay *coloured* and never clip to white.

## 4. Palette

### Night (first half): cold blue, grey snow

| Role | Hex |
|---|---|
| Sky zenith (night) | `#070d24` |
| Sky horizon (night) | `#33497a` |
| Dusk band | `#b48a96` → `#d9a98e` |
| Snow in shadow | `#6b7cb0` |
| Snow on roofs, lit | `#a9b8de` |
| Snow caps | `#a3b2da` |
| Brick at night | design brick pulled 60% toward `rgb(r·.35+18, g·.42+26, b·.6+62)` |
| Dark window glass | `#121b38` |
| Nell's room wall | `#1b2550` → `#27346a` |

### Warmth (enters with the tablet, grows with the plan)

| Role | Hex |
|---|---|
| Tablet glow | `#ffdcae` / spot `#ffc98e` |
| Lit window interior | `#ffd99a` → `#f0a85a` → `#b8663a` |
| Streetlamp | `#ffd28a` |

### The bulbs (old-fashioned C9 teardrops)

| | On | Off (dead glass) |
|---|---|---|
| Red | `#ff3b2e` | `#5a2a33` |
| Green | `#2fd665` | `#25443a` |
| Amber | `#ffae2b` | `#5a4630` |
| Blue | `#3f7dff` | `#26304f` |
| White | `#fff1cf` | `#5d6070` |

**The blaze is the most saturated frame in the film:** saturation 1.18, bloom 1.25, plus a coloured wash (red, green, blue and amber pools) on walls and snow.

### Characters

| Character | Key colours |
|---|---|
| Nell | coat `#c23f36`, hat and mittens `#e3a53a` with a cream bobble, wellies `#2f6b4a`, plaits `#6e4126`, tights `#2b3456`, skin `#f2c6a2` |
| Grandad (in) | cardigan `#8c6f50`, shirt `#a6bcd2`, slippers `#6b3f34`, white bushy brows `#f3efe6`, glasses `#3a3036` |
| Grandad (out) | coat `#2e384b`, scarf `#8e3340`, flat cap `#6d5c49` |
| Grandma | cardigan **dusty rose `#c97c86`**. The same cardigan lies on the empty armchair and covers Nell in the coda. |
| Mum | camel coat `#b27d4c`, teal scarf. Dad: green jumper, beard, glasses |
| Neighbours | ladder man (olive body-warmer, maroon sleeves, grey moustache, belly), old lady (lilac coat, white curls), shopkeeper (teal hijab, mustard cardigan), teen 1 (green hoodie, hood up), teen 2 (purple puffer, braids), young dad (navy puffer, mustard beanie, beard) |

## 5. Characters (`chars/rig.ts`, `chars/cast.ts`)

- Simple, round, readable shapes. **Dot eyes** carry a single catch-light.
- **The eyebrows do the acting:** `browUp` (surprise), `browIn` (+ worried or sad, − determined or cross), plus per-brow offsets. Grandad's brows are bushy white clouds, made of 4 blobs each.
- Turn is faked by sliding the features across a round head (`turn` 0 = front, 1 = profile-ish). `back: true` draws the back of the head for crowd silhouettes.
- Proportions: Nell is about 306 units tall and Grandad about 444. In the street set, characters use `STREET_S = 0.43`, because a door is 210 units, roughly 2 m.
- Silhouette test: every cast member must be identifiable as a black shape at 64 px tall. They are told apart by hat shape, plaits, stoop, belly and hood.
- See `stills/lab/lineup.png`, `stills/lab/nell_turn.png` and `stills/lab/grandad_turn.png`.

## 6. Lettering (`draw/letters.ts`)

- An original single-stroke alphabet: capitals, lowercase, digits and punctuation.
- **Grandma's hand:** slanted, neat marker capitals (`slant 0.18, wobble 0.6, weight 0.9`).
- **Nell's hand:** chunky upright felt-tip (`slant 0.02, wobble 1.4, weight 1.4, baseline 1.6`). Used on cue cards, the door sign, the diagrams and the tally.
- The tablet is the only place with set type (Inter, OFL), because it is a screen.

## 7. The tablet (`draw/tablet.ts`)

- An **invented** UI: a warm off-white screen `#f6f0e4`, a sand user bubble `#e6dac6`, a muted sage send button and a quiet header with three dots.
- There is no logo, no spark, no app name and nothing copied from any real chat app.
- Replies are blurred (6–8 px) everywhere except **E2** (the Turn) and the coda.

## 8. Framing

- 16:9 at 1920×1080. One idea per shot.
- Use close-ups for eyebrows, inserts for hands and handwriting, and wides for the street's reaction.
- Emotional shots (H5, I4, I6, K1) get long holds.
- Vignette is 0.35–0.6, with stronger values in interiors.

## Never

Glossy, plastic, uncanny, lens-flare-y, perfectly symmetrical or vector-clean.
