# M3 Expressive component library — working rules

React 19 + **Base UI** (behaviour, a11y) + **StyleX** (styling). The brief from the owner:
every component is a **100% pixel-to-pixel match of their Figma file** — not "close", not
"inspired by". Geometry exact, colour exact, type exact, motion per M3 physics. Every claim of
parity is backed by a measurement in `pnpm test:visual`; nothing is "done" by eye.

Figma file: **Material 3 Design Kit (owner's copy)**, key `uqYw0ZfySs2OjkqqjYwPPP`.
Pages done: Styles (tokens), Shape, Badges, Buttons (core 5, icon buttons, toggle buttons, toggle icon buttons, split button, FAB + extended FAB, FAB menu, standard + connected button groups, segmented button) — the whole Buttons page., Cards, Checkboxes.
Still queued from Buttons (55141:14168): toggle buttons, toggle icon buttons, FAB, extended FAB,
FAB menu, split button, button groups.

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
  threshold 0.001 reproduces Google's published web durations. Never edit `motion.stylex.ts`.
- Interruptible / gesture motion: `animateSpring` (rAF, keeps velocity on retarget, like Compose).
- Motion scheme swap per subtree: `M3Provider motionScheme` (+ `MotionSchemeContext` for JS).
- Reduced motion: spatial durations → 0 (CSS var + `useSpringToken` returns null); effects stay.
- Press shape morph: radius → 8 (XS/S) / 12 (M) / 16 (L/XL) on `:active`, fast-spatial spring.
- Ripple (`primitives/Ripple.tsx`): Compose `RippleAnimation` — start r = 0.3·max(w,h), end r =
  ½·diagonal + 10, fade-in 75ms linear, radius 225ms FastOutSlowIn, origin→centre 225ms, fade-out
  150ms after release; peak alpha = pressed opacity.
- Shape morph (`shapes/`): static shapes are the **exact Figma paths**; morphs use the AndroidX
  graphics-shapes port on polygons built **from the Figma paths** (Compose's MaterialShapes differ
  from the kit by up to 3.6% area — never render them). At rest draw the Figma path; interrupting
  restarts from the current outline.

## 6. Interaction states
- State layer = content colour at **8% hover · 10% focus · 10% pressed · 16% dragged**
  (`interaction.layerOpacity`/`layerColor` vars; `<StateLayer/>` reads them).
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
- Focused variants that show a focus indicator outside the frame don't clip, so their shadows
  have no spread (`levelNNoSpread`) — cards, FABs. Check every Focused variant's shadow.

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
6. **Build** the component; **fixture** every variant (`apps/workbench/src/fixtures/<c>.fixtures.tsx`,
   keys == ref names) using the real components and the kit's exact assets (icons from the SVG).
7. **Run** `pnpm test:visual -g <c>`; diagnose each failure with side-by-side + zoom + pixel
   values before changing anything; fix the cause, not the threshold.
8. **Live** behaviour checks for interactive components; **playground** `/demo/<c>`.
9. **Report** honestly: counts, exceptions with reasons, kit deviations, browser limits.

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
