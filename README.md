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
| Circular progress, arc lengths | drawn by eye per sample (e.g. 4 dp: 10% → 50°, 30% → 80°, 50% → 170° of arc), gaps vary 20.7–22.6° | proportional arcs — we follow the kit's samples as keyframes, interpolated in between |
| Linear wavy progress, 100% (4 dp) | active runs 2px past the frame (to x=404) | ends at width − 2 like Flat and 8 dp — we follow this |
| Linear wavy indeterminate, Step 2 | 40px wavelength (Step 1: 20px) | 20px (Compose `LinearIndeterminateWavelength`) — default; `wavelength` prop reproduces Step 2 |
| Circular wavy progress, 10% | wavy (linear 10% is flat) | Compose flattens ≤10% — we follow the kit for each shape |
| Slider, 0% Enabled / Hovered (XS–L) | hover layer swapped between the two variants | Enabled without, Hovered with — we follow this |
| Slider XS, disabled | active track square-cornered | 8px outer corner like every other size — we follow this |
| Centered / Range slider, ±50 frames | handles placed by eye (e.g. 88 / 266px, not ±50% of travel); centered labels show "50" for −50 | any value works; fixtures reproduce the kit's positions and label text via `valueLabel` |
| Centered slider S / M | tracks at fractional offsets (y 6.27, 6.54, 7…) | whole-pixel layout — we follow this |
| Range slider Medium | 44px frame (52px handles overflow), value indicator 8px above the handle | 52px like Standard Medium, indicator 4px above — we follow this |
| Slider, keyboard focus | — (no Focused variant) | handle halves to 2px and the value indicator shows, as Compose does on focus |
| Slider inset icon | layer present but hidden in every variant | not implemented yet |
| Outlined text field, floating label | notch drawn as a Surface-coloured patch over the stroke (Figma can't cut strokes) | a real gap in the outline (fieldset legend), so it works on any background; `textFieldVars.notchColor` (default transparent) — parity fixtures set it to Surface |
| Outlined text field, disabled | stroke = 1px On Surface 10% centred + 1px On Surface 4% inside | On Surface 12% — we follow the kit |
| Text field, Error frames | Error + input text drawn focused (3px, caret); Error + label / placeholder resting (1px) | both are valid states — fixtures reproduce each |
| Text field, Placeholder frames | label floated with the placeholder visible while unfocused | Compose `alwaysMinimize`: `alwaysFloatLabel` |
| Outlined text field, hovered placeholder (no icons) | placeholder On Surface | On Surface Variant like every other variant — we follow this |
| List item, Dragged | text column centred (every other state stacks it from the top) | — we follow the kit |
| List item, Top-aligned · Dragged · Unselected | frame clips its content, so Figma draws the shadow with its 6px spread (its three Dragged siblings don't) | no spread like the siblings — we follow this |
| Accordion button | pill filled only at rest; hover / focus / press drop it for the 32×32 layer, which squares to 8px corners when pressed | — we follow the kit |
| Swipe reveal, 2 actions · revealed | primary drawn 40×48 at x=54 | 48px buttons 2px apart like 1 / 3 actions — we follow this |
| Standard list (one line), row 02 | "Label text" at 96,20 (rows 01, 03–06: 48,10) | — we follow the other rows |
| Baseline list, 3-line · Video · no trailing | content centred (every other 3-line variant top-aligns) | top-aligned — we follow this |
| Baseline list, trailing checkbox | the 48px target drops its left inset (44px wide); 1-line rows stay 56px with the target spilling into the padding | — we follow the kit |
| List reorder | dragged state only (no drag-and-drop flow in the kit) | `dragged` renders the lifted item for your drag-and-drop layer |
| Menu, standard selected · focused | state layer 8% (other focused items 10%) | 10% — we follow this |
| Menu, standard selected · pressed | ripple 8% (other pressed items 10%) | 10% — we follow this |
| Menu, standard selected · disabled | no container (vibrant keeps its Tertiary fill; Compose: Tertiary Container) | container kept, content at 38% — we follow this |
| Menu, vibrant 3 groups | middle group spaces its items 2px apart (every other group: 0) | 0 — we follow this |
| Menu, vibrant unselected hover / press | state layer On Tertiary (white) at 8%; focus uses On Tertiary Container | On Tertiary Container (Compose) — we follow the kit |
| Menu, ripple | painted over the item's content | under the content — we follow the kit |
| Menu shadow (level 3) | 3px spread only when the menu is a single group (Figma ignores spread for multi-child frames) | spread always — we follow the kit |
| Baseline menu shadow (level 2) | frame doesn't clip, so no spread | spread — we follow the kit |
| Tabs, secondary icon + label · selected · focused | indicator at x=0.5 (other variants 0) | 0 — we follow this |
| Tabs, scrollable secondary icon + label | tabs forced to 90px, content overflowing the 16px padding | tabs ≥ 90px that grow with their content (Compose ScrollableTabRow) — we follow this |
| Tabs, in-row content | content centred on the half pixel (47 / 63px tabs) | — we follow the kit (transform for the half pixel) |
| Tabs, pressed ripple | painted over the content; secondary indicator above the ripple | — we follow the kit |
| Navigation bar · vertical item · large badge · selected | label On Secondary Container (other selected items: Secondary) | Secondary (Compose) — we follow this |
| Navigation rail · vertical item · small badge · selected | label On Secondary Container | Secondary — we follow this |
| Navigation rail · horizontal item · pressed · selected | 101px wide (siblings 99px) | hug the content — we follow this |
| Navigation rail FAB | no shadow | flat FAB (Compose bottomAppBarFabElevation) — `Fab elevated={false}` |
| Navigation rail, middle alignment | destinations centred in the full height (may overlap the header gap); overflowing rails top-align | — we follow the kit |
| Navigation drawer (Deprecated section), XR bar / rail | in the kit | not implemented — deprecated in M3 Expressive (use the expanded rail) / XR is out of scope |
| Top app bar, flat | no container (the frame shows through) | Surface — we follow the kit (nothing scrolls under a flat bar; scrolled bars are Surface Container) |
| Top app bar titles | Figma legacy line height; small title 1px higher and large subtitle 1px lower than it | — we follow the kit (measured per layer) |
| Top app bar, search / image content | search field = the Search page's bar restyled; image placeholder FIT with LUMINOSITY | `search` / `content` slots; fixtures reproduce the kit's building blocks |
| Bottom app bar FAB | shadow clipped by its frame | `Fab elevated={false}` |
| Search, focused input caret | static 1px caret after the hugged text ("Input text" hugs at 73px) | live inputs use the native caret; the test-only static caret follows `textBox.hug` (72px with our Roboto) — 1px, recorded exception |
| Search bar (collapsed) | one clickable surface around the icon buttons | the hint is a real button stretched over the bar (no nested interactive controls); icon buttons stay separate |
| Search full-screen layout | no container fill (bar and results over the screen) | — we follow the kit; place the view on Surface |
| Search, expanded input bar | static layouts only (no state variants) | a text field with no state layer (Compose InputField) |
| Toolbar, floating elevation | level 3 (no spread: the frame doesn't clip) | Compose: level 0 (level 1 with a FAB) — we follow the kit |
| Toolbar, floating padding | 12px across the main axis in a fixed 64px bar (48px items overflow it) | Compose 8px all round, ≥ 64px — identical for the kit's items, and the bar keeps 64px in any parent |
| Toolbar, standard docked | content slot hugs at a 106px gap (items at 28 / 182 / 336) | space-between in 16px padding (Compose FlexibleBottomAppBar; the vibrant docked variant) — recorded exception |
| Toolbar, vibrant toggleable icon button · unselected states | state layer On Secondary Container | On Primary Container (its own ripple, its siblings, Compose's content colour) — recorded exception |
| Toolbar items | toolbar-specific colour sets; selected toggles stay round | the toolbar recolours IconButton / ToggleIconButton / ToggleButton through context (`ToolbarScope` for standalone building blocks) |
| Toolbar examples | docked rows with off-grid middle items, the Photos row pushed 8px down; XR toolbar | not fixtures (hand-placed) / XR out of scope |
| Toolbar building blocks | several variants placed off the pixel grid (x 33.2, y 106.25 …) | references are individual node exports (a frame crop bakes in a sub-pixel offset) |
| Toolbar + FAB collapse | no collapsed state | Compose: the toolbar shrinks into the FAB, which grows 56 → 80px in place (FastSpatial); the shadow lerps to none |
| Side sheet, standard | edge divider runs 1px past the sheet's bottom | — we follow the kit |
| Side sheet, modal | 16px corners all round | detached 16px from the screen edges; Compose has no side sheet, so it moves like its bottom sheet (in on default spatial, out on fast effects, scrim on default effects) |
| Bottom sheet drag handle | 16px padding (36px header) | Compose pads it 22px — we follow the kit; on a modal sheet the handle is a button that dismisses (keyboard / assistive tech), dragging past 56px or 125px/s dismisses |
| Sheet content building blocks | an empty frame and the kit's dashed "replace this slot" placeholder | not fixtures (sheets take any content) |
| Modal bottom sheet reference | the component set clips the variant's scrim with a rounded corner | recorded exception (154px, outside the sheet) |
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
