# Hell-Fart House — Lore & Design Bible

## Premise
The Hell-Fart House is a four-floor mansion in town, locally known by that name because of the Beanie Family — a huge family of 14 (grandparents, parents, siblings, cousins, aunts/uncles) who were Scoville-grading fanatics with a deep love for habanero peppers. One day, their pepper experiments went too far, and they all died simultaneously with a thunderous fart, as if it were the herald of death itself. Every Halloween, locals say faint farting noises can still be heard inside. The legend speaks of a fart-curse: the restless souls of the Beanie family floating and farting in every corner, hostile to any intruder.

## Protagonist
Lia — an ADHD, adventurous, copper-blonde girl with a ponytail. New to town, having arrived just the night before Halloween. On Halloween night, she went out alone in her **avocado costume**: a puffy ellipsoidal green outer shell with paler yellow-green inner flesh visible from a top-front cutout, single large rounded dark amber pit centered on the belly, pink socks. She spotted the Hell-Fart House up the hill and approached, drawn by its eerie atmosphere. A sign reading "Free Cloud Candies Inside" lured her in. The door slammed shut behind her. An oversized mouse approached and handed her a wax-sealed scroll.

## The Scroll (opening narrative)
"Dreaded visitor, who fell in the trap of the 'Cloud Candies', worry be not, as there is still a chance to violently lift the Beanie's fart-curse. Find the 8 Magic-Methane-Candles hiding amongst the 4 floors of the Mansion while avoiding being caught by the restless souls of the Beanie Family. Take this enchanted lantern. It is the only item that can lit the Magic-Methane-Candles. Also, the lantern can help you in stopping a Beanie member for a while, but beware, because they will be angered to fart-high rage. So, be wary and lift the fart-curse. Signed ~Anonymous Beanie"

## Win Condition
Light all 8 Magic-Methane-Candles distributed across the 4 floors (2 per floor). When all 8 are lit, the curse breaks, the door unlocks, and Lia escapes.

## The Mansion (4 floors)
- **Basement — Hell's Labyrinth**: basement stacks, furnace room, workshop, hidden Scoville experiments room
- **Ground — Limbo Hall** (entry floor): lobby, kitchen, living room, central staircase
- **1st — Purgatory Hall**: 2 kids dormitories, play room, library/reading room
- **2nd — Heaven Hall**: 3 adults dormitories, observatory, music room, terrace

## Enemies — The Beanie Family
| Type | Speed | Build | Comedic feature | Stun resistance |
|---|---|---|---|---|
| **Fart-Cloud Kid** (Beanie children) | Fastest | Small floaty cloud body, no legs, two big black-dot eyes | Propeller beanie cap (boys) OR big pink ribbon (girls) | Easiest to stun |
| **Farting Skeleton** (Beanie adults) | Medium | Cartoon-but-not-too-cartoon skeleton, full body | ONLY UPPER JAW (no lower jaw — gaping comedic skull) | Medium |
| **Zombie-Ghoul Grandparent** (Beanie grandparents) | Slowest | Hunched, oversized, decayed ghoul silhouette | Ridiculous vintage hat (top hat for grandpa, floral granny hat for grandma) | Hardest to stun |

All enemies: **red angry-eyes flash when player detected**, **escalating fart sounds as proximity decreases**, **brief stun when lantern shone on them → red-eye RAGE state → faster pursuit for ~5 sec → cooldown back to patrol**.

## The Lantern
- Enchanted, mysterious soft glow even when off
- ON/OFF toggle (F key on desktop, dedicated button on mobile)
- Lights Magic-Methane-Candles when shone on them within range
- Stuns enemies when shone on them, but triggers their RAGE state afterward

## Player Mechanics
- Walk by default
- Run with Shift (desktop) / sprint button (mobile)
- Crouch + interact to enter closets (hide spots distributed in the mansion — enemies lose sight when player is inside)
- First-person view with visible avocado-costume hands in the lower screen, right hand holding the lantern

## Visual Identity — LOCKED
Tone: **Semi-realistic, worn-off, rusted, old, dusty, abandoned, dim-lit.** NOT cartoony. NOT goofy. Reference: Poppy Playtime hallways + Bendy and the Ink Machine vintage decay.

Palette:
- Walls / backgrounds: deep cold purple-black #1a0d2e, peeling sepia browns #5a3e2a, dusty wallpaper greens #3d5c3a
- Floor / wood: aged warm browns #4a2e1a, dust-grey highlights #6b6258
- Light sources: candlelight amber #ff8847, sickly-green non-candle glow #7fc972
- Enemy accents: blood-red rage-eye #cc0033, fart-cloud sickly yellow-green #9bb540
- Lia avocado palette: rind green #2d7a2d, flesh yellow-green #e2d067, pit dark amber #8a4d20, pink socks #ff6b9d

Lighting model: Ambient at 8–10% intensity. Most illumination from placed point lights at candles + the lantern. THREE.FogExp2 for distance dread. NO flat lighting anywhere.

Materials: MeshStandardMaterial only. Roughness 0.7–0.9, metalness 0.0–0.1. Apply slight per-face color variation to break up flat walls.

## Workflow Principles
- Scoped, single-mechanic prompts only
- Every prompt ends with `npm run deploy`
- Read LORE.md before starting any future prompt

## Lighting Reference Standard — LOCKED (Prompt #3.3)

These are the canonical lighting baseline values. Every future floor (Purgatory, Heaven, Hell's Labyrinth) MUST start from these and only deviate intentionally:

### Ambient
- `THREE.AmbientLight` color `#1a0d2e`, intensity **0.25**

### Hemisphere
- `THREE.HemisphereLight` sky `#2a1a3a`, ground `#1a0d0a`, intensity **0.28**

### Fog
- `THREE.FogExp2` color `#1a0d2e`, density **0.025**

### Per-room warm fill (orientation light)
- Place ONE `THREE.PointLight` near room center, color `#ff8847`
- Intensity **1.0**, distance **12**
- Height: ~3 units (suggests overhead chandelier)

### Dramatic accent lights (e.g., moonlight, fire, lantern pool)
- `THREE.SpotLight`: intensity **4.5**, distance **30**, decay **1**, color tinted to context
- **ALWAYS set explicit target**: `light.target.position.set(...)` and `scene.add(light.target)`
- Angle 0.55, penumbra 0.45
- Pair with a flat "light pool decal" mesh on the floor below for visible impact

### Notes
- Per-instance hue jitter (±0.05) on walls reduces flat-color look
- Wainscoting seam at y=2.5 in #3d2817 adds vintage texture
- Per-floor variations should only adjust ambient color tint, not intensity (basement: cooler, Heaven Hall: cooler-bluer moonlight, Purgatory: similar to Limbo)
- Lantern (Prompt #4) will add a moving point light following the player — its values TBD
