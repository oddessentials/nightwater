# Nightwater brand art

Vector masters for the app icon, logotype and social card, plus the pipeline
that renders every raster asset from them. Edit the masters, run `npm run art`,
commit the outputs. Nothing here needs a design tool installed: Chromium (from
the existing Playwright dependency) is the renderer.

## Files

| File                       | What it is                                                                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `icon.svg`                 | App icon master, 512 viewBox. A flume mouth glowing on the waterline with its rippled reflection.                                                               |
| `og-image.svg`             | Social card master, 1200×630. Lockup on the left, the three exits on the water to the right.                                                                    |
| `wordmark.svg`             | Generated logotype as outlines (no fonts needed). Do not edit by hand; change `scripts/support/wordmark.mjs`.                                                   |
| `fonts/`                   | Static, Latin-subset instances of Newsreader and Inter used by the masters (OFL licences alongside).                                                            |
| `exports/icon-1024.png`    | Store-ready square icon (no corner radius, no transparency) for App Store / Play Store style listings.                                                          |
| `../scripts/build-art.mjs` | The pipeline: outlines the wordmark, renders PNGs, packs `favicon.ico`, copies `favicon.svg`. `--preview` adds a tab-size contact sheet under `artifacts/art/`. |
| `../tests/art.test.ts`     | Keeps the committed outputs honest: sizes, `.ico` frames, manifest and `<head>` references, master/output sync.                                                 |

Outputs in `public/` and who consumes them:

| Output                         | Consumer                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `favicon.svg`                  | Chrome, Edge, Firefox tabs. A `@media (max-width: 40px)` block inside the file simplifies the mark at tab sizes. |
| `favicon.ico` (16, 32, 48)     | Safari, legacy browsers, Windows shortcuts and search-result thumbnails.                                         |
| `apple-touch-icon.png` (180)   | iOS home screen and Safari bookmarks. Full-bleed; iOS applies its own corner mask.                               |
| `icon-192.png`, `icon-512.png` | Web app manifest, install prompts, Android launchers (`purpose: any`).                                           |
| `icon-maskable-512.png`        | Android adaptive icons (`purpose: maskable`). The mark sits inside the 80 % safe circle.                         |
| `og-image.png` (1200×630)      | Open Graph and Twitter `summary_large_image` cards. Referenced absolutely via `VITE_SITE_URL`.                   |
| `manifest.webmanifest`         | Name, colours and the icon set above.                                                                            |

## Design system

- **Night**: sky `#040c18 → #071c27 → #0c3440`, water `#0f4049 → #030910`, theme colour `#07191e`, page background `#040b10`.
- **The three exits** (from `EXITS` in `src/model.ts`): Tideline mint `#6de9d1`, Afterglow violet `#b6a0fa`, Undertow gold `#f3c080`. The icon uses mint alone. Pickups (`LIGHT_STYLES`) share the same hues.
- **Neon**: every ring is four strokes on one circle — wide blurred haze, blurred bloom, solid colour, thin near-white core (`#fbfffd`). Reflections are the ring mirrored across the waterline through a mask of horizontal ripple stripes fading downward.
- **Type**: the lockup is Newsreader Display (opsz 72) — `Night` upright in `#eef3eb`, `water.` italic in mint `#b9e4da`, stacked on a 0.85 line height with the second line nudged 0.03 em right, tracking −0.03 em. It mirrors the title screen, which uses Georgia in `src/style.css`. Captions are Inter Medium in tracked caps (`THE PARK IS YOURS`, `FIRST PERSON · AFTER HOURS · ENDLESS`); the tagline is Newsreader Text Italic.
- **Safe zones**: keep the icon's mark inside the centre circle spanning 80 % of the width (maskable). On the card keep the lockup and tagline inside x 96–560, y 90–566 so X's 2:1 crop and centred square crops still show them; nothing important sits in the outer 15 px vertically.

## Regenerating

```sh
npm run art            # renders public/* and art/exports/*
npm run art:preview    # also writes artifacts/art/favicon-sheet.png (16–128 px, zoomed)
npm test               # tests/art.test.ts checks the outputs
```

`scripts/build-art.mjs` lists every target in one array. To add a size for a
new platform, add an entry (`{ file, source, size | width/height, variant }`)
and run the build; `variant: "square"` drops the corner radius.

## Fonts

`fonts/*.ttf` are static instances cut from the variable Google Fonts releases
with fontTools, then subset to Latin so they stay ~30 KB each:

```sh
pip install fonttools
python - <<'EOF'
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
UNICODES = "U+0020-007E,U+00A0,U+00A9,U+00B7,U+2013-2014,U+2018-2019,U+201C-201D,U+2022,U+2026,U+2212,U+00D7"
for src, axes, out in [
  ("Newsreader[opsz,wght].ttf",        {"opsz": 72, "wght": 400}, "Newsreader-Display.ttf"),
  ("Newsreader-Italic[opsz,wght].ttf", {"opsz": 72, "wght": 400}, "Newsreader-DisplayItalic.ttf"),
  ("Newsreader-Italic[opsz,wght].ttf", {"opsz": 24, "wght": 400}, "Newsreader-TextItalic.ttf"),
  ("Inter[opsz,wght].ttf",             {"opsz": 28, "wght": 500}, "Inter-Medium.ttf"),
]:
    font = instancer.instantiateVariableFont(TTFont(src), axes, inplace=False, updateFontNames=False)
    options = subset.Options(); options.layout_features = ["kern", "liga", "calt", "case", "pnum", "tnum", "ccmp", "locl", "mark", "mkmk"]; options.name_IDs = ["*"]; options.hinting = False
    s = subset.Subsetter(options=options); s.populate(unicodes=subset.parse_unicodes(UNICODES)); s.subset(font)
    font.save(out)
EOF
```

The name tables were then set to the family names the masters reference
(`Newsreader Display`, `Newsreader Text`, `Inter Medium`). Both families are
SIL Open Font License 1.1; see `fonts/OFL-*.txt`.

## Porting checklist

- **Web / PWA**: everything in `public/` plus the `<head>` block in `index.html`. Set `VITE_SITE_URL` for the new origin.
- **iOS / macOS**: `exports/icon-1024.png` is the App Store icon; Xcode derives the rest.
- **Android**: `public/icon-512.png` for the listing, `public/icon-maskable-512.png` as the adaptive foreground over a `#07191e` background layer.
- **Steam / itch / press**: `wordmark.svg` for the logotype, `og-image.svg` as the base of capsule and header art (retarget the viewBox, keep the exits on the waterline). Add the sizes to `build-art.mjs` so they stay reproducible.
