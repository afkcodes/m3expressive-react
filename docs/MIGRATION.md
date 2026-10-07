# Migration notes

The package is unpublished (`0.0.0`); these are the breaking changes made while normalising the API
(docs/API-CONVENTIONS.md), so existing app code can be updated in one pass.

## 0.0.0 → next (production refactor, 2026-10)

### Behaviour (no code change needed)
- Static `MenuSurface` rows are presentational: no `menuitem` roles, no click handling. Use `Menu` for an
  interactive menu.
- Rich tooltips dismiss when the pointer leaves the trigger and the tooltip; pass `persistent` for the old
  "stays until Escape / outside click" behaviour.
- Drag gestures (sheets, carousel, date-picker month swipe, time-picker dial, swipeable list items) start after
  8px for every pointer type; presses on text entry, sliders or `[data-m3-no-drag]` content never start one.
- Dynamic colour moved to `@m3x/react/dynamic-color`; `M3Provider` takes the generated scheme as `colors`.

### API renames
_Filled in as phase 5 lands: one line per change — old → new, with a find/replace hint._

- Entry points: `StateLayer`, `stateLayerHost`, `Ripple`, `focusRing`, `textBox` → `@m3x/react/primitives`;
  `figmaShapes`, `SHAPE_FRAME`, `RoundedPolygon`, `CornerRounding`, `Morph`, `createShapeMorph`, `shapePolygon`,
  `shapeMorphPath` → `@m3x/react/shapes` (change the import path; names are unchanged).
- `Shape` / `MorphingShape`: `label` → `aria-label` (find `label=` on those tags); both take `ref` (the `<svg>`).
