# Gameplay trailer

Renders the 42-second gameplay trailer straight from the game, frame-exact at
4K 60 fps, in a 16:9 master (3840×2160) and a 9:16 master (2160×3840).
Everything on screen is the real game: the takes drive the QA hook one
1/60 s step per frame in headless Chromium on the GPU, so the cut is
deterministic and can be re-rendered after any change to the game.

```sh
npm run trailer             # artifacts/trailer/nightwater-trailer-landscape-3840x2160.mp4
npm run trailer:portrait    # artifacts/trailer/nightwater-trailer-portrait-2160x3840.mp4
```

Each run takes about 40 minutes: ~25 minutes of capture, ~10 of typography,
and the encode. Both aspects can render at the same time. Add
`--skip-capture` to re-cut and re-encode existing takes (after editing cues,
sound or the edit), `--scale 1` for a quick 1080p/540p preview, and
`--out <dir>` to keep previews apart from the masters.

## How it fits together

| File           | Role                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `page.mjs`     | Opens the dev server's game with in-flight patches: pixel-ratio cap lifted, the real-time loop paused while frames are stepped, `?journey=` pinning the questions. |
| `driver.mjs`   | Page-side helpers: analog lean through the touch axis, a light-catching autopilot, camera and HUD fades, and a per-frame log of phase, speed and events.           |
| `takes/*.mjs`  | The shots. `journey` is one continuous 36 s take; `questions` and `tubes` are the montage; the integral question runs on under the closing lockup.                 |
| `capture.mjs`  | Steps a take frame by frame and writes numbered 4K PNGs plus `log.json`.                                                                                           |
| `edit.mjs`     | The cut, on the album track's 126 bpm grid: the tube entry lands on the drop (bar 5), the star on bar 9, the montage on bar 16.5, the lockup on bar 19.            |
| `overlay.mjs`  | The typography, rendered as a transparent PNG sequence with the brand fonts from `art/fonts`.                                                                      |
| `audio.mjs`    | Synthesises the game's water rush, chimes, splash and reward at the logged event times, mirroring `src/audio.ts`.                                                  |
| `assemble.mjs` | Hard-links the chosen frames into one sequence, composites the type, mixes and normalises to −14 LUFS / −1 dBTP, encodes H.264 High 5.2 CRF 13.                    |
| `render.mjs`   | Runs the whole thing for one aspect.                                                                                                                               |

The takes read the game through `window.__nightwater.trailer`, which
`page.mjs` adds to the QA object at load time; `src/` is untouched.

## Changing the cut

- Timing and copy live in `edit.mjs` (`segments`, `cues`, `MUSIC`).
- Shots live in `takes/`. Seeds were chosen so the first ride has a loop and
  a reachable star (`seed=20`, exit 0) and the questions read well on screen
  (`journey=5` gives "7 × 7 = ?" then "42 ÷ 7 = ?").
- The music is pulled from the album CDN on first run; `MUSIC.offset` aligns
  the track's drop with bar 5. Re-measure the grid if the track changes.
