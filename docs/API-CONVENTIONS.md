# @m3x/react — public API conventions

Every component follows these rules. New components must; deviations need a written reason in the
component's doc comment. Decided 2026-10-07 (phase 5 of the production refactor; breaking changes
approved while the package is unpublished — see MIGRATION.md).

## 1. Components and refs
- Plain function components with React 19 **`ref` as a prop** — no `forwardRef`.
- `ref` is typed to the **root DOM element** (`Ref<HTMLButtonElement>` for buttons, `Ref<HTMLDivElement>`
  for containers…). Compound / popup components document which element gets the ref.
- Named exports only. Every component exports its props type as `XProps`.

## 2. Props passthrough and styling
- Every component accepts the remaining **native props of its root element** and spreads them there
  (`id`, `data-*`, `aria-*`, DOM event handlers), so any component can be a tooltip / menu trigger or a
  form participant. Popups spread onto the popup element; this is documented per component.
- Styling overrides: **`sx?: StyleXStyles`** on the root. No `className` / `style` props (they are omitted
  from the native props: `Omit<…, 'className' | 'style'>` via the shared `SxProps` helper).

## 3. State props
Every piece of user-changeable state is **controllable**: `x` (controlled), `defaultX` (uncontrolled
initial value), `onXChange(next, details?)`. Controlled means the prop is not `undefined` — `null` is a valid
controlled value ("no date"). Use `hooks/useControllableState`.

| Meaning | Props | Components |
|---|---|---|
| A value | `value` / `defaultValue` / `onValueChange(value, details?)` | Tabs, Slider, TextField, SegmentedButton, ConnectedButtonGroup, RadioGroup, NavigationBar / Rail, date & time pickers, MenuRadioGroup, search |
| On / off (form-like) | `checked` / `defaultChecked` / `onCheckedChange` | Checkbox, Switch, MenuCheckboxItem |
| On / off (toggle button) | `pressed` / `defaultPressed` / `onPressedChange` | ToggleButton, ToggleIconButton (Base UI Toggle) |
| Selection look (M3 term) | `selected` / `defaultSelected` / `onSelectedChange` | Chips (FilterChip…), list items |
| Disclosure (shows / hides content) | `open` / `defaultOpen` / `onOpenChange(open, details?)` | Dialog, sheets, Menu, FabMenu, tooltips, ExpandableListItem, SplitButton menu, search view, modal pickers |
| Layout state (not disclosure) | `expanded` / `defaultExpanded` / `onExpandedChange` | Toolbar, ExtendedFab, NavigationRail |

- The new value is the first callback argument; Base UI's event `details` (reason, event, cancel) are
  forwarded as the second where Base UI provides them.
- DOM events use React's handler types (`onClick?: MouseEventHandler<HTMLButtonElement>`), never `() => void`.

## 4. Vocabulary
| Prop | Means | Values |
|---|---|---|
| `variant` | visual style family | e.g. `filled` `tonal` `outlined` `elevated` `text`; `standard` `vibrant` (menus, toolbars); `primary` `secondary` (tabs); `standard` `segmented` (lists) |
| `color` | a colour role | camelCase token names: `primary`, `primaryContainer`, `secondaryContainer`, `tertiary`, … |
| `size` | component scale | `xsmall` `small` `medium` `large` `xlarge` (each component accepts its subset) |
| `shape` | corner shape | `round` `square`; progress: `flat` `wavy` (the M3 spec's "shape") |
| `layout` | arrangement | `floating` `docked` (toolbar), `vertical` `horizontal` (navigation item), carousel layouts |
| `orientation` | axis | `horizontal` `vertical` |
| `density` | baseline density | `0` `-1` `-2` `-3` |
| booleans | orthogonal modifiers | `disabled`, `elevated` (chips: elevation is independent of the chip type) |

`type` is not used for styling props (it collides with the HTML attribute).

## 5. Triggers and content
- A component that opens a popup takes its trigger as **`trigger`** (an element that accepts `ref` and props)
  and the popup content as **`children`**: `Menu`, `RichTooltip`.
- A component that wraps its trigger takes it as **`children`** with the popup text as a prop: `Tooltip`
  (`content`).

## 6. Text and accessibility
- Built-in strings ("Close sheet", "Previous month", "Select date"…) come from **`M3Provider labels`**
  (English defaults) and can be overridden per component with a `labels` prop. No hard-coded English in
  components.
- Icon-only controls require `aria-label` (enforced in the props type).
- Names stay constant; state goes in ARIA state attributes (`aria-expanded`, `aria-pressed`…).

## 7. Testing hooks
Static visual states come only from `@m3x/react/testing` (`ForceState`). No public prop exists only for
tests.
