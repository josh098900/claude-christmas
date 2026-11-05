# DIRECTOR'S NOTES: *Seen From Space*

## What I made

A 2:48 wordless Christmas film. It's about a nine-year-old called Nell who turns her grandad's house back on in the first Christmas after her grandma died. It's drawn to look like coloured pencil on toned paper and lit the way *Klaus* is lit. The score is built around one melody that is missing its last note until the house lights up.

The film rests on one idea: **a missing note and a dead bulb are the same thing.** Every time the motif plays, its resolving note is left out, the way one dead bulb leaves a whole string dark. When Grandad walks his fingers along the string, each bulb is a note. He stops on the one that's missing. Nell twists it, and the note lands on the frame the house blazes.

## The story choices

- **Misdirect.** "How many lights do you need to be seen from space" plays as a child who wants Santa's sleigh to spot her house. The wall of plans shows a roof, a chimney and an X, and the door says KEEP OUT. ESPECIALLY SANTA. We're meant to think she's building a trap.
- **The turn is the brand.** The only readable reply in the film is *"Good rule. This bit needs more people. Who lives on his street?"* Claude doesn't solve the problem. It helps her think it through, respects the rule she set herself (no ladders), and when the job needs hands it sends her to people. Everything after that is done by humans: neighbours on ladders, a shopkeeper's bulbs, a baby's grip, a grumpy man's ladder. Grandad finishes it himself.
- **The photo rhymes with the climax.** Young Grandma points at the sky while young Grandad crouches by the same front door with a bulb between his fingers. At the climax Grandad kneels at that door with a bulb, and Nell, without knowing, points at the sky exactly as Grandma did. That's what breaks him open into his first laugh, and the camera rises along her arm to space.
- **The bookend.** The film opens on an empty armchair with Grandma's cardigan over its arm. It closes on that same chair, with Nell asleep in it under the cardigan and the window behind her ablaze.

## Homages (tropes and compositions only)

| Film | What we borrowed |
|---|---|
| *The Snowman* | coloured-pencil texture, no words, the glide over rooftops, the rise |
| *Home Alone* | the night-time battle-plan montage, with red string, tally, diagrams and the "trap" misdirect |
| *It's a Wonderful Life* | the whole community turning up for one man, and the little bell |
| *Love Actually* | handwritten cue cards on a doorstep |
| *Christmas Vacation* | the lights that won't come on |
| *A Christmas Carol* | the grumpy neighbour who thaws (the door slams, then the ladder comes out first) |
| *Elf* | paper snowflakes over her window, and her slightly excessive enthusiasm |
| *Klaus* | warm light as the emotional engine, with rim light on flat characters |

## How it's built

Everything is code: a TypeScript 2D engine with characters as layered Bézier shapes on simple rigs, sets drawn procedurally, and a WebGL post stack for pencil grain, paper tooth, line boil, bloom and grade. Headless Chromium renders it frame by frame. The score is MIDI rendered through FluidSynth with the MIT-licensed FluidR3 soundfont, and all foley is synthesised in numpy. No image or video models were used anywhere. The handmade feel comes from texture and imperfection that were designed in, not generated.

## With more time I would

- Hand-key more secondary animation: coat swing, plait follow-through on every move, breath in the cold.
- Give the crowd shots more individual acting. Some neighbours are posed rather than performed.
- Replace the General MIDI strings with a real string section. FluidR3's strings are serviceable but not lush.
- Do a proper colour script pass across all 53 shots so the warmth creeps in more gradually through the montage.
- Add perspective street shots (looking down the terrace) for H1 and I5, where the fuse would burn toward camera.
