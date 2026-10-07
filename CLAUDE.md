# M3 Expressive component library — working rules

React 19 + **Base UI** (behaviour, a11y) + **StyleX** (styling). The brief from the owner:
every component is a **100% pixel-to-pixel match of their Figma file** — not "close", not
"inspired by". Geometry exact, colour exact, type exact, motion per M3 physics. Every claim of
parity is backed by a measurement in `pnpm test:visual`; nothing is "done" by eye.

Figma file: **Material 3 Design Kit (owner's copy)**, key `uqYw0ZfySs2OjkqqjYwPPP`.
Pages done: Styles (tokens), Shape, Badges, Buttons (all: core 5, icon, toggle, toggle icon, split, FAB + extended, FAB menu, standard + connected groups, segmented), Cards, Checkboxes, Radio button, Switch, Dividers, Chips, Tooltips, Snackbar, Loading & progress (linear, circular, loading indicator), Sliders (standard, centered, range), Text fields (filled, outlined), Lists (expressive: standard, segmented, expandable, swipeable, dragged; baseline), Menus (expressive standard / vibrant with groups, section labels, selection, submenus; baseline with densities), Tabs (primary / secondary, fixed / scrollable), Navigation (bar with vertical / horizontal items, rail collapsed / expanded with sections), App bars (top small / centred / medium / large with scroll behaviour, bottom app bar), Search (bar with
hover / press / avatar, docked and full-screen views), Toolbars (floating horizontal / vertical and
docked, standard / vibrant, toolbar-coloured building blocks, FAB collapse), Sheets (side standard / modal,
bottom standard / modal with drag to dismiss), Dialogs (basic, list, scrollable list; with / without icon), Carousel (multi-browse, hero,
centred hero, uncontained, multi-aspect, full screen; Compose keyline motion), Date pickers (modal day / year /
input, docked day / month / year, full-screen range), Time pickers (dial vertical / horizontal,
12 / 24 hour, keyboard, clock faces, period selectors). All pages done except XR and the deprecated
navigation drawer (out of scope).

---

## 1. Definition of done (a component is not finished until all hold)
1. Every Figma variant has a fixture and a reference, and **`pnpm test:visual` passes** for it.
2. **Node size exact** (CSS px) and **layer boxes within 0.015px** (Figma's 3-decimal export
   precision) for every mapped layer.
3. **0 drift pixels**, or a per-variant `allowedDiffPixels` + `allowedDiffReason` in the manifest
   that names the measured cause (never a vague "rendering differences").
4. **Live behaviour verified** where the kit draws states: real hover / keyboard focus / held
   press compared against the Figma state variants (`tests/visual/interaction.spec.ts`).
5. Light + dark render from tokens (no hardcoded colours); reduced motion respected.
6. A playground page at `/demo/<component>` so the owner can try the real thing.
7. README "kit deviations" table updated for any place we knowingly differ from the kit.

## 2. How parity is measured (`tests/visual/`)
- References are Figma exports at **2x**; the suite renders fixtures in Chromium at
  deviceScaleFactor 2 and captures the identical render bounds (device-pixel exact; Playwright
  rounds clips to whole CSS px, so `captureRegion` cuts the exact rectangle itself).
- Both images are flattened onto the **Figma background the node sits on** (manifest `background`).
- Each mismatched pixel is classified (`compare.ts`):
  - **AA** — pixelmatch's anti-aliasing detector.
  - **glyph-edge raster** — high-contrast edge (3×3 range ≥ 64) in both, Δ ≤ 48/255; or any visible
    edge (range ≥ 16) with Δ ≤ 24/255 **and an opposite-signed neighbour** (coverage moved between
    pixels). A uniform colour/paint-order change shifts every pixel the same way and is NOT raster.
  - **flat drift** — uniform areas (range ≤ 1 in both) must match within **±2** per channel;
    smooth gradients (shadows, range < 8) within **5/255**.
  - **drift** — everything else. Target 0.
- Exceptions are explicit per variant and must cite a measurement. Prefer fixing; when an
  exception is unavoidable say why (renderer kernel, kit slip, export contamination…).
- Never loosen a global tolerance to make one case pass without proving it can't hide a real
  systematic difference (that has happened once — the sign-check rule exists because of it).

## 3. Figma rendering rules we reproduce (all measured against the kit)
| Rule | Where it lives |
|---|---|
| Auto-width text box = **ceil(advance − trailing letter-spacing)** | `primitives/textBox.ts` (`textBox.hug`, needs `calc-size()`, Chromium; others ≤ 1px wider) |
| Baseline = **round((LH − (asc+desc)·size)/2 + asc·size)** with exact metrics; Chrome rounds per-metric | `fonts.css` `ascent-override 98.32% / descent-override 29.41%`, locked by `baseline.test.ts` |
| Drop shadows: Chrome spreads a blur value wider than Figma | CSS blur = Figma blur **× 0.92**, alpha **× 1.03** (`gen-tokens.ts`, fitted on the elevation specimens) |
| **No shadow spread on frames that don't clip content** | `elevation.levelNNoSpread` tokens (e.g. focused card) |
| Non-clipping frame paints the state layer **over** its outline | card focused state (`cardVars.strokeZ`) |
| Strokes are **INSIDE** by default and don't affect layout | `::after` border overlays, never CSS `border` on layout boxes |
| Kit cards stack content **above** the background layer (fill, outline, state layer) | card outline at z −1: media covers it |
| Media placeholder art uses a **luminosity** blend over surface-container-high | `CardMedia blend="luminosity"` |
| `Corner/Full` = 1000; "round" visuals = half the shorter side | components use the real half-size radius so press morphs animate from the true corner |
| Figma node exports are **in-context snapshots** (include set borders / neighbours' shadows) | see §8 export hygiene |

## 4. Tokens — Figma is the only source
- Snapshot: `figma/_tokens/foundations.json` (variable collections M3 / Font theme / Typescale /
  Shape + effect styles, pulled read-only with `use_figma`). `pnpm gen:tokens` generates
  `tokens/*.stylex.ts`; **never edit generated files**; `tokens.test.ts` fails if they drift.
- Colour: 49 roles, CSS `light-dark()` (set `color-scheme` on any subtree), medium/high contrast via
  `color-themes.ts` (`M3Provider contrast`). The kit's 12 hue themes + monochrome are not yet generated.
- Typescale: 15 roles × baseline/emphasized; emphasized "Bold" = **SemiBold 600**. Every role also
  sets `typeMetrics.tracking` for `textBox.hug`.
- Fonts: apps import `@m3x/react/fonts.css` (Google Fonts Roboto v51 registered as **"Roboto"**, the
  family name the kit uses, so a locally installed Roboto can't substitute).
- Never hardcode a value that exists as a token. If Figma uses a raw value, note it in code.

## 5. Motion physics (M3 Expressive)
- Springs only — `motion/tokens.ts` (Compose MotionScheme tokens, cross-checked with m3.material.io):

  | token | expressive (ζ, k) | standard (ζ, k) | use |
  |---|---|---|---|
  | fast-spatial | 0.6, 800 | 0.9, 1400 | small components: press morph, switch thumb |
  | default-spatial | 0.8, 380 | 0.9, 700 | partial-screen: sheets, rails, shape morph |
  | slow-spatial | 0.8, 200 | 0.9, 300 | full-screen |
  | fast/default/slow-effects | 1.0, 3800/1600/800 | same | colour, opacity (never overshoot) |
- **Spatial** = position, size, radius, rotation (may overshoot). **Effects** = colour, opacity.
- CSS: `motion.*Duration` + `motion.*Easing` — exact spring `linear()` curves (≤ 0.1% error) generated
  by `pnpm gen:motion` from `spring.ts` (line-for-line port of Compose `SpringSimulation`); settle
  threshold 0.001 only cuts the invisible tail (Google's published web durations 350/500/650… belong to its
  cubic-bezier approximations, not to the springs). Never edit `motion.stylex.ts`.
- Interruptible / gesture motion: `animateSpring` (rAF, keeps velocity on retarget, like Compose). It ends
  like Compose `Animatable`: after `estimateAnimationDurationMillis` (ported) with `precision` = the visibility
  threshold, then snaps — a visible overshoot plays out (LoadingIndicator morph ends at 297ms, value 1.09).
- Motion scheme swap per subtree: `M3Provider motionScheme` (+ `MotionSchemeContext` for JS).
- Reduced motion: spatial durations → 0 (CSS var + `useSpringToken` returns null); effects stay.
- Press shape morph: radius → 8 (XS/S) / 12 (M) / 16 (L/XL) on `:active`. Token per Compose: Button,
  IconButton (+ toggle) and SplitButton use **default-effects** ("intentional … to prevent any bounce",
  Button.kt); ToggleButton and connected ButtonGroup segments use **fast-spatial**. Check each component's
  source — never assume fast-spatial.
- Not everything is a scheme spring: Compose keeps fixed tweens for elevation (`tween.elevation*` /
  `elevationMotion`: 120ms FastOutSlowIn in, 120/150ms cubic(.4,0,.6,1) out), state layers (15/45ms linear)
  and the ripple. Dialogs follow MDC `m3_motion_fade` (400ms cubic(0.1,0.7,0.1,1) in, 150ms
  cubic(0.3,0,0.8,0.2) out — MDC's numbers, not the M3-web 0.05 / 0.15 ones).
- Ripple (`primitives/Ripple.tsx`): Compose `RippleAnimation` — start r = 0.3·max(w,h), end r =
  ½·diagonal + 10, fade-in 75ms linear, radius 225ms FastOutSlowIn, origin→centre 225ms, fade-out
  150ms after release; peak alpha = pressed opacity.
- Shape morph (`shapes/`): static shapes are the **exact Figma paths**; morphs use the AndroidX
  graphics-shapes port on polygons built **from the Figma paths** (Compose's MaterialShapes differ
  from the kit by up to 3.6% area — never render them). At rest draw the Figma path; interrupting
  restarts from the current outline.

- Motion implementation (each of these bit us during the 2026-10-07 Compose motion audit):
  - Gesture physics are shared ports in `motion/gesture.ts` (Lsq2 velocity tracker, slops,
    `computeAnchorTarget`, tweens / cubic-bezier, click suppression) and `motion/fling.ts` (spline decay).
  - Layout-changing motion (group widths, extended FAB width, rail morph, FAB menu) runs as `animateSpring`
    writing inline styles only while in flight and clears them at rest, so static frames stay untouched.
    Never leave a property in a CSS transition list if JS also writes it every frame.
  - Decide an entry animation once at mount (an element that mounts already-selected must not animate in).
  - rAF-driven exits must call `onOpenChange(false)` only after they finish: Base UI only waits for CSS / WAAPI.
  - A typed custom property named in `transition-property` needs a literal `'--name'` key in `defineVars`
    (StyleX keeps it unhashed) plus `stylex.types.*` so it registers as @property.
  - A colour transition a child inherits belongs on a persistent ancestor; a remounted child snaps.
  - ResizeObserver fires once on `observe()` — ignore that callback before stopping an animation.
  - Base UI positioners rewrite their inline style on every placement: derive values (menu transform origin)
    with a MutationObserver. Ignore Base UI `trigger-hover` reasons for touch / pen when a long press opens
    a popup (Chrome's synthesised mouse events reopen / close it).
  - Chrome transitions `::placeholder`; StyleX merges `::placeholder` styles per property.
  - Live motion tests: computed durations read back in seconds ("0.369s"); await `document.fonts.ready`
    before measuring text; dispatch velocity-dependent drags in-page at fixed intervals (CDP timing jitters)
    and avoid speeds right at a threshold (2px / 16ms is exactly 125px/s).

## 6. Interaction states
- State layer = content colour at **8% hover · 10% focus · 10% pressed · 16% dragged**
  (`interaction.layerOpacity`/`layerColor` vars; `<StateLayer/>` reads them).
- State-layer fades are Compose material-ripple `StateLayer` tweens, **not** motion-scheme springs:
  15ms linear, entering focus / drag 45ms (`interaction.layerDuration`, set per host condition).
- **Priority hover < focus-visible < active.** Hover lives inside `@media (hover: hover)`, which
  outranks plain pseudo-classes in StyleX — so focus/active must use the same media wrapper.
- Press semantics follow the kit per component: buttons/icon buttons = hover layer + ripple (the
  kit's Pressed variants draw both); **cards = press replaces hover** (`hostPressExclusive`; the
  kit's pressed card is a flat 10%); **checkbox = 10% pressed layer + ripple in the opposite role at
  20%, drawn over the box** (`hostPressLayer`, `Ripple above`, `interaction.rippleColor/rippleOpacity`).
- Focus indicator: 3px `secondary`, 2px outside, follows the corner radius (outline). The kit's
  default Focused variants hide it; live focus shows it (geometry asserted numerically in tests).
- Touch target ≥ 48px (XS/S buttons and icon buttons pad the root to 48).
- Disabled (kit): container on-surface 10%, content 38% opacity.
- Static states for tests come from `@m3x/react/testing` `<ForceState>` — never public props.
- A forced state reaches every descendant: composites wrap nested interactive parts (a search bar's
  icon buttons, a view's result rows) in `<ForceStateBoundary>` so only the part the kit varies shows it.

## 7. Implementation rules (StyleX + Base UI)
- Build on the matching Base UI primitive (`@base-ui/react/button`, toggle, toggle-group, …).
- Public API: `sx` (StyleX styles) instead of `className`/`style`; `forwardRef`; required
  `aria-label` where there is no visible text (IconButton).
- StyleX gotchas (each one has bitten us):
  - vars must be imported from their `.stylex.ts` file (no barrels);
  - `stylex.when.*` and `stylex.defaultMarker()` must be **inline** in the key / `props` call;
  - use **longhands** for resets (`backgroundColor`, `fontFamily`…) — shorthands lost to UA button
    styles (#EFEFEF ButtonFace behind every button);
  - a property defined in two style objects is replaced wholesale (conditions don't merge);
  - dynamic styles (`create({ box: (w, h) => (…) })`) are fine.
- Parent-state styling: `stylex.defaultMarker()` on the interactive root +
  `stylex.when.ancestor(':active' | ':focus-visible')` on inner parts.
- Labels that hug: `typescale.<role>` + `textBox.hug`. Every `<button>` root must reset
  `textAlign: 'inherit'` (and font size / line height / letter spacing): the hug box is rounded up
  to whole px and the UA's centred text shifts the glyphs by the remainder (FAB labels were 0.25px
  right until fixed). Reuse `buttonStyles.base.root` where possible.
- Parts that must paint under a sibling (split button shadows) can't live inside an isolated
  root: give the group `isolation: isolate`, set the parts to `isolation: auto`, z-index -1 casters.
- `stylex.when.*` inside a helper *function* also fails at runtime (not just a hoisted const) —
  repeat the condition object inline per property.
- Equal-width layouts: `gridAutoColumns: 'minmax(0, 1fr)'` (plain `1fr` won't shrink below
  min-content, so a kit width 1px under the content shifts every segment).
- Figma **legacy line height**: some older kit text layers (snackbar, list supporting text) put
  the first baseline at ascent × size (14/20 → 13.0) instead of half-leading + ascent (≈14.83 in
  CSS); compare glyph outlines from an SVG export when text sits ~2px off, then apply
  `legacyLeading.shift(size, lineHeight)` from textBox.ts. Measured, not guessed.
- **Animated components' still frames** (progress Step variants, wave phases, loading shapes):
  freeze the real renderer at the kit's geometry through `ForceState progress={…}` (testing only);
  never fork the drawing code for tests. Derive geometry from the SVG export with scripts: find
  round caps (two cubics whose ends are `thickness` apart around a common centre), fit vector
  corner radii as circular arcs (Figma clamps a too-large radius to the shorter segment), and
  check whether the kit's numbers are a formula or hand-drawn keyframes before "fixing" them.
- **Motion comes from the Compose source**, never memory: curl
  `raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/<File>.kt`
  (+ `internal/`, `tokens/MotionTokens.kt`) and port the constants. Compose `keyframes { v at t using E }`
  eases the interval *starting* at t; the default is linear. Review with a filmstrip fixture
  (`ForceState progress={{ time }}`) before shipping.
- CSS can't nest `:has()`: state that depends on "a part containing :focus-visible" (slider thumb
  inputs) is tracked in JS (`onFocus` + `matches(':focus-visible')`).
- Fixture pages pad nodes by 32px (`FIXTURE_PADDING`); a variant whose render bounds extend further
  (slider value indicators, ~52px) declares `padding` (a capture outside the page fails with
  "bitblt reading outside image"). Chrome's raster depends on page position (tile alignment):
  changing the padding shifts shadow / AA pixels, so verify a variant at the padding it declares.
- Chrome snaps *layout* offsets to whole CSS px even at 2x (a 1px caret at x 54.5 paints at 55);
  half-pixel kit geometry (centred 1px strokes) needs `transform: translate(-0.5px)`.
- StyleX `defineVars` / `defineMarker` must be imported from their `.stylex.ts` path
  (`@m3x/react/components/<C>/<file>.stylex`), never via a re-export; after changing package
  `exports`, restart the dev server (the StyleX resolver caches it) — and a broken fixture import
  breaks every fixture page (one registry), so never run a regression while editing fixtures.
- Flex columns inside fixed-size fixture boxes shrink: give fixed-height parts `flexShrink: 0`.
- The Playwright config emulates `prefers-reduced-motion: reduce`; tests about motion must
  `page.emulateMedia({ reducedMotion: 'no-preference' })` first.
- Focused variants that show a focus indicator outside the frame don't clip, so their shadows
  have no spread (`levelNNoSpread`) — cards, FABs. Check every Focused variant's shadow.
  Generally: Figma applies drop-shadow **spread only to frames with clip content on** — read
  `clipsContent` of the shadowed frame per variant before picking `levelN` vs `levelNNoSpread`.
- Kit design-time placeholders (Slot-component, placeholder art) aren't library parts: fixtures
  show the kit's own 2x raster (`exportAsync` read-only) or blend (`mix-blend-mode: luminosity`).
- Chrome's ellipsis (`line-clamp` and `text-overflow` alike) can drop a glyph that fits by
  <0.3px where Figma keeps it — record it as a measured exception, don't chase it.
- Lifted / overlapping parts (dragged list items) need a z-index: later siblings otherwise paint
  their content over the earlier item's shadow.
- Figma's shadow for a clipping frame comes from its content's union (gaps between children show
  shadow) and keeps the spread only when the frame has a single child: multi-group menus match
  `levelNNoSpread` per group, drawn on a layer below all groups (`::before`, z-index −1).
- Chrome snaps painted box *sizes* to whole CSS px too: a 119.5px-wide box paints 120px. Kit
  geometry with half-pixel sizes (building-block frames) is drawn at 2x under `scale(0.5)`.
- Chrome paints replaced elements (svg icons) at the rounded CSS-px x while text glyphs keep
  their fractional x: an icon centred beside a label (fractional content width) lands up to
  0.5px off Figma. Verified by shifting icons by x − round(x) (0 drift) — not shipped (other
  engines snap differently); record it as a measured exception.
- To keep Figma's exact fractional position for a box centred in a fractional-width parent, make
  the parent `container-type: inline-size` and centre with `transform: translateX(calc(50cqw -
  50%))` (transforms aren't snapped; same maths in every engine) — navigation pills.
- Right-aligned hug text: Figma puts the last glyph's advance on the box edge (no trailing
  tracking) — `textEnd.trimTracking` shifts CSS's line by one tracking (transform).
- Centred text in a fixed-width box: Figma centres the advance *without* the trailing letter
  spacing (`textCentred.trimTracking`); label-medium's 0.5px tracking otherwise sits 0.25px left.
- Figma's hug text boxes are whole-pixel wide, so geometry measured from label boxes (e.g. the
  primary tab indicator) uses offsetLeft / offsetWidth, not fractional rects.
- Popups must portal into `<M3Provider>` (`usePortalContainer()`): a portal to <body> escapes the
  provider's colour scheme, contrast, motion themes and font smoothing (live text raster differs).
- Kit variants placed off the device-pixel grid (x 33.2 at 2x) can't be cropped from a frame export
  (the crop bakes in a sub-pixel offset): export those nodes individually and give each its own
  single-row frame. Check every frame's render bounds too — an overflowing child moves the export
  origin (toolbars: −0.5px → `origin`).
- Give every row its full render bounds, even far outside the node (a modal sheet's scrim): the
  builder then trims neighbours that overlap it. Fixtures whose render bounds need more room
  declare `padding`; the parity spec grows the viewport to the measured capture area.
- Figma strokes don't take auto-layout space: draw header / footer rules as inset box-shadows, not
  borders (a 1px border moved the date picker's header button).
- A fixture that never mounts (`[data-fixture-node]` not found) is usually a module-init error —
  e.g. a circular import evaluated before a spread constant; keep shared constants in leaf modules.
- A fixed-size fixture box can hide a component's natural size (a 72px bar stretched to the kit's
  64px passed until it sat in an auto-height parent): probe natural geometry in a live render.
- Intrinsic-size collapse (toolbar leading / trailing, toolbar into its FAB): a `grid-template-columns`
  0fr ⇄ 1fr track with a `min-width: 0` child animates on the spring tokens without measuring.
- Never nest interactive elements: when the kit draws a clickable surface around icon buttons (search
  bar), make the text a real `<button>` stretched over the surface (`::after`, inset 0), lift the icon
  slots above it (z-index 1), host the ripple on that button and show its focus on the surface with
  `:has(...:focus-visible)`.

## 8. Per-component procedure (Figma → code → proof)
1. **Survey** the page read-only (`use_figma`): sections, component sets, variant properties.
2. **Spec** every variant programmatically (padding, gap, radius, fills + variable names, strokes,
   effects, text styles, icon sizes, opacity) — compact rows, not screenshots. Look for patterns
   and **kit slips** (one variant bound to a different variable).
3. **Export** each component set once at 2x (`download_assets`) → `figma/<c>/_frames/`; also SVG when
   icons / ripple blobs / vectors are needed (extract with a script, never by eye).
4. **Manifest** — never hand-write it. Pull compact variant rows read-only (`key nodeId x,y wxh [rbX,Y,W,H]`,
   positions relative to the set; one set per `use_figma` call — results over 20 kB are truncated;
   recover rows from the session transcript rather than re-typing them), write
   `figma/<c>/spec.json` (frames, rows, `rename` → ref names, `exceptions`), then
   `python3 -I scripts/build-manifest.py figma/<c>/spec.json` and `pnpm figma:crop <c>`.
5. **Export hygiene** is automatic in the builder: exports are in-context, so every crop gets a 1px
   capture margin (AA classification needs neighbours), is trimmed where it would intersect a
   neighbour's render area (tight rows / shadows), and loses the column under the dashed set border
   when the node touches the set edge (`refNote` records each trim). Use an individual node export
   (`ref`) only when a trim would cut into the component itself.
   Always compare the export's pixel size with the node: sections / frames with effects export
   their overflow too (dividers: 557×945 section → 637×1025 PNG, origin −40,−40) — set the frame
   `size` to the PNG's css size and `origin` accordingly. Variants positioned outside a set's
   bounds aren't in its export (and may be hidden — check before referencing them).
6. **Build** the component; **fixture** every variant (`apps/workbench/src/fixtures/<c>.fixtures.tsx`,
   keys == ref names) using the real components and the kit's exact assets (icons from the SVG).
7. **Run** `pnpm test:visual -g <c>`; diagnose each failure with side-by-side + zoom + pixel
   values before changing anything; fix the cause, not the threshold.
8. **Live** behaviour checks for interactive components; **playground** `/demo/<c>`.
9. **Report** honestly: counts, exceptions with reasons, kit deviations, browser limits.
10. **Commit** the finished component as one conventional commit (component + figma refs + fixture +
    playground + docs), on the working branch; never push unless asked; no AI trailer.

## 9. Kit deviations policy
- Default: reproduce Figma exactly, including Figma's own rendering rules (§3).
- A frozen ripple is a press snapshot, not behaviour: fixtures use each Pressed variant's own blob
  (a few kit variants place it differently).
- A kit **slip** (a single variant wired to a different token than all its siblings, or a layer
  structure that only one state has) → confirm it in Figma (read the node), implement the
  consistent behaviour, record the exception in `spec.json` `exceptions` (measured pixel count +
  cause — regenerating the manifest keeps it), list it in the README deviations table, and include
  it in the end-of-batch report (the owner asked not to be interrupted per component).
- Where the kit contradicts the M3 guidelines, follow the kit and list it (owner decides).

## 10. Commands
| | |
|---|---|
| `pnpm dev` | workbench http://localhost:5199 — `/compare/<c>`, `/fixture/<c>/<variant>`, `/demo/<c>` |
| `pnpm test` | unit tests (springs, tokens sync, baseline, shapes port, morph) |
| `pnpm test:visual` | Figma parity + live interaction suites (`-g <component>` to filter) |
| `npx playwright show-report` | per-variant diff / actual images |
| `pnpm gen:tokens` · `gen:motion` · `gen:shapes` · `figma:crop <c>` | generators — never hand-edit outputs |
| `python3 -I scripts/build-manifest.py figma/<c>/spec.json` | manifest from spec rows (export hygiene + exceptions) |
| `pnpm typecheck` | TS 7 across workspace |

## 11. Org / owner rules
- Do not delete files, data or logs (bank policy) — overwrite or leave them for the owner.
- No AI attribution in commits, PRs or comments. Don't commit or push unless asked.
- Figma access is read-only for us: never modify the owner's file.
