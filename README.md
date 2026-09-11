# Nightwater

A standalone first-person water park after dark. Start inside a closed tube, descend a generated flume, splash into a circular walled basin, and choose one of three glowing exits. Repeat indefinitely.

This is the third project beside `tunnel-to-water-simple` and `waterslide`. It is a new implementation; neither earlier project is a runtime dependency.

## Play locally

On Windows, double-click **Launch Nightwater.cmd**. It installs dependencies if needed, starts the local server, and opens the park. Keep its terminal open while playing. Node.js 22.12 or later is required; development and verification used Node 24.

Or, from this directory:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:4173**. Click **Enter the current**. All artwork and sound are generated locally; the running game needs no external services, assets, accounts, or API keys.

| Control                        | Action                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------ |
| W / S                          | Paddle forward / backward                                                      |
| A / D                          | Paddle left / right relative to your view                                      |
| Drag                           | Look around                                                                    |
| Click the scene                | Capture the mouse for free look                                                |
| Left / right arrow             | Turn                                                                           |
| 1 / 2 / 3, or an exit button   | Paddle automatically to that light                                             |
| WASD during automatic paddling | Take control again                                                             |
| Esc                            | Pause / resume; release captured mouse                                         |
| M                              | Toggle sound                                                                   |
| Touch                          | Left thumb pad to paddle; drag the scene to look; tap an exit button to choose |

Slides carry you automatically. Pause offers **High / Balanced** rendering and a **Gentle camera** option. A system reduced-motion preference enables Gentle camera initially. The reduced-motion setting removes banking, swimming bob, speed-dependent field of view, and color separation; forward motion remains intrinsic to the ride.

## The repeating ritual

- One `Basin` constructor defines every pool: radius 15 m, water at local y = 0, walls to 8.4 m, three low exits, one elevated inlet, and the same landing position.
- All three choices use the same `RideState` transitions: `basin → entering → tube → air → splash → basin`. The first ride joins that exact sequence at `tube`.
- The inlet is physically above the swimmer. It stays visible, receives the incoming flume and a falling stream, and never acts as an exit.
- New flumes descend continuously. Their forward coordinate increases monotonically, with seeded curves and color variations. A full 360-degree shell follows every path sample.
- Each route leads to a new, lower basin. After landing the world is rebased to that basin's origin. Earlier basins and routes are disposed; geometry and texture counts stay bounded across repeated rides.
- The surrounding network contains illuminated tubes, pillars, braces, towers, and rails. The pool's skyline is built by the same constructor each time.

The visuals use Three.js/WebGL2, custom wet-surface shaders, animated caustics, a rippled planar reflection, flowing tube water, continuous inlet spray, landing particles, temporary lens droplets, bloom, tone mapping, and anti-aliasing. Audio is synthesized water noise with speed and underwater filtering. This is an art-directed real-time renderer, with procedural water effects rather than a fluid solver. Blender and Unreal are not required.

## Verify

```sh
npm test
npm run build
npm run test:browser
npm run test:lifecycle
```

The browser check requires the dev server and Microsoft Edge. It uses Playwright with `channel: 'msedge'`, runs the first ride in real time, exercises all three choices over 13 landings, checks desktop controls and touch gestures, and records screenshots and resource counts in `artifacts/`. Accelerated portions still run every fixed physics step and all real transitions. The unit suite checks 240 generated routes, closed tube geometry via raycasts, 60 consecutive choices, steering, wall collision, and the inlet barrier.

To check the production build, run `npm run preview` in another terminal and set the browser check URL:

```powershell
$env:NIGHTWATER_URL = 'http://127.0.0.1:4174'
npm run test:browser
```

`?seed=123` selects a reproducible sequence. `?qa=1` exposes the browser test driver (`window.__nightwater`); it is absent on the ordinary play URL.

## Source map

| File                             | Responsibility                                                                |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `src/model.ts`                   | Deterministic routes, movement, collision, transitions, coordinate rebasing   |
| `src/basin.ts`                   | Shared pool, four openings, portal hardware, reflection, exterior network     |
| `src/geometry.ts`                | Closed flume geometry, water ribbon, GPU resource disposal                    |
| `src/shaders.ts`                 | Tube, tile, water, sky and lens rendering                                     |
| `src/main.ts`                    | Renderer, fixed-step loop, event integration, HUD, pause and quality settings |
| `src/input.ts`                   | Mouse, keyboard and touch input                                               |
| `src/effects.ts`, `src/audio.ts` | Spray, splash and sound                                                       |

The generated `dist/` directory can be served by any static web server. `artifacts/`, `dist/`, and `node_modules/` are excluded from Git.
