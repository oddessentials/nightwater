# Nightwater — Tube Ride Plan: Carve & Catch the Lights

Research and implementation brief for Carve & Catch the Lights. The initial investigation was read-only; the decisions below include the subsequent code review and the approved always-on gameplay direction.

## TL;DR

**Carve & Catch the Lights:** lean to ride up the tube wall; catch glowing lights placed in the existing lit arch cells; the highest tier caught (×2 / ×5 / ×10) arms the next answer's points. The core is always on from the feeder ride. Remove Gentle camera and its rendering branches; use one smooth, bounded camera behavior for everyone. Implement the core on one local branch without pushing or creating a PR.

## What the Sept 2026 trends say

- **Risk-reward multipliers are the dominant scoring language.** Balatro's `chips × mult` (Apple Design Award 2025) made "×MULT" culturally legible; its lesson is _show why the score happened_ — sequential callouts, rising-pitch notes per element (C-D-E-F-G), color-as-label ([Balatro feedback breakdown](https://blakecrosley.com/guides/design/balatro), [GamesHub](https://www.gameshub.com/news/features/balatro-roguelike-deckbuilder-2637397/)).
- **Ed-quiz platforms already use exactly this shape.** Quizizz's "2x" and "Double Jeopardy" (×2 or ×0.5), "Streak Saver"; Gimkit's buy-a-multiplier economy; the consensus is that power-ups affect _score, not accuracy_ ([Quizizz power-ups](https://forwork-support.quizizz.com/hc/en-us/articles/360046670172-Power-Ups-Their-Types), [Blooket vs Gimkit vs Kahoot 2026](https://triviamaker.com/blooket-vs-gimkit-vs-kahoot/), [Teachfloor](https://www.teachfloor.com/blog/blooket-vs-gimkit-vs-kahoot--vs-quizizz)).
- **Runners in 2026:** coins/gems → score multipliers, magnets, lane-based near-miss risk; the loop is "understand in 10 s, session 2–5 min" ([Turbogeek](https://turbogeek.org/why-endless-runner-games-are-still-addictive-in-2026/), [hybrid-casual 2026](https://gamegrowthadvisor.com/blog/2026-04-16-hybrid-casual-game-design-strategy-2026/)). Water-slide games specifically use **drag-to-lean** as the single verb ([Aqua Thrills](https://poki.com/en/g/aqua-thrills), [Aquapark.io](https://www.crazygames.com/game/aquapark-io-yky)).
- **Rhythm-synced obstacles are back**, including three.js runners synced to the track ([rhythm games 2026](https://hardiktrehan.com/hthub/games/guides/top-music-rhythm-games-online/)). The album exists but the manifest has no BPM — a later phase.
- **Feedback direction:** use short chimes, small sparkles, and a separate catch toast so answer feedback remains readable. The approved design uses one camera behavior with bounded bank and smooth entry/exit transitions. The earlier proposal for a Gentle camera toggle is superseded.
- **three.js:** the project is on r186 (current); nothing to upgrade. `InstancedMesh` is the right tool; `BatchedMesh` only matters for mixed geometries ([r186 release](https://github.com/mrdoob/three.js/releases/tag/r186)).

## What the code actually allows (measured, read-only)

The live app was probed through the `?qa=1` hook (seed 2310, 1440×900):

| Where                                       | Draw calls | Triangles |
| ------------------------------------------- | ---------- | --------- |
| Tube, u = 0.05–0.70                         | **20**     | 87k       |
| Tube, last 65 m (destination basin visible) | 298–346    | 313–498k  |
| Basin, landed                               | 237        | 476k      |

Mid-tube has enormous headroom: an `InstancedMesh` of ~20 lights is +1 draw call, +~2k triangles. Second ride profile: 185 m, ~8 s, mean **22.8 m/s** (7 → 37). Arches sit every 5.6 m (`shaders.ts:203`), so a light in every 2nd–3rd arch cell gives 1.4–2 catches/s — a good rhythm without clutter.

Three facts that shape the design:

1. **The answer is scored when you _enter_ the exit, not when you land** (`route` event, `main.ts:292` → `journey.answer`). So the multiplier caught in tube N applies to the question shown in basin N+1 and is consumed at the start of tube N+1. That gives a natural "stakes" beat: the panel can say _"×5 riding on this answer"_ before you commit.
2. **In-tube input is already plumbed but unused.** `Controls.strafe` (A/D + the touch pad's `touchX`) flows through `input.consume()` every step; `simulationStep` just ignores it in the tube (`main.ts:359`). The touch pad is merely hidden outside the basin (`main.ts:338`).
3. **The baseline had no points or saved multiplier.** Add both `score` and the pending question's `multiplier` to `JourneyState`, with defaults for old saves. Keep these separate from the ride's catch state.

## Concept options

| Idea                                                                                                              | Excitement             | Risk to existing UX                        | Cost                         |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------ | ---------------------------- |
| **A. Carve & Catch the Lights** (the multiplier idea + lean control)                                              | High — agency + stakes | Added movement and attention, accepted     | Medium                       |
| B. Thread the Arches — the ring gap is at a random angle; lean through it for a "perfect"; streak raises the tier | High, rhythm-game feel | Low                                        | Medium (reuses A's lean)     |
| C. Boost jets on the walls — speed burst + spray + chroma                                                         | Medium (feel only)     | Medium — durations are test-bounded 6–20 s | Low                          |
| D. Beat-synced arch pulses                                                                                        | Low-medium (ambient)   | None                                       | Needs BPM in the music build |
| E. Falling stars through the canopy (rare ×10 roof catch)                                                         | High moment            | Low                                        | Low once A exists            |
| F. "Double Jeopardy" ×10 (wrong answer costs points)                                                              | High tension           | Tone risk for younger players              | Trivial once A exists        |

Build A. Alternate modes and phase 4 are deferred.

## Recommended design: Carve & Catch the Lights

**Verb:** lean with A/D, left/right arrows, or the touch pad. Max lean scales from 40° to 75° with pace, normalized by the selected ride speed so all three speeds have comparable reach. Smooth the input, bound camera bank, and taper lean to zero at the tube mouths. Keep the existing speed choices and normal camera effects; remove Gentle mode entirely.

**Lights** (fits "three lights" / "follow the light" language; not coins):

- ×2 _ember_ — near the waterline (0–20°), common
- ×5 _lantern_ — higher on the wall, a few per ride
- ×10 _star_ — one per ride, at a demanding but reachable angle near the highest available lean
- Use angles measured from the tube bottom. The actual canopy edge is about 109° from the bottom, so the core star stays below it. Predict reach at each candidate arch across all three speeds, and leave tolerance for steering response.
- Give tiers distinct silhouettes and consistent colors across all routes: mint droplet for ×2, violet diamond lantern for ×5, and gold five-point star for ×10. Keep a softly pulsing material and bright edges that preserve the silhouette through bloom.

**Rule (decided — see Decisions):** the highest tier caught arms the next answer. Correct → `base × mult`; wrong → the multiplier is lost. Optional later: Balatro-style _chips_ (+10 per catch) so "catch everything" and "go for the star" both matter; avoid product stacking (×100 gets silly) and sums (illegible).

**Feedback:** a persistent bonus display during the descent shows the active multiplier, tier, and points available on a correct answer. Its three icons serve as a pickup legend, with the active tier highlighted. Upgrades animate the large multiplier and announce "BONUS UPGRADED!" or "STAR POWER!"; lower catches explicitly say the higher multiplier stays active. Keep the best multiplier visible through the airborne and splash phases, until the basin stake takes over. Use short chimes and small sparkles; preserve answer feedback in its separate caption.

## Implementation and regression checks

- `model.ts` — store lean and catches for the current ride. Detect catches over the swept distance/angle interval, once per light. Reset ride catches when a new route is created. Test leaning through loops and returning to the existing launch position.
- `lights.ts` / `rides.ts` — deterministic placement from `route.seed`, shared speed integration, and reachable angles across all speed settings. Keep lights inside the shell and away from collars. Curves stay unchanged, with new tests for the translated eye path.
- `geometry.ts` — one instanced mesh per flume; hide caught instances and release their resources with the flume. Exclude the light layer explicitly on each Reflector camera, since the installed Reflector clones the main camera's layers.
- `main.ts` — score from the pending question's saved multiplier at `route`, then arm and persist the completed ride's multiplier at `land`. Update score/catch HUD independently of phase changes. Show tube instructions and touch controls from the first ride. Extend QA snapshots with lean, catches, and scoring state.
- `journey.ts` / `save.ts` / `panel.ts` — default old saves to score 0 and multiplier 1; validate both new fields. Correct answers use the answered level, then consume the multiplier; wrong answers consume it without subtracting points. The win card shows total score.
- Resume preserves the last landed stake for the same pending question. A replayed feeder may improve that stake but cannot stack it. Unlanded catches are transient. Restart clears points and stakes; free riding collects lights without adding score or arming an answer.
- Remove the Gentle checkbox, reduced-motion branch, and `uGentle` shader uniform, and update browser checks. Do not add a catch opt-out or `?lights=0` path. Retain the regular pause, mute, rendering quality, and ride speed controls.

**Scope:** phases 1–3 on a single branch: scoring and HUD, lean and bank, then lights and feedback. Phase 4 (star-through-canopy, beat sync, alternate modes) is deferred. Validate the 113 baseline tests plus new placement, reachability, swept catch, scoring, migration, and disposal tests. Run the desktop/mobile catch check, ride check, lifecycle check, and full browser regression, including memory growth and long question layouts.

## Decisions

1. **Stacking rule — highest tier caught arms the next answer** (the recommended rule). No product or sum stacking.
2. **Base points — `100 × level` of the question answered**, chosen for fun factor. Stakes climb toward each stage's level-10 finale (100 → 1,000 base, up to 10,000 with a ×10 star) and reset with every new stage, so the numbers keep meaning something instead of inflating monotonically across 210 questions. The panel shows the computed stake ("3,500 riding on this answer"), so nobody has to multiply mid-ride. If playtesting wants more escalation, the lever is chips per catch, not a bigger base.
3. **Double Jeopardy — not in the core game.** This is a learning game with a calm tone; a wrong answer already forfeits the multiplier you worked for, which is the right amount of sting. Docking points for mistakes punishes learning, and the platforms that offer it (Quizizz) keep it strictly opt-in per question. Revisit only as an opt-in mode after playtesting (phase 4).
4. **Always on for everyone.** Lights are live from the first ride. There is no catch opt-out, feature flag, or Gentle camera mode. Added movement and attention are accepted tradeoffs; one consistent core experience is the priority.

## Sources

- [Balatro feedback breakdown](https://blakecrosley.com/guides/design/balatro)
- [GamesHub on Balatro](https://www.gameshub.com/news/features/balatro-roguelike-deckbuilder-2637397/)
- [Quizizz power-ups](https://forwork-support.quizizz.com/hc/en-us/articles/360046670172-Power-Ups-Their-Types)
- [Blooket vs Gimkit vs Kahoot 2026](https://triviamaker.com/blooket-vs-gimkit-vs-kahoot/)
- [Teachfloor comparison](https://www.teachfloor.com/blog/blooket-vs-gimkit-vs-kahoot--vs-quizizz)
- [Turbogeek: endless runners 2026](https://turbogeek.org/why-endless-runner-games-are-still-addictive-in-2026/)
- [Hybrid-casual strategy 2026](https://gamegrowthadvisor.com/blog/2026-04-16-hybrid-casual-game-design-strategy-2026/)
- [Aqua Thrills](https://poki.com/en/g/aqua-thrills)
- [Aquapark.io](https://www.crazygames.com/game/aquapark-io-yky)
- [Rhythm games online 2026](https://hardiktrehan.com/hthub/games/guides/top-music-rhythm-games-online/)
- [Wayline: the juice problem](https://www.wayline.io/blog/the-juice-problem-how-exaggerated-feedback-is-harming-game-design)
- [Xbox Accessibility Guideline 117](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117)
- [Game Accessibility Guidelines: FOV](https://gameaccessibilityguidelines.com/if-the-game-uses-field-of-view-3d-engine-only-set-an-appropriate-default-for-the-expected-viewing-environment/)
- [three.js r186](https://github.com/mrdoob/three.js/releases/tag/r186)
