import { forwardRef, useEffect, useRef, type MouseEventHandler, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex';
import { motion } from '../../tokens/motion.stylex';
import { state } from '../../tokens/state.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import { interaction } from '../../primitives/state.stylex';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';

/*
 * Figma kit, "Date & time pickers" building blocks (51954:18817 calendar cell, 18918 year,
 * 18957 menu button).
 *   Day: 48px cell, 40px circle; body-large date centred. Today: 1px Primary ring, Primary text.
 *   Selected: Primary circle, On Primary text. In a range: Secondary Container bands run
 *   −14.4 … 62.4px across the cell (the 48px grid joins them), On Secondary Container text; the
 *   range's start / end cells keep their Primary circle over a half band. Outside the month:
 *   On Surface 38%. Disabled: 38%. Hover 8% / focus 10% / press 10% plus the kit's Primary 16%
 *   ripple, in the content colour (range days: On Surface).
 *   Year: 88×52 cell, 72×36 pill; body-large On Surface Variant, selected title-medium On Primary
 *   on Primary. Menu button: label-large On Surface Variant + 18px drop arrow, fully rounded.
 * Motion (Compose DatePickerColors): a day's content colour animates on default effects unless the
 * day is in a range; the container fades in on default effects for the selected (start) day only
 * — deselection and range ends snap; year cells animate content and container on default effects.
 * The menu arrow flips at once (Compose rotates it without animation).
 */
const s = stylex.create({
  day: {
    position: 'relative',
    display: 'block',
    flexShrink: 0,
    width: 48,
    height: 48,
    margin: 0,
    padding: 0,
    borderWidth: 0,
    borderStyle: 'none',
    backgroundColor: 'transparent',
    outlineStyle: 'none',
    cursor: { default: 'pointer', ':disabled': 'default' },
    color: color.onSurface,
    [interaction.layerColor]: 'currentColor',
    [interaction.rippleColor]: color.primary,
    [interaction.rippleOpacity]: '0.16',
  },
  // Press shows the 10% layer under the ripple (the kit's Pressed cells).
  pressLayer: {
    [interaction.layerOpacity]: {
      default: '0',
      ':hover': { default: '0', '@media (hover: hover)': state.hoverOpacity },
      ':focus-visible': { default: state.focusOpacity, '@media (hover: hover)': state.focusOpacity },
      ':active': { default: state.pressedOpacity, '@media (hover: hover)': state.pressedOpacity },
    },
    [interaction.layerDuration]: { default: '15ms', ':focus-visible': { default: '45ms', '@media (hover: hover)': '45ms' } },
  },
  // Above the neighbouring days' range bands (a range's start / end circle stays whole).
  circle: {
    position: 'absolute',
    zIndex: 1,
    top: 4,
    left: 4,
    width: 40,
    height: 40,
    boxSizing: 'border-box',
    borderRadius: 20,
    overflow: 'hidden',
    isolation: 'isolate',
  },
  today: { borderWidth: 1, borderStyle: 'solid', borderColor: color.primary },
  // Disabled today: On Surface ring and text (at 38%), not Primary.
  todayDisabled: { borderColor: color.onSurface },
  selected: { backgroundColor: color.primary },
  // dayContainerColor(animate = startDateSelected): only entering the selected state animates.
  selectedEnter: {
    transitionProperty: 'background-color',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  // dayContentColor: animated unless in a range.
  contentAnimated: {
    transitionProperty: 'color',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  band: { position: 'absolute', top: 4, height: 40, backgroundColor: color.secondaryContainer },
  bandFull: { left: -14.4, width: 76.8 },
  bandRight: { left: 24, width: 38.4 },
  bandLeft: { left: -14.4, width: 38.4 },
  label: { position: 'absolute', zIndex: 1, top: 12, left: '50%', transform: 'translateX(-50%)', color: 'inherit' },
  todayText: { color: color.primary },
  selectedText: { color: color.onPrimary },
  rangeText: { color: color.onSecondaryContainer, [interaction.layerColor]: color.onSurface },
  // Outside the month: On Surface Variant 38% (the docked picker; its own hover / focus variants).
  outside: { color: `color-mix(in srgb, ${color.onSurfaceVariant} 38%, transparent)`, [interaction.layerColor]: color.onSurface },
  outsideActive: { color: color.onSurfaceVariant },
  dim: { opacity: state.disabledContentOpacity },
  // Year
  yearCell: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 52, minWidth: 88 },
  yearPill: {
    position: 'relative',
    isolation: 'isolate',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 36,
    margin: 0,
    padding: 0,
    borderWidth: 0,
    borderStyle: 'none',
    borderRadius: 18,
    overflow: 'hidden',
    outlineStyle: 'none',
    cursor: { default: 'pointer', ':disabled': 'default' },
    color: color.onSurfaceVariant,
    backgroundColor: 'transparent',
    [interaction.layerColor]: color.onSurface,
    // yearContentColor / yearContainerColor: default effects.
    transitionProperty: 'color, background-color',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  yearSelected: { color: color.onPrimary, backgroundColor: color.primary, [interaction.layerColor]: color.onPrimary },
  // Menu button
  menu: {
    position: 'relative',
    isolation: 'isolate',
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: 8,
    height: 40,
    margin: 0,
    paddingBlock: 10,
    paddingInline: '8px 4px',
    boxSizing: 'border-box',
    borderWidth: 0,
    borderStyle: 'none',
    borderRadius: 20,
    outlineStyle: 'none',
    cursor: { default: 'pointer', ':disabled': 'default' },
    color: color.onSurfaceVariant,
    backgroundColor: 'transparent',
    [interaction.layerColor]: color.onSurfaceVariant,
  },
  arrow: { display: 'block', width: 18, height: 18, flexShrink: 0 },
  arrowOpen: { rotate: '180deg' },
  arrowHidden: { visibility: 'hidden' },
});

export type CalendarDayKind = 'default' | 'today' | 'selected' | 'range' | 'outside' | 'empty';

export interface CalendarDayProps {
  label?: ReactNode;
  kind?: CalendarDayKind;
  /** The selected day starts (band to the right) / ends (band to the left) a range. */
  rangeStart?: boolean;
  rangeEnd?: boolean;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  'aria-label'?: string;
  'aria-pressed'?: boolean;
  'aria-current'?: 'date';
  tabIndex?: number;
  'data-date'?: string;
}

/** One day of the calendar grid. */
export const CalendarDay = forwardRef<HTMLButtonElement, CalendarDayProps>(function CalendarDay(
  { label, kind = 'default', rangeStart, rangeEnd, disabled = false, onClick, ...aria },
  ref,
) {
  const forced = useForcedState();
  // A day leaving a range takes its new colour at once (Compose swaps to a fresh animated state).
  const prevKind = useRef(kind);
  const fromRange = prevKind.current === 'range';
  useEffect(() => {
    prevKind.current = kind;
  });
  if (kind === 'empty') return <span aria-hidden {...stylex.props(s.day)} />;
  const interactive = !disabled;
  const text =
    kind === 'today'
      ? disabled
        ? null
        : s.todayText
      : kind === 'selected'
        ? s.selectedText
        : kind === 'range'
          ? s.rangeText
          : kind === 'outside'
            ? [s.outside, forced.state && s.outsideActive]
            : null;
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-ripple-host=""
      {...aria}
      {...stylex.props(
        s.day,
        text,
        kind !== 'range' && !fromRange && s.contentAnimated,
        interactive && s.pressLayer,
        forced.state === 'hovered' && stateLayerHost.forceHover,
        forced.state === 'focused' && stateLayerHost.forceFocus,
        forced.state === 'pressed' && stateLayerHost.forcePressed,
        disabled && s.dim,
      )}
    >
      {kind === 'range' && <span aria-hidden {...stylex.props(s.band, s.bandFull)} />}
      {kind === 'selected' && rangeStart && <span aria-hidden {...stylex.props(s.band, s.bandRight)} />}
      {kind === 'selected' && rangeEnd && <span aria-hidden {...stylex.props(s.band, s.bandLeft)} />}
      <span
        aria-hidden
        {...stylex.props(
          s.circle,
          kind === 'today' && [s.today, disabled && s.todayDisabled],
          kind === 'selected' && [s.selected, !rangeEnd && s.selectedEnter],
        )}
      >
        {interactive && <StateLayer />}
        {interactive && <Ripple />}
      </span>
      <span {...stylex.props(typescale.bodyLarge, textBox.hug, s.label)}>{label}</span>
    </button>
  );
});

export interface YearChipProps {
  year: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  tabIndex?: number;
  'data-year'?: number;
}

/** A year in the year selection grid. */
export const YearChip = forwardRef<HTMLButtonElement, YearChipProps>(function YearChip(
  { year, selected = false, disabled = false, onClick, ...rest },
  ref,
) {
  const forced = useForcedState();
  return (
    <span {...stylex.props(s.yearCell)}>
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        aria-pressed={selected}
        onClick={onClick}
        data-ripple-host=""
        {...rest}
        {...stylex.props(
          s.yearPill,
          selected && s.yearSelected,
          !disabled && s.pressLayer,
          forced.state === 'hovered' && stateLayerHost.forceHover,
          forced.state === 'focused' && stateLayerHost.forceFocus,
          forced.state === 'pressed' && stateLayerHost.forcePressed,
          disabled && s.dim,
        )}
      >
        {!disabled && <StateLayer />}
        <span {...stylex.props(selected ? typescale.titleMedium : typescale.bodyLarge, textBox.hug)}>{year}</span>
      </button>
    </span>
  );
});

export interface PickerMenuButtonProps {
  children: ReactNode;
  open?: boolean;
  disabled?: boolean;
  /** Keep the arrow's space but hide it (an inactive menu in the docked picker's list views). */
  hideArrow?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  'aria-label'?: string;
}

// Kit icon arrow_drop_down (18px).
const ARROW = 'M9 11.25L5.25 7.5H12.75L9 11.25Z';

/** The month / year menu button of the date pickers (drop arrow flips while its list is open). */
export const PickerMenuButton = forwardRef<HTMLButtonElement, PickerMenuButtonProps>(function PickerMenuButton(
  { children, open = false, disabled = false, hideArrow = false, onClick, 'aria-label': ariaLabel },
  ref,
) {
  const forced = useForcedState();
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-expanded={open}
      aria-label={ariaLabel}
      onClick={onClick}
      data-ripple-host=""
      {...stylex.props(
        s.menu,
        !disabled && s.pressLayer,
        forced.state === 'hovered' && stateLayerHost.forceHover,
        forced.state === 'focused' && stateLayerHost.forceFocus,
        forced.state === 'pressed' && stateLayerHost.forcePressed,
      )}
    >
      {!disabled && <StateLayer />}
      <span {...stylex.props(typescale.labelLarge, textBox.hug, disabled && s.dim)}>{children}</span>
      <svg
        viewBox="0 0 18 18"
        fill="currentColor"
        aria-hidden
        {...stylex.props(s.arrow, open && s.arrowOpen, disabled && s.dim, hideArrow && s.arrowHidden)}
      >
        <path d={ARROW} />
      </svg>
    </button>
  );
});
