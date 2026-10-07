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

#### Selection controls, inputs, media
- `Checkbox` / `Radio` / `Switch`: `forwardRef` → `ref` prop typed `Ref<HTMLSpanElement>` (Base UI's root). `Switch` was
  typed `HTMLButtonElement` — fix any `useRef<HTMLButtonElement>` used for a switch.
- `TextField`: the native `onChange` is accepted again and reaches the `<input>` (with `ref` and the other input props;
  `sx` styles the root). `onValueChange(value)` → `(value, details)` — existing callers are unchanged.
- `Slider` / `RangeSlider`: native props go to the root; `onValueChange` / `onValueCommitted` gain a `details` argument.
- `CardMedia` `blend="luminosity"` → `imageSx={styles.luminosity}` with `{ mixBlendMode: 'luminosity' }` (find `blend=`).
- `CardHeadline` `title` / `subtitle` → `headline` / `subhead` (find `<CardHeadline`).
- `Carousel` `layout`: `'multi-browse'` → `'multiBrowse'`, `'center-hero'` → `'centeredHero'`, `'multi-aspect'` →
  `'multiAspect'`, `'full-screen'` → `'fullScreen'`; `initialItem` → `defaultItem`.

#### Date and time pickers
- Every picker: `onChange` → `onValueChange` (find `onChange={` on `*DatePicker`, `*DateRangePicker`, `*TimePicker`,
  `TimeInput`); `value` is optional and `defaultValue` exists. `DatePicker` adds `defaultMonth` / `defaultView`;
  `TimePicker` adds `defaultSelection` (`TimePickerSelection`).
- `TimePicker` / `TimeInput` / `ModalTimePicker`: `title` → `headline`.
- `labels`: the pickers' own label objects become `Partial<M3Labels>` — `confirm` → `ok`, `previous` / `next` →
  `previousMonth` / `nextMonth`, `mode` → `switchToInput` (dial, calendar) / `switchToCalendar` (date input) /
  `switchToClock` (time input).
- `ModalDatePicker` / `ModalDateRangePicker` / `ModalTimePicker`: `sx`, `ref` and native props style / reach the dialog
  popup (`sx` used to reach the inner surface); `open` is optional, `defaultOpen` is new, `onOpenChange(open, details?)`.
- `DockedDatePicker`: `sx` styles the field wrapper (it used to reach the popover calendar); new `open` /
  `defaultOpen` / `onOpenChange` for the popover.
- Time selectors are named "Hour" / "Minute"; the digits are their accessible description (was "Hour 3").
- Moved to `@m3x/react/testing` (change the import path): `CalendarDay`, `YearChip`, `PickerMenuButton`,
  `CalendarMonth`, `DockedCalendar`, `DateInputPanel`, `ClockFace`, `ClockNumber`, `PeriodSelector`, `TimeField`,
  `TimeSelector`, `TimeSeparator` (+ their props types and `CalendarDayKind`). In testing: `ClockFace` / `DockedCalendar`
  `onChange` → `onValueChange`; `PeriodSelector` `pm` / `onChange(pm)` → `value: 'am' | 'pm'` / `onValueChange`;
  `DateInputPanel` `value` / `end` / `onChange` / `onEndChange` → `defaultValue` / `onValueChange` (a `DateRange` with `range`).
- No longer exported (internal): `monthWeeks`, `sameDay`, `inputFormatHint`, `parseInputDate`, `DATE_PICKER_ICONS`.

#### Lists, menus, navigation, surfaces
- `<List type="…">` → `<List variant="…">`; List / ListItem `variant="expressive"` → `"standard"` (or drop it),
  `"baseline"` unchanged; type `ListItemVariant` → `ListVariant` (`'standard' | 'segmented' | 'baseline'`).
- `ListItemImage` / `ListItemVideo` `expressive={false}` → remove (the item's or list's variant decides);
  `ListItemImage` `selected` → remove (it follows the enclosing ListItem; a static image uses `<ForceState selected>`).
- `ExpandableListItem` `expanded` / `defaultExpanded` / `onExpandedChange` → `open` / `defaultOpen` /
  `onOpenChange(open, details)`; `toggleLabel="X"` → `labels={{ expand: 'X' }}`; `sx` now styles the root, not the header row.
- `AccordionButton` `expanded` → `open`; `forcedState` removed (wrap in `<ForceState state>`); `className` / `style` → `sx`.
- `SwipeActions` (+ `SwipeActionsProps`), `swipeOffset` → `@m3x/react/testing`; `swipeLayout` is no longer exported.
  `SwipeableListItem` gains `defaultRevealState`.
- `MenuItem` `active` → `<ForceState state="hovered">` (testing); `MenuScope` → `@m3x/react/testing`. Menu `ref` and
  native props reach the popup; `MenuItem` `onClick` is a `MouseEventHandler<HTMLDivElement>`; Menu / MenuCheckboxItem /
  MenuRadioGroup / Submenu callbacks get Base UI details second (not breaking). `Submenu` gains `open` / `defaultOpen` /
  `onOpenChange`.
- `NavigationBar` `itemLayout` → `layout`; `NavigationRail` `type` → `layout` (`'docked' | 'floating'`);
  `NavigationItemLayout` drops `'rail-horizontal'`; `NavigationItem` `selected` → removed (a static item uses
  `<ForceState selected>`); `NavigationScope` → `@m3x/react/testing`. `NavigationBar` / `NavigationRail` gain
  `defaultValue` — without `value` they are now uncontrolled (the selection follows clicks).
- `Dialog`: `open` optional with `defaultOpen`, `onOpenChange(open, details)`; `ref`, native props and `sx` reach the
  popup, which is now the surface itself (no visual change). `DialogSurface` `headlineId` / `descriptionId` removed.
- `BottomSheet` `modal` / `handleLabel` / `onHandleActivate` / `onHandlePointerDown` / `onSurfacePointerDown` /
  `contentRef` and `SideSheet` `modal` / `headlineId` removed: use `ModalBottomSheet` / `ModalSideSheet` (the static
  modal look is `BottomSheetSurface` / `SideSheetSurface` in `@m3x/react/testing`).
- `ModalBottomSheet` / `ModalSideSheet`: `open` optional with `defaultOpen`, `onOpenChange(open, details?)` (a drag or
  the handle pass no details); `sx` styles the popup (the bottom sheet's full-width strip; the side sheet's surface);
  the handle's name is `labels={{ closeSheet }}`.

#### Actions, bars, communication
- Every component: `forwardRef` → React 19 `ref` prop; `Button` / `IconButton` refs are `HTMLButtonElement` (were
  `HTMLElement`) — retype `useRef<HTMLElement>` used on them.
- `Fab` / `ExtendedFab` `color`: `'primary-container'` / `'secondary-container'` / `'tertiary-container'` →
  `'primaryContainer'` / `'secondaryContainer'` / `'tertiaryContainer'` (grep `-container'`). `Fab` `size="default"` →
  `"small"` (type `FabSize`).
- `FabMenu` `closeLabel` removed: the toggle keeps its `aria-label` while open (state in `aria-expanded`) — queries for
  "Close menu" use the menu's name. `FabMenuItem` `keepOpen` → `closeOnClick={false}`.
- `SplitButtonTrailing` `expanded` / `defaultExpanded` / `onExpandedChange` → `open` / `defaultOpen` / `onOpenChange`.
- `ConnectedButtonGroupItem` standalone `size` / `selected` and `SegmentedButtonItem` standalone `position` /
  `selected` / `density` removed: standalone items use `pressed` / `defaultPressed` / `onPressedChange`; static
  renderings use `ConnectedButtonGroupScope size` + `<ForceState selected position>` from `@m3x/react/testing`.
  `ConnectedButtonGroup` / `SegmentedButton` / `Tabs` / chips' `on…Change` get Base UI details second (not breaking).
- `FilterChip` `trailingIcon` → `dropdown`. `InputChip` `removeLabel` → `labels={{ remove: '…' }}` (the verb);
  `onRemove` is a `MouseEventHandler<HTMLButtonElement>`. `ChipAvatarPlaceholder` → `@m3x/react/testing`.
- `Toolbar` `type` → `layout`; `Toolbar` / `ToolbarScope` `color` → `variant` (type `ToolbarColor` → `ToolbarVariant`);
  `ToolbarScope` → `@m3x/react/testing`; `useFloatingToolbarNestedScroll({ onExpand, onCollapse })` →
  `{ onExpandedChange }`; with `fab`, `ref` is the wrapper root (was the bar).
- `TopAppBar` `title` → `headline`. `Tab` static `selected` → `<ForceState selected>`; `TabScope` → `@m3x/react/testing`.
- `SearchBar`: input mode is explicit — `mode="input"` (it was inferred from `onValueChange`); `onActivate` is a
  `MouseEventHandler`. `SearchView` `mode` → `layout` (`'full-screen'` → `'fullScreen'`), `onDismiss` →
  `onOpenChange(false)`, `onCollapsed` → `onOpenChangeComplete(open)`; `value` / `onValueChange` optional with
  `defaultValue`, plus `defaultOpen` and `labels`.
- `LinearProgress` / `CircularProgress` `type` → `shape`, `'wave'` → `'wavy'` (type `ProgressType` → `ProgressShape`);
  `LoadingIndicator` `container` → `contained`.
- `Tooltip` / `RichTooltip`: new `open` / `defaultOpen` / `onOpenChange(open, details?)`; `ref`, native props and `sx`
  reach the popup (RichTooltip's `sx` used to be ignored).
- `ShowSnackbarOptions.action.onClick` → `onAction`; `Snackbar` `onClose` is a `MouseEventHandler`; `useSnackbar()`
  returns `SnackbarApi`; `SnackbarClose`'s default name is `labels.dismiss`.
- `M3Labels`: `closeMenu` and `startDate` removed (nothing reads them: the FAB menu's name is constant, and the kit's
  range input labels its first field "Date").
