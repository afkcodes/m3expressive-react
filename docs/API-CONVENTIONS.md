# @m3x/react — public API conventions

Every component follows these rules. New components must; deviations need a written reason in the
component's doc comment. Decided 2026-10-07 (phase 5 of the production refactor; breaking changes
approved while the package is unpublished — see MIGRATION.md). The phase 5 audit's open questions were
settled the same day; the decisions are folded in below.

## 1. Components and refs
- Plain function components with React 19 **`ref` as a prop** — no `forwardRef`.
- `ref` is typed to the **root DOM element** the component actually renders (`Ref<HTMLButtonElement>` for buttons,
  `Ref<HTMLSpanElement>` for Base UI's Checkbox / Radio / Switch roots, `Ref<HTMLDivElement>` for containers…).
- **Popups** (Dialog, sheets, Menu, tooltips, modal pickers, search view): `ref`, native props and `sx` all go to
  the **popup element** (the surface the user sees), never to an inner part.
- Exception, documented on the component: **TextField** puts `ref` and the native input props (including
  `onChange`) on the `<input>` — what form libraries expect — and `sx` on the root.
- Named exports only. Every component exports its props type as `XProps`.

## 2. Props passthrough and styling
- Every component accepts the remaining **native props of its root element** and spreads them there
  (`id`, `data-*`, `aria-*`, DOM event handlers), so any component can be a tooltip / menu trigger or a
  form participant. Popups spread onto the popup element (§1).
- Styling overrides: **`sx?: StyleXStyles`** on the root. No `className` / `style` props (they are omitted
  from the native props: use the shared `SxProps<ComponentPropsWithRef<'el'>>` helper from `primitives/types.ts`,
  which also brings `ref`).
- A prop name that collides with a native attribute (`title`, `content`, `color`, `onChange`) is renamed, not
  shadowed: see §4 (`headline`) and §5 (`Tooltip content` omits the native one).

## 3. State props
Every piece of user-changeable state is **controllable**: `x` (controlled), `defaultX` (uncontrolled
initial value), `onXChange(next, details?)`. Controlled means the prop is not `undefined` — `null` is a valid
controlled value ("no date"). Use `hooks/useControllableState`.

| Meaning | Props | Components |
|---|---|---|
| A value | `value` / `defaultValue` / `onValueChange(value, details?)` | Tabs, Slider, TextField, SegmentedButton, ConnectedButtonGroup, RadioGroup, NavigationBar / Rail, date & time pickers, MenuRadioGroup, search |
| On / off (form-like) | `checked` / `defaultChecked` / `onCheckedChange` | Checkbox, Switch, MenuCheckboxItem |
| On / off (toggle button) | `pressed` / `defaultPressed` / `onPressedChange` | ToggleButton, ToggleIconButton (Base UI Toggle) |
| Selection look (M3 term) | `selected` / `defaultSelected` / `onSelectedChange` | Chips (FilterChip…) |
| Disclosure (shows / hides content) | `open` / `defaultOpen` / `onOpenChange(open, details?)` | Dialog, sheets, Menu, FabMenu, tooltips, ExpandableListItem, SplitButton menu, AccordionButton, PickerMenuButton, search view, modal pickers |
| Layout state (not disclosure) | `expanded` (controlled-only, see below) | Toolbar, ExtendedFab, NavigationRail |

- The new value is the first callback argument; Base UI's event `details` (reason, event, cancel) are
  forwarded as the second where Base UI provides them. `details` is optional in the type: it is absent when the
  component changes the state itself (a modal picker's own OK / Cancel). Modals type it `ModalOpenChangeDetails`.
- **Controlled-only, with a doc-comment reason**, when the component never changes the state itself:
  layout state (`expanded` on Toolbar / ExtendedFab / NavigationRail — add `defaultExpanded` / `onExpandedChange`
  only when a built-in toggle appears; hooks that drive it, like `useFloatingToolbarNestedScroll`, report
  `onExpandedChange(next)`), and display state owned by a parent (`ListItem.selected`, a standalone `Radio`'s
  `checked`).
- An exit / enter finishing is `onOpenChangeComplete(open)` (Base UI's name).
- Callbacks fired directly by one DOM event (`onRemove`, `onClose`, `onActivate`, the pickers' `onConfirm` /
  `onCancel` / `onClear` / `onModeToggle`) are typed as that event's React handler
  (`MouseEventHandler<HTMLButtonElement>`), never `() => void`. A callback that isn't a DOM event is named for the
  domain event (`ShowSnackbarOptions.action.onAction`, like `SwipeAction`), never `onClick`.

## 4. Vocabulary
| Prop | Means | Values |
|---|---|---|
| `variant` | visual style family | e.g. `filled` `tonal` `outlined` `elevated` `text`; `standard` `vibrant` `baseline` (menus); `standard` `segmented` `baseline` (lists, read by items from context); `standard` `vibrant` (toolbars); `primary` `secondary` (tabs) |
| `color` | a colour role | camelCase token names: `primary`, `primaryContainer`, `secondaryContainer`, `tertiary`, … — exception: FabMenu `color` names a Compose colour *set* (`primary` `secondary` `tertiary`), documented as such |
| `size` | component scale | `xsmall` `small` `medium` `large` `xlarge` (each component accepts its subset). FAB family: `small` (56) `medium` (80) `large` (96), the same as ExtendedFab (the deprecated 40dp small FAB isn't in the kit). Free sizes with no M3 scale (Avatar, Shape, MorphingShape) take a number (px) |
| `shape` | corner shape | `round` `square`; progress: `flat` `wavy` (the M3 spec's "shape") |
| `layout` | arrangement | `floating` `docked` (toolbar), `vertical` `horizontal` (navigation item), carousel layouts |
| `mode` | behaviour, not look | search bar `trigger` (opens a search view) / `input` (edits in place) |
| `orientation` | axis | `horizontal` `vertical` |
| `density` | baseline density | 4px per step: `0` `-1` `-2` … (each component accepts its subset: Menu `0` `-2` `-4`, SegmentedButton `0`…`-3`) |
| `headline` | a surface's title text | Dialog, sheets, cards, TopAppBar, time pickers — never `title` (native attribute) |
| booleans | orthogonal modifiers | `disabled`, `elevated` (chips: elevation is independent of the chip type) |

- `type` is not used for styling props (it collides with the HTML attribute).
- **Every multi-word string value is camelCase**: `primaryContainer`, `multiBrowse`, `centeredHero`, `fullScreen`,
  `railHorizontal`.

## 5. Triggers and content
- A component that opens a popup takes its trigger as **`trigger`** (an element that accepts `ref` and props)
  and the popup content as **`children`**: `Menu`, `RichTooltip`.
- A component that wraps its trigger takes it as **`children`** with the popup text as a prop: `Tooltip`
  (`content`; the native `content` attribute is omitted from its props).
- Exception: `Submenu` is itself a menu item — its `children` are its label (like `MenuItem`) and its popup
  content is `items`.

## 6. Text and accessibility
- Built-in strings ("Close sheet", "Previous month", "Select date"…) come from **`M3Labels`** via `useLabels()`
  (`M3Provider labels` app-wide, English defaults) and can be overridden per component with a `labels` prop of
  type `Partial<M3Labels>`. No hard-coded English in components; no component-local label shapes.
- Icon-only controls require `aria-label` (enforced in the props type). Components that take a name use
  `aria-label` (Shape / MorphingShape included), never a custom `label` prop for it.
- Names stay constant; state goes in ARIA state attributes (`aria-expanded`, `aria-pressed`…).
- Verb + item names (InputChip remove, ExpandableListItem expand): the button's `aria-label` is the verb label
  (`remove: 'Remove'`) and `aria-labelledby` = "<self> <visible label>". Languages with a different word order
  override per item with `aria-label`.

## 7. Testing hooks
- Static visual states come only from `@m3x/react/testing`: `ForceState` (`state`, `focusRing`, `ripplePath`,
  `thumb`, `caret`, `progress`, `selected`, `position`) and the static building blocks the kit's state sheets draw
  outside their containers (the `*Scope` providers, `ChipAvatarPlaceholder`, `SwipeActions`, picker cells and dial
  parts). No public prop exists only for tests.
- Documented static **surfaces** stay public with conforming APIs: `MenuSurface`, `PlainTooltipSurface`,
  `RichTooltipSurface`, `DialogSurface`, `Snackbar`, standard `BottomSheet` / `SideSheet`.
- `today` on the date pickers is public: "the day treated as today (default: the device date at mount)" — apps
  rendering in a server time zone need it.

## 8. Entry points
- `@m3x/react` — components, `M3Provider`, labels, `typescale`, `Shape`, `MorphingShape`, `materialShapes`.
- `@m3x/react/primitives` — `StateLayer`, `stateLayerHost`, `Ripple`, `focusRing`, `textBox` (for custom components).
- `@m3x/react/shapes` — the shape engine (`figmaShapes`, `SHAPE_FRAME`, `Morph`, `RoundedPolygon`, `CornerRounding`,
  morph helpers).
- `@m3x/react/motion`, `@m3x/react/dynamic-color`, `@m3x/react/testing`, `@m3x/react/fonts.css`.
- Every `index.ts` lists its exports explicitly — no `export *` (it leaks internals).
