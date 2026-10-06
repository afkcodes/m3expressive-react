# M3 Expressive — React component library

Material 3 Expressive, built on [Base UI](https://base-ui.com) for behaviour and
accessibility and [StyleX](https://stylexjs.com) for styling, verified against
Figma at the pixel level.

```
packages/m3/          @m3x/react — the library
  src/tokens/         colour, typescale, shape, elevation, state, motion (StyleX vars)
  src/motion/         spring physics (Compose port), CSS linear() generator, JS spring animator
  src/primitives/     StateLayer, Ripple, focusRing, textBox
  src/shapes/         Shape (exact Figma paths), MorphingShape, graphics/ (AndroidX graphics-shapes port)
  src/components/     Button, …
  src/testing/        ForceState — static interaction states for visual tests
  src/theme/          M3Provider (colour scheme + motion scheme)
apps/workbench/       Vite app: /fixture/<c>/<v> (isolated renders), /compare/<c> (Figma vs live)
figma/<component>/    Figma reference PNGs (2x) + manifest.json (node ids, boxes)
tests/visual/         Playwright parity suite (box + pixel diff)
scripts/              gen-motion (springs → CSS), figma-pull (REST re-sync, optional)
```

## Commands
| | |
|---|---|
| `pnpm dev` | workbench on http://localhost:5199 |
| `pnpm test` | unit tests (spring physics, token sync) |
| `pnpm test:visual` | Figma parity suite — diffs land in `tests/visual/__output__` |
| `pnpm gen:motion` | regenerate CSS motion tokens from `motion/tokens.ts` |
| `pnpm gen:tokens` | regenerate colour/type/shape/elevation tokens from `figma/_tokens/foundations.json` |
| `pnpm figma:crop <component>` | cut per-variant refs out of whole-frame Figma exports |
| `npx playwright show-report` | HTML report of the last parity run, with diff/actual images per variant |
| `FIGMA_TOKEN=… node scripts/figma-pull.ts <component>` | refresh refs from Figma |

## How parity is measured
For every variant the suite renders the fixture in Chromium at 2x and checks:
1. **Node size** equals the Figma node size exactly.
2. **Layer boxes** (label, icon, …) equal the Figma layer boxes exactly.
3. **Pixels**: both images are flattened onto the Figma background and compared with
   pixelmatch (threshold 0.05). Each mismatched pixel is classed as:
   - **AA**: pixelmatch's anti-aliasing detector.
   - **glyph-edge raster**: on a high-contrast edge in both images and ≤ 48/255 apart.
     Figma and Chrome compute edge coverage with different rasterisers. A real ½px shift
     gives deltas of ~100–200/255 along whole edges, so it can't hide here.
   - **drift**: everything else. Must be 0, unless the variant records `allowedDiffPixels`
     with a written `allowedDiffReason`.

### Calibration (Styles page, 2026-10-06)
- Elevation 1–5, light + dark: 0 drift pixels.
- 30 text styles: node sizes exact, baselines exact, 0 drift on 28/30. The other 2 have
  1 glyph pixel each (recorded exceptions).
- Findings baked into the library: Figma's auto-width text box = ceil(advance − trailing
  tracking) → `textBox.hug`; Figma baseline = round(exact half-leading) vs Chrome's
  per-metric rounding → `ascent/descent-override` in `fonts.css`.

## Motion
M3 Expressive motion is spring-based (`md.sys.motion.spring.{fast|default|slow}.{spatial|effects}`).
Spring values come from the Compose token source and match m3.material.io.
For CSS, each spring is converted to an exact `linear()` easing (≤0.1% error)
instead of Google's cubic-bezier approximation; interruptible motion uses
`animateSpring`, which keeps velocity when retargeted, as Compose does. Spatial motion is
disabled under `prefers-reduced-motion`.

## Where the Figma kit departs from the M3 guidelines
The library follows the kit (the brief is pixel parity with Figma). Each item is one style
line to flip if you'd rather follow the M3 guidelines:

| Component | Kit (implemented) | M3 guidelines |
|---|---|---|
| Buttons, disabled | container on-surface **10%** | 12% |
| Elevated button | shadow level 1 (XS/S), **2 (M), 3 (L/XL)** | level 1 at every size |
| Text button, disabled | **on-surface 10% container** | no container |
| Icon button outlined, Round XS Default, hovered | state layer 10% (focus value) | 8% like every other hovered icon button — we follow this |
| Toggle button tonal, unselected Round XL hovered | state layer 10% (focus value) | 8% like every other hovered toggle — we follow this |
| Toggle icon button outlined, selected Square M Default pressed | stays round (r100), 10% layer, no ripple | pressed radius + 8% layer + ripple like its 14 siblings — we follow this |
| Toggle icon button standard, unselected Square S Default (all states) | icon instance swapped to stars_filled | stars (the unselected icon everywhere else) — we follow this |
| Split button, focused | **no state layer** (focus ring only) | 10% focus layer — we follow the kit |
| Split button, outlined | **1px** outline at every size (Button: 2px at L/XL) | — we follow the kit |
| Split button XL, trailing focused | inner corners 14px (other sizes keep the rest corner) | rest corner 12px — we follow this |
| FAB Large, focused (primary / secondary / tertiary / tertiary container) | state layer 8% | 10% like every other focused FAB — we follow this |
| Extended FAB Large secondary container, focused | label 0.48px right | consistent position — we follow this |
| Connected segment XS, selected + disabled | no selected layer (S–XL keep a 10% layer inside the 38% content) | consistent S–XL treatment — we follow this |
| Connected segment XL, unselected + disabled | 16px corner (other XL states 20px) | 20px — we follow this |
| Segmented button, density −1/−2/−3 | variants exist but are hidden (outside the set, empty exports) | implemented per M3 (36/32/28px containers); not pixel-referenced |
| Segmented button, pressed | flat 10% layer, no ripple | — we follow the kit |
| Chips, elevation | per chip type (e.g. assist hover 1 / press 2 / drag 2; filter hover 2 / press 1 / drag 4; input drag 3) | filter-chip values for all — we follow the kit per type |
| Chips, outlined interacting | surface fill under the state layer while hovered / focused / pressed / dragged | no fill — we follow the kit |
| Assist chip, "Label & favicon" | third-party trademark image as placeholder content | not reproduced (any 18px image works) |
| Input chip, avatar + selected + dragged | doesn't clip → shadow without spread | clipped like its siblings — we follow this |
| Plain tooltip, multi-line | variant hidden in the kit (empty export) | wraps at 200px per M3; not pixel-referenced |
| Snackbar set | hidden in the kit; the visible "Examples" instances are referenced | — |
| Snackbar action in examples | fixed 59px frame (label not hugged; "Longer Action" clipped) | hugging text button — we follow this |
| Checkbox, disabled indeterminate | dash bound to On Primary (disabled check uses Surface) | Surface for both (M3) — we follow this; identical-looking in light, avoids a purple dash in dark |
| Checkbox, error selected (enabled) | check bound to On Primary (other error states: On Error) | On Error — pixel-identical in light theme |
| Shape "Soft boom" | vector has a hairline internal seam (visible in Figma too) | n/a |
| Shape "4-leaf clover" | component frame 381px wide (vector unaffected) | n/a |

## Shapes
`<Shape shape="cookie9Sided" />` draws the kit's exact vector. `<MorphingShape shape={…} />` springs
between shapes using the AndroidX morph algorithm (ported in `src/shapes/graphics`, all upstream tests
included) on polygons built **from the Figma paths** — Compose's own MaterialShapes differ from the kit by
up to 3.6% of area (pentagon, boom, triangle, square corners…), so they are not used for rendering. Morph
endpoints match the Figma outlines to ≤ 0.07% of area; at rest the exact Figma path is drawn. Demo:
`/demo/shapes`.
