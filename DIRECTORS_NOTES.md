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

## What changed in the polish passes (three blind critics)

Each pass, a fresh subagent who had never seen the script got only frames sampled every 0.5 s and a listener's cue sheet. They retold the story and scored it against the brief's rubric. Their biggest notes changed the film:

- **"A nine-year-old alone at night with an AI app."** Consumer Claude is for adults, so a brand team would stop here. Mum now sits with Nell for every question and for the Turn. Dad gets the comic worry alone, and Mum walks Nell to the gate before she knocks on doors. That made Mum the co-conspirator who takes Grandad out on Christmas Eve, which is better story anyway.
- **"Who lives on *his* street?"** That gave the reveal away. The line is now "Who lives on the street?"
- **"Her hand does the fix."** Grandad now finds the bulb. His finger walks the string one note per bulb, and when he wiggles the loose one the whole string blinks on for two frames, paying off "why does 1 bulb make them ALL go off". Then he twists it home himself while Nell holds the torch. This departs from the brief's "lets her twist it", and I made the call because three critics in a row read any shared twist as hers. A close-up of his face in the blaze gives the arc its missing beat.
- **"The blaze is a pink-white haze."** The bulbs are now saturated points. The panes stay dark inside their frames of light, the colour spills onto snow and walls, and the coloured washes scale down in close-ups.
- **"The dead switch looks half-working."** On the click the string gives one weak flicker and then dies. The dead glass is darker, and the torches stop short of the roof.
- **Tagline.** It went from "Some problems need a whole street." to "Think it through. Then knock on doors." (critic 1 caught an echo), then back again. Critic 2 noted that "knock on doors", after a child door-knocking, has a stranger-danger and canvasser ring. The coda now reads "it worked. everyone helped." so there's no echo.

### Where it honestly still falls short

- **The misdirect never fully fooled anyone.** The brief's Act 1 has her look at the photo and Grandad, then fetch Grandma's labelled lights, so every critic guessed the plan early. The Santa material plays as a red herring, not a true twist. The scene that actually reframes the film is the cue cards: "GRANDMA ALWAYS SAID / IT SHOULD BE SEEN FROM SPACE". A real fix would restructure Act 1 so we don't know whose lights they are.
- **Character animation is clean but stiff.** Poses are mostly frontal, the crowds are small, and secondary motion is limited. A hand-keyed pass would lift the whole film.

## With more time I would

- Hand-key more secondary animation: coat swing, plait follow-through on every move, breath in the cold.
- Give the crowd shots more individual acting. Some neighbours are posed rather than performed.
- Replace the General MIDI strings with a real string section. FluidR3's strings are serviceable but not lush.
- Do a proper colour script pass across all 53 shots so the warmth creeps in more gradually through the montage.
- Add perspective street shots (looking down the terrace) for H1 and I5, where the fuse would burn toward camera.
