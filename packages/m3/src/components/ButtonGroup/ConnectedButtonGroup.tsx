import { Children, createContext, isValidElement, useContext, useMemo, type ReactNode, type Ref } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { color } from '../../tokens/color.stylex.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { focusRing } from '../../primitives/focusRing.ts';
import { forcedStateLayer, isInteractionState, StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import type { SxProps } from '../../primitives/types.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import { ButtonContent } from '../Button/ButtonContent.tsx';
import {
  buttonBase,
  buttonDisabled,
  containerMotion,
  containerSizes,
  needsTouchTarget,
  TOUCH_TARGET,
  type ButtonShape,
  type ButtonSize,
} from '../Button/buttonStyles.ts';

/*
 * Figma kit, Buttons page, "Connected button group" (+ segments): equal-width tonal toggle
 * segments, 2px apart. Geometry = Button (padding, gap, icon, label role). Unselected
 * secondary-container / on-secondary-container, selected secondary / on-secondary. Corners: inner
 * corners rest → active while hovered / focused / pressed, selected segments fully round; outer
 * corners fully round (shape "round") or as inner (shape "square").
 *            rest  active
 *   xsmall   4     12
 *   small    8     12
 *   medium   8     16
 *   large    16    28
 *   xlarge   20    32
 * Disabled: on-surface 10% container, 38% content. Selected + disabled also keeps its 10% layer,
 * but inside the 38% content group (under the glyphs) — reproduced with a fill behind the content.
 */
const HEIGHT: Record<ButtonSize, number> = { xsmall: 32, small: 40, medium: 56, large: 96, xlarge: 136 };
const RADII: Record<ButtonSize, [rest: number, active: number]> = {
  xsmall: [4, 12],
  small: [8, 12],
  medium: [8, 16],
  large: [16, 28],
  xlarge: [20, 32],
};

const s = stylex.create({
  connected: {
    display: 'inline-grid',
    gridAutoFlow: 'column',
    // Equal columns: in an auto-sized grid they resolve to the widest segment; with a set width
    // they share it even below a segment's content width (content overflows, centred — kit).
    gridAutoColumns: 'minmax(0, 1fr)',
    columnGap: 2,
    alignItems: 'center',
    verticalAlign: 'middle',
  },
  item: { width: '100%' },
  // XS/S segments are 32/40px; the group is the 48px touch row, and each segment's hit area
  // extends to it without affecting layout.
  touch: {
    '::before': {
      content: '""',
      position: 'absolute',
      insetInline: 0,
      top: '50%',
      height: 48,
      transform: 'translateY(-50%)',
    },
  },
  container: { width: '100%' },
});

const dyn = stylex.create({
  minHeight: (px: number) => ({ minHeight: px }),
  height: (px: number) => ({ height: px }),
});

// Per-corner: fixed (outer / selected / static states) or rest → active while interacted with.
// (stylex.when must stay inline, hence the repetition.)
const corners = stylex.create({
  ss: (radius: string) => ({ borderStartStartRadius: radius }),
  se: (radius: string) => ({ borderStartEndRadius: radius }),
  es: (radius: string) => ({ borderEndStartRadius: radius }),
  ee: (radius: string) => ({ borderEndEndRadius: radius }),
  ssLive: (rest: string, active: string) => ({
    borderStartStartRadius: {
      default: rest,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': active },
      [stylex.when.ancestor(':focus-visible')]: { default: active, '@media (hover: hover)': active },
      [stylex.when.ancestor(':active')]: { default: active, '@media (hover: hover)': active },
    },
  }),
  seLive: (rest: string, active: string) => ({
    borderStartEndRadius: {
      default: rest,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': active },
      [stylex.when.ancestor(':focus-visible')]: { default: active, '@media (hover: hover)': active },
      [stylex.when.ancestor(':active')]: { default: active, '@media (hover: hover)': active },
    },
  }),
  esLive: (rest: string, active: string) => ({
    borderEndStartRadius: {
      default: rest,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': active },
      [stylex.when.ancestor(':focus-visible')]: { default: active, '@media (hover: hover)': active },
      [stylex.when.ancestor(':active')]: { default: active, '@media (hover: hover)': active },
    },
  }),
  eeLive: (rest: string, active: string) => ({
    borderEndEndRadius: {
      default: rest,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': active },
      [stylex.when.ancestor(':focus-visible')]: { default: active, '@media (hover: hover)': active },
      [stylex.when.ancestor(':active')]: { default: active, '@media (hover: hover)': active },
    },
  }),
});

const segment = stylex.create({
  unselected: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  selected: { backgroundColor: color.secondary, color: color.onSecondary },
  // The content group (38%) gets a full-size on-surface 10% backdrop under the glyphs (selected
  // segments are always pills, so a pill radius matches the container).
  disabledSelectedContent: {
    position: 'static',
    '::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      zIndex: -1,
      borderRadius: 9999,
      backgroundColor: `color-mix(in srgb, ${color.onSurface} 10%, transparent)`,
    },
  },
});

interface ConnectedContextValue {
  size: ButtonSize;
  shape: ButtonShape;
  selected: readonly string[];
  count: number;
  /** The group's `disabled`: segments draw disabled too (Base UI only disables their behaviour). */
  disabled: boolean;
}
const ConnectedContext = createContext<ConnectedContextValue | null>(null);
/** The segment's position in its group (a number, so the provider value is stable). */
const ConnectedIndexContext = createContext(0);
/** A segment drawn outside a group (the kit's building blocks) takes its size from here. */
const StandaloneSizeContext = createContext<ButtonSize>('small');

/** The root is Base UI's ToggleGroup `<div>` (`role="group"`): name it with `aria-label`. */
export interface ConnectedButtonGroupProps extends SxProps<
  Omit<BaseToggleGroup.Props, 'render' | 'children' | 'value' | 'defaultValue' | 'onValueChange'>
> {
  size?: ButtonSize;
  /** Outer corners: fully round, or square like the inner corners. */
  shape?: ButtonShape;
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: string[], details: BaseToggleGroup.ChangeEventDetails) => void;
  /** Allow several segments to be selected. */
  multiple?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

export function ConnectedButtonGroup({
  size = 'small',
  shape = 'round',
  value,
  defaultValue = [],
  onValueChange,
  multiple = false,
  disabled = false,
  children,
  sx,
  ...rest
}: ConnectedButtonGroupProps) {
  const [selected, setSelected] = useControllableState<readonly string[]>(value, defaultValue);
  const items = Children.toArray(children).filter(isValidElement);
  // Each segment learns its position from a number-valued context (a stable provider value).
  const positioned = items.map((child, index) => (
    <ConnectedIndexContext key={child.key ?? index} value={index}>
      {child}
    </ConnectedIndexContext>
  ));
  const count = items.length;
  const group = useMemo(() => ({ size, shape, selected, count, disabled }), [size, shape, selected, count, disabled]);
  return (
    <BaseToggleGroup
      value={selected}
      multiple={multiple}
      disabled={disabled}
      onValueChange={(next: string[], details) => {
        setSelected(next);
        onValueChange?.(next, details);
      }}
      {...rest}
      {...stylex.props(s.connected, needsTouchTarget(size) && dyn.minHeight(TOUCH_TARGET), sx)}
    >
      <ConnectedContext value={group}>{positioned}</ConnectedContext>
    </BaseToggleGroup>
  );
}

/**
 * A segment of a `ConnectedButtonGroup`, which sets its size and selection. Outside a group it is a
 * plain toggle (`pressed` / `defaultPressed` / `onPressedChange`).
 */
export interface ConnectedButtonGroupItemProps extends SxProps<
  Omit<BaseToggle.Props, 'render' | 'children' | 'value'>
> {
  ref?: Ref<HTMLButtonElement>;
  value: string;
  icon?: ReactNode;
  /** Icon when selected (the kit uses the filled version). Defaults to `icon`. */
  selectedIcon?: ReactNode;
  children?: ReactNode;
}

export function ConnectedButtonGroupItem({
  value,
  icon,
  selectedIcon,
  children,
  disabled: disabledProp,
  pressed,
  defaultPressed = false,
  onPressedChange,
  sx,
  ...rest
}: ConnectedButtonGroupItemProps) {
  const group = useContext(ConnectedContext);
  const groupIndex = useContext(ConnectedIndexContext);
  const standaloneSize = useContext(StandaloneSizeContext);
  const size = group?.size ?? standaloneSize;
  const shape: ButtonShape = group?.shape ?? 'square';
  const index = group ? groupIndex : 0;
  const count = group?.count ?? 1;
  const forced = useForcedState();
  const [ownPressed, setOwnPressed] = useControllableState(pressed, defaultPressed, onPressedChange);
  const selected = group ? group.selected.includes(value) : (forced.selected ?? ownPressed);
  const disabled = !!disabledProp || !!group?.disabled;
  const [restRadius, activeRadius] = RADII[size].map((radius) => `${radius}px`) as [string, string];
  const full = `${HEIGHT[size] / 2}px`;
  const interacting = isInteractionState(forced.state);
  const round = shape === 'round';
  // Outer corners (fully round in a "round" group) never morph; everything else follows the segment state.
  const outerStart = index === 0 && round;
  const outerEnd = index === count - 1 && round;
  const corner = selected ? full : disabled || interacting ? (interacting ? activeRadius : restRadius) : null;

  const fixedOrLive = (fixed: string | null, corner: 'ss' | 'se' | 'es' | 'ee') =>
    fixed ? corners[corner](fixed) : corners[`${corner}Live`](restRadius, activeRadius);
  const startFixed = outerStart ? full : corner;
  const endFixed = outerEnd ? full : corner;

  return (
    <BaseToggle
      value={value}
      {...(group ? { onPressedChange } : { pressed: selected, onPressedChange: setOwnPressed })}
      disabled={disabled}
      data-ripple-host=""
      {...rest}
      {...stylex.props(
        buttonBase.root,
        s.item,
        needsTouchTarget(size) && s.touch,
        stateLayerHost.host,
        disabled && stateLayerHost.disabled,
        forcedStateLayer(forced.state, 'hover'),
        stylex.defaultMarker(),
        sx,
      )}
    >
      <span
        {...stylex.props(
          buttonBase.container,
          focusRing.part,
          // Connected segments are ToggleButtons with connected shapes: corners morph on FastSpatial.
          containerMotion.spatial,
          containerSizes[size],
          s.container,
          dyn.height(HEIGHT[size]),
          fixedOrLive(startFixed, 'ss'),
          fixedOrLive(endFixed, 'se'),
          fixedOrLive(startFixed, 'es'),
          fixedOrLive(endFixed, 'ee'),
          selected ? segment.selected : segment.unselected,
          disabled && buttonDisabled.container,
          forced.focusRing && focusRing.forced,
        )}
      >
        <StateLayer />
        <Ripple disabled={disabled} />
        <ButtonContent
          size={size}
          disabled={disabled}
          icon={selected ? (selectedIcon ?? icon) : icon}
          sx={disabled && selected && segment.disabledSelectedContent}
        >
          {children}
        </ButtonContent>
      </span>
    </BaseToggle>
  );
}

/**
 * Testing: the size of `ConnectedButtonGroupItem`s drawn outside a group (the kit's segment
 * building blocks); their selection comes from `ForceState selected`.
 */
export function ConnectedButtonGroupScope({ size = 'small', children }: { size?: ButtonSize; children: ReactNode }) {
  return <StandaloneSizeContext value={size}>{children}</StandaloneSizeContext>;
}
