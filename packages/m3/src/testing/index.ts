export { ForceState, ForceStateBoundary, useForcedState } from './ForceState.tsx';
export type { ForcedState, ForceStateValue, ForcedProgressFrame, ForcedPosition } from './ForceState.tsx';

// Static building blocks the kit's state sheets draw outside their containers (docs/API-CONVENTIONS.md §7).
// One section per component family, so additions don't collide.

// — Actions, bars, communication (buttons, chips, toolbar, tabs, search, snackbar…)

// — Lists, menus, navigation, surfaces
export { SwipeActions } from '../components/List/SwipeActions.tsx';
export type { SwipeActionsProps } from '../components/List/SwipeActions.tsx';
export { swipeOffset } from '../components/List/swipeGeometry.ts';
export { MenuScope } from '../components/Menu/Menu.tsx';
export type { MenuScopeProps } from '../components/Menu/Menu.tsx';

// — Selection, pickers, inputs, media
export { CalendarDay, PickerMenuButton, YearChip } from '../components/DatePicker/cells.tsx';
export type {
  CalendarDayKind,
  CalendarDayProps,
  PickerMenuButtonProps,
  YearChipProps,
} from '../components/DatePicker/cells.tsx';
export { CalendarMonth } from '../components/DatePicker/CalendarMonth.tsx';
export type { CalendarMonthProps } from '../components/DatePicker/CalendarMonth.tsx';
export { DockedCalendar } from '../components/DatePicker/DockedDatePicker.tsx';
export type { DockedCalendarProps } from '../components/DatePicker/DockedDatePicker.tsx';
export { DateInputPanel } from '../components/DatePicker/DateInput.tsx';
export type { DateInputPanelProps } from '../components/DatePicker/DateInput.tsx';
export { ClockFace, ClockNumber } from '../components/TimePicker/ClockFace.tsx';
export type { ClockFaceProps, ClockNumberProps } from '../components/TimePicker/ClockFace.tsx';
export { PeriodSelector, TimeField, TimeSelector, TimeSeparator } from '../components/TimePicker/parts.tsx';
export type {
  Period,
  PeriodSelectorProps,
  TimeFieldProps,
  TimeSelectorProps,
  TimeSeparatorProps,
} from '../components/TimePicker/parts.tsx';
