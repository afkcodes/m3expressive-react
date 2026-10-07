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
| `pnpm showcase` | component showcase on http://localhost:5300 — every component, live, with theme controls and copyable code |
| `pnpm test` | unit tests (spring physics, token sync) |
| `pnpm test:visual` | Figma parity + live interaction / motion / a11y suites — diffs land in `tests/visual/__output__` (`test:visual:parity`, `test:visual:live`: one half) |
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
`animateSpring`, which keeps velocity when retargeted and ends where Compose's `Animatable` ends
(a port of `estimateAnimationDurationMillis`), so visible overshoots play out. Spatial motion is
disabled under `prefers-reduced-motion`.

Which motion each component uses is ported per component from the Compose material3 source
(Material Components Android where Compose has none: dialogs, side sheets) — audited 2026-10-07:
- Not everything is a scheme spring: state layers fade with Compose's `StateLayer` tweens (15ms
  linear; focus / drag in 45ms), elevation changes use `ElevationDefaults` (120ms FastOutSlowIn in,
  120 / 150ms out), the ripple keeps its 75 / 225 / 150ms tweens.
- Press shape morphs: Button, IconButton and SplitButton on default effects (no bounce, as Compose
  intends); ToggleButton and connected button groups on fast spatial.
- Gestures (sheets, carousel, list swipe, date / time pickers) use ports of Compose's velocity
  tracker, `AnchoredDraggable.computeTarget`, Pager single-advance flings and the spline fling decay
  (`motion/gesture.ts`, `motion/fling.ts`).
- Live checks: `tests/visual/motion-*.spec.ts` compare frames against the analytic springs.

## Dynamic colour (seed from a colour or an image)
Material You's "colour from wallpaper": every colour role is generated from one seed with Google's
[material-color-utilities](https://github.com/material-foundation/material-color-utilities) (the library
Android and Material Theme Builder use) and applied with `<M3Provider colors>`. Without `colors` the
provider uses the M3 baseline (Figma kit) colours, which is what parity is measured against.

```tsx
import { M3Provider } from '@m3x/react';
import { useDynamicScheme, useSeedColorsFromImage } from '@m3x/react/dynamic-color';

// A hard-coded seed
const colors = useDynamicScheme('#006A6A', { variant: 'tonal-spot', contrast: 'standard' });

// …or a seed from a picture (<img>, ImageBitmap, canvas, File/Blob or a CORS-enabled URL)
const { colors: seeds } = useSeedColorsFromImage(file);   // ranked candidates, best first
const colors = useDynamicScheme(seeds[0]);

<M3Provider colorScheme="system" colors={colors}>…</M3Provider>
```

- Variants (Android's colour "styles"): `tonal-spot` (default), `neutral`, `vibrant`, `expressive`,
  `fidelity`, `content`, `rainbow`, `fruit-salad`, `monochrome`. Contrast: `standard` / `medium` /
  `high` or MCU's −1…1. Spec: `2025` (M3 Expressive, default) or `2021`.
- Image seeds follow MCU's pipeline (QuantizerCelebi to 128 colours, then Score), on the image scaled
  to ≤ 112 × 112 px like Android's WallpaperColors; Score falls back to Google Blue when nothing in the
  image is usable. Non-hook helpers: `schemeFromSeed`, `seedColorsFromImage`, `seedColorsFromPixels`.
- `@m3x/react/dynamic-color` is a separate entry so material-color-utilities (~15 KB gzip) only loads in
  apps that use it. MCU 0.4.0 has extensionless relative imports: bundlers resolve them, but a server that
  loads it unbundled (Vite SSR, Vitest) needs it inlined — `ssr.noExternal` /
  `test.server.deps.inline: ['@material/material-color-utilities']`.
- Try it: `/demo/theme` (seed presets, any colour, four generated wallpapers, upload / drop a picture).

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
| Circular wavy progress, 10% / 100% | wavy (linear 10% / 100% are flat) | Compose flattens the wave ≤10% and ≥95% — we follow the kit: flat only below 10%; the amplitude ramps over 500ms (Standard up, Emphasized Accelerate down) |
| Slider, 0% Enabled / Hovered (XS–L) | hover layer swapped between the two variants | Enabled without, Hovered with — we follow this |
| Slider XS, disabled | active track square-cornered | 8px outer corner like every other size — we follow this |
| Centered / Range slider, ±50 frames | handles placed by eye (e.g. 88 / 266px, not ±50% of travel); centered labels show "50" for −50 | any value works; fixtures reproduce the kit's positions and label text via `valueLabel` |
| Centered slider S / M | tracks at fractional offsets (y 6.27, 6.54, 7…) | whole-pixel layout — we follow this |
| Range slider Medium | 44px frame (52px handles overflow), value indicator 8px above the handle | 52px like Standard Medium, indicator 4px above — we follow this |
| Slider, keyboard focus | — (no Focused variant) | handle halves to 2px as Compose does on focus; the value indicator also shows (our a11y choice — Compose's Label shows it on press / drag / hover only) |
| Slider, hover | Hovered variants draw no value indicator | Compose's Label also shows it on hover — we follow the kit |
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
| Search full-screen layout | no container fill (bar and results over the screen) | — we follow the kit (transparent by default); `searchViewVars.containerColor` sets a fill that fades in with the expand progress, as Compose's contained bar does |
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
| Side sheet, modal | 16px corners all round | detached 16px from the screen edges; Compose has no side sheet, so it moves like Material Components' modal side sheet: slides 100% over 275ms on the emphasized path both ways, drag to dismiss past half or 500px/s (SideSheetBehavior); scrim on default effects |
| Bottom sheet drag handle | 16px padding (36px header) | Compose pads it 22px — we follow the kit; on a modal sheet the handle is a button that dismisses (keyboard / assistive tech), the whole surface drags; release follows Compose `AnchoredDraggable.computeTarget` (56dp positional / 125dp/s velocity thresholds) and settles on default spatial from the release velocity |
| Sheet content building blocks | an empty frame and the kit's dashed "replace this slot" placeholder | not fixtures (sheets take any content) |
| Modal bottom sheet reference | the component set clips the variant's scrim with a rounded corner | recorded exception (154px, outside the sheet) |
| Dialogs, elevation | no shadow | — we follow the kit (the scrim separates the dialog) |
| Dialog motion | — | Compose dialogs use the platform window animation; we use Material Components' `m3_motion_fade`: fade + scale 0.8 → 1 over 400ms cubic(0.1, 0.7, 0.1, 1), fade out over 150ms cubic(0.3, 0, 0.8, 0.2) (MDC's values; the M3 web tokens read 0.05 / 0.15); reduced motion keeps the fade |
| List dialogs | baseline list items without their Surface fill, middle-inset dividers, right-aligned "100+" 10px before the checkbox | items inherit the dialog surface; `ListItem divider`; right-aligned hug text (`textEnd`) |
| `alertdialog` | — | `Dialog role="alertdialog"` ignores outside clicks (decisions); Escape still dismisses |
| Carousel motion | static frames only | Compose's keyline model is ported (`Carousel/keylines.ts`: multi-browse, hero, centred hero, uncontained) — items resize large → medium → small → anchor as they scroll and settle on the Compose snap spring (stiffness 400, no bounce) from the release velocity, at most one item per fling (single-advance); uncontained decays without snapping (Compose spline decay); wheel / trackpad scrolling stays native and snaps when it ends |
| Carousel items | drawn at their visible size with the art fitted | the item box takes the keyline size (the same as Compose's masked crop for cover-fitted, height-bound content) |
| Carousel padding | 16px each side (uncontained: start only) | keylines are laid out inside the padding; items leave under the padding edge (Compose's anchors sit outside the container) |
| Carousel, mobile multi-browse | 188 / 120 / 56 | Compose arranges 188 / 122 / 54 — recorded exception |
| Carousel, tablet hero / centred hero | copies of the multi-browse layout | Compose hero arrangements (520 / 40, 40 / 472 / 40) — recorded exceptions |
| Carousel, uncontained cut-off item | art fitted to the visible 72px | art centred in the medium keyline item — recorded exception |
| Carousel `itemWidth` (uncontained) | — | the visible item width (Compose's own `itemWidth` excludes the spacing it adds back in the keyline) |
| Carousel multi-aspect / full screen | — | no Compose equivalent: free scrolling at the items' aspect ratios / vertical one-item paging |
| Date pickers, kit calendars | fictitious months (an "August 2025" starting on a Tuesday; the docked one a 30-day month starting on a Saturday) and labels ("Mon, Aug 17") | real calendars (`Intl`); fixtures lay out the kit's grids (July 2025, June 2024) and pass the kit's labels through `formatter` |
| Modal date picker (day), selected day | label-large (the other pickers: body-large) | body-large — recorded exception |
| Year grid | typo: 2030, 2030, 2031 | real years — recorded exception |
| Outside-month days | building block On Surface 38%; the docked picker and the cell's hover / focus On Surface Variant | On Surface Variant 38% — recorded exception |
| Docked month / year lists | decorative scroll thumb | a working, proportional thumb — recorded exceptions |
| Input date picker | format hint drawn as input text (On Surface) | the field's placeholder (On Surface Variant, as Compose) — recorded exception |
| Calendar rows | as many weeks as the month needs (modal); six weeks with the neighbouring days (docked) | — we follow the kit (Compose keeps six rows in the modal) |
| Date picker motion | — | modal: the M3 dialog fade + scale; months slide / swipe on Compose's default spring (ζ1, k1500); the year list expands from 60% opacity on default effects; picker ⇄ input bodies slide and fade as in Compose (headers swap at once — the kit's two headers differ); docked panel fade + 8px drop and full-screen range fade + 24px rise have no Compose / MDC reference (unverified) |
| Time picker values | 12-hour dials at 07 AM; the 12-hour keyboard picker reads "20" next to AM | fixtures use each frame's time; the keyboard field shows 08 AM — recorded exception |
| Clock face | number cells hand-placed (inner 24-hour ring radius 70.7–77.4) | — we use the kit's cell positions at rest; in motion the selector follows the hand on Compose's radii (101 / 69) |
| Clock hand | 12-hour: from the centre + 0.5px, 3px past the selector's centre; 24-hour: to the cell centre | centre → selector centre — recorded exceptions (line edge pixels) |
| Period selector | focused variants inset their halves 1px (labels move 0.5–1px) | the enabled geometry in every state — recorded exceptions |
| Hour-line building block | 24 angle variants stacked on top of each other | not fixtures (covered by the clock faces and the selected hour cell) |
| Time picker motion | — | the hand rotates on the default spatial spring (Compose ClockDialModifier) and follows the pointer while dragging, springing to the value on release; minute taps pick 5-minute steps; an hour tap switches to minutes after 100ms; hours ⇄ minutes cross-fade on default effects; the dialog uses the M3 dialog fade + scale |
| Checkbox, disabled indeterminate | dash bound to On Primary (disabled check uses Surface) | Surface for both (M3) — we follow this; identical-looking in light, avoids a purple dash in dark |
| Checkbox, error selected (enabled) | check bound to On Primary (other error states: On Error) | On Error — pixel-identical in light theme |
| Shape "Soft boom" | vector has a hairline internal seam (visible in Figma too) | n/a |
| Shape "4-leaf clover" | component frame 381px wide (vector unaffected) | n/a |


### Behaviour and accessibility additions (beyond the kit, which draws static frames)
| Component | Behaviour |
|---|---|
| Date fields | Only full 4-digit years are accepted (typing "1/5/2" no longer becomes 1902); the format hint comes from the locale (the date formatter's pattern) — identical for en-US, which the fixtures use |
| Modal / docked pickers | A pick survives parent re-renders (drafts reset only when the picker opens) |
| Calendars, year grids, month / year lists | One tab stop with arrow keys (± rows, Home / End, Page Up / Down); the range picker is one tab stop across months; disabled days never take focus |
| Time picker | Period selector is a radio group with arrow keys; the dial announces "7 o'clock" / "30 minutes" (Compose strings); out-of-range times are clamped |
| Sheets | Content drags stay with the content (text fields, sliders, `[data-m3-no-drag]` — the escape hatch, set by Carousel); the bottom-sheet handle's hit target is 48 × 36 centred on it (Compose's minimum interactive size) |
| Carousel | Supports right-to-left; renders its slides before it has measured (SSR) |
| Toolbars | Text fields keep their arrow keys; arrows mirror in RTL; the bottom app bar roves like a toolbar and is `inert` while scrolled away |
| Search view | Focus moves into the view from the bar and back to it on close; Tab stays inside the full-screen view; `onOpenChange` |
| Swipeable list item | Keyboard path: ArrowLeft reveals the actions and focuses the first, ArrowRight / Escape hides them |
| FAB menu | Focus moves to the first item, one tab stop (roving), Escape returns to the toggle |
| Split button | `aria-haspopup` only with a menu attached; as a menu trigger it follows the menu's state |
| Navigation | Destinations without a visible label keep it as visually hidden text (`label` or `aria-label` required) |
| Expandable item / input chip | Constant names: "Expand <label>" (with `aria-expanded`), "Remove <label>" |
| Slider | Per-thumb names (`getAriaLabel`) and value text (`getAriaValueText`); reversed ranges are ordered; ticks drawn up to 200 steps |
| Segmented / connected / radio groups | A group's `disabled` disables and draws every item disabled |

### Motion: where we knowingly differ from Compose
| Component | Compose | Ours |
|---|---|---|
| Drag slop (mouse) | touchSlop × 0.125dp / 18dp (~0.06px) | Android's 8px touch slop for every pointer — browsers report sub-pixel jitter, so a click with a 1–2px wobble became a swipe (a date click flung the month) |
| Snackbar timer | runs while visible (Android lengthens it via the accessibility manager) | pauses while hovered or focused (WCAG 2.2.1) |
| Snackbar exit | removed when the 150ms fade ends | stays in the DOM, invisible and without pointer events, until its scale spring ends (Base UI waits for every animation) |
| Rich tooltip | no click toggle; a non-persistent one closes on anchor exit; opens on keyboard focus | Base UI Popover behaviour: a click toggles it, the pointer can move into it, no open on focus |
| Checkbox check ⇄ dash | morphs | CSS `d` morph — Safari swaps without morphing |
| Split button chevron | sample spring ζ1, k1500 | default effects (ζ1, k1600), the nearest token |
| FAB menu toggle colour | Oklab lerp extrapolates during the spring overshoot | `color-mix` clamps to 0–100% |
| Button group press-to-widen | rounds device px | whole CSS px (Chrome snaps box sizes anyway) |
| Elevation when re-enabled | snaps | plays the 120 / 150ms out tween |
| Segmented list | outer corners morph with the item shape | outer 16px corners hold in every state (the kit's clipping frame); a dragged item's shadow is clipped inside it |
| List swipe | no three-state reveal (SwipeToDismissBox: 56dp / 125dp/s, 300ms FastOutSlowIn settle) | those rules between closed and revealed; the kit's full-swipe action is kept |
| Navigation rail morph | label x truncated to whole px | continuous, so the end frames meet the kit exactly; a collapsed rail without labels snaps; header / FAB container switch at the start of the morph |
| Two-row app bar | lerps surface → container; consumes nested scroll | colour mixes with transparent (the kit's flat bars have no fill); `scrollTarget` pads the scroller by the collapsed amount so content moves 1:1 with the bar edge |
| Tabs, first centring | on first layout | waits for web fonts (late fonts move the target) |
| Floating toolbar | balanced padding animates on default effects; the bar itself drags / flings in exitAlways | no balanced padding (our 48px targets have no asymmetric insets — Compose adds 0 for them); scroll-driven exitAlways only |
| Circular flat progress, gap near 0% | gap = min(sweep, gap) | the 8dp gap opens over the first 25° of sweep (the kit's 10% frame: 25° arc with the full 40° gap) |
| Circular wavy amplitude | flat ≤10% and ≥95% | flat only below 10% (the kit draws 10% / 100% wavy) |
| Circular indeterminate timing | keyframes attach each easing to the keyframe after the move, so at runtime the arc grows linearly and the 90° spins run linear over 300ms | Material Components Android's M3 Expressive timing, which m3.material.io's spec video shows: growth and shrink both Standard-eased over 3s, spins Standard-eased over 500ms (fitted to the video: 3.7° rms sweep / 1.6° rotation vs Compose 35.7° / 4.1°). The video's longest arc measures ~0.80 of the circle where both implementations say 0.87 — we keep 0.87 |
| Linear progress at 100% | — | the kit's length formula ends at W−6 just below 100% but W−2 at 100%, so the active indicator jumps 4px as an animation lands on 100% (known, not yet fixed) |

## Shapes
`<Shape shape="cookie9Sided" />` draws the kit's exact vector. `<MorphingShape shape={…} />` springs
between shapes using the AndroidX morph algorithm (ported in `src/shapes/graphics`, all upstream tests
included) on polygons built **from the Figma paths** — Compose's own MaterialShapes differ from the kit by
up to 3.6% of area (pentagon, boom, triangle, square corners…), so they are not used for rendering. Morph
endpoints match the Figma outlines to ≤ 0.07% of area; at rest the exact Figma path is drawn. Demo:
`/demo/shapes`.
