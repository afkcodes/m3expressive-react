import { Children, createContext, forwardRef, isValidElement, useContext, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { color } from '../../tokens/color.stylex';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { textBox } from '../../primitives/textBox.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import { base, containerMotion, containerSizes, disabled, gaps, iconSizes, labelRole, type ButtonShape, type ButtonSize } from '../Button/buttonStyles.ts';
import { ButtonGroupContext } from './context.ts';

/*
 * Figma kit, Buttons page, "Standard button group" and "Connected button group" (+ segments).
 *
 * Standard: a row of (toggle) buttons / icon buttons. Spacing per size (gap / inline padding):
 *   xsmall 18 / 9, small 12 / 6, medium–xlarge 8 / 0.
 *
 * Connected: equal-width tonal toggle segments, 2px apart. Geometry = Button (padding, gap, icon,
 * label role). Unselected secondary-container / on-secondary-container, selected secondary /
 * on-secondary. Corners: inner corners rest → active while hovered / focused / pressed, selected
 * segments fully round; outer corners fully round (shape "round") or as inner (shape "square").
 *            rest  active
 *   xsmall   4     12
 *   small    8     12
 *   medium   8     16
 *   large    16    28
 *   xlarge   20    32
 * Disabled: on-surface 10% container, 38% content. Selected + disabled also keeps its 10% layer,
 * but inside the 38% content group (under the glyphs) — reproduced with a fill behind the content.
 */
const H: Record<ButtonSize, number> = { xsmall: 32, small: 40, medium: 56, large: 96, xlarge: 136 };
const RADII: Record<ButtonSize, [rest: number, active: number]> = {
  xsmall: [4, 12],
  small: [8, 12],
  medium: [8, 16],
  large: [16, 28],
  xlarge: [20, 32],
};
const SPACING: Record<ButtonSize, [gap: number, pad: number]> = {
  xsmall: [18, 9],
  small: [12, 6],
  medium: [8, 0],
  large: [8, 0],
  xlarge: [8, 0],
};

const s = stylex.create({
  standard: { display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' },
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
    '::before': { content: '""', position: 'absolute', insetInline: 0, top: '50%', height: 48, transform: 'translateY(-50%)' },
  },
  container: { width: '100%' },
});

const dyn = stylex.create({
  spacing: (gap: number, pad: number) => ({ columnGap: gap, paddingInline: pad }),
  minHeight: (h: number) => ({ minHeight: h }),
  height: (h: number) => ({ height: h }),
});

// Per-corner: fixed (outer / selected / static states) or rest → active while interacted with.
// (stylex.when must stay inline, hence the repetition.)
const corners = stylex.create({
  ss: (v: string) => ({ borderStartStartRadius: v }),
  se: (v: string) => ({ borderStartEndRadius: v }),
  es: (v: string) => ({ borderEndStartRadius: v }),
  ee: (v: string) => ({ borderEndEndRadius: v }),
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
    '::before': { content: '""', position: 'absolute', inset: 0, zIndex: -1, borderRadius: 9999, backgroundColor: `color-mix(in srgb, ${color.onSurface} 10%, transparent)` },
  },
});

// ── Standard ──────────────────────────────────────────────────────────────────────────────────
export interface ButtonGroupProps {
  size?: ButtonSize;
  /** Buttons, toggle buttons or icon buttons. */
  children: ReactNode;
  'aria-label'?: string;
  sx?: StyleXStyles;
}

export function ButtonGroup({ size = 'small', children, sx, ...rest }: ButtonGroupProps) {
  const [gap, pad] = SPACING[size];
  return (
    <ButtonGroupContext value={{ inGroup: true }}>
      <div role="group" {...rest} {...stylex.props(s.standard, dyn.spacing(gap, pad), sx)}>
        {children}
      </div>
    </ButtonGroupContext>
  );
}

// ── Connected ─────────────────────────────────────────────────────────────────────────────────
interface ConnectedContextValue {
  size: ButtonSize;
  shape: ButtonShape;
  selected: readonly string[];
  index: number;
  count: number;
}
const ConnectedContext = createContext<ConnectedContextValue | null>(null);

export interface ConnectedButtonGroupProps {
  size?: ButtonSize;
  /** Outer corners: fully round, or square like the inner corners. */
  shape?: ButtonShape;
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: string[]) => void;
  /** Allow several segments to be selected. */
  multiple?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
  children: ReactNode;
  sx?: StyleXStyles;
}

export function ConnectedButtonGroup({
  size = 'small',
  shape = 'round',
  value: valueProp,
  defaultValue = [],
  onValueChange,
  multiple = false,
  disabled: isDisabled = false,
  children,
  sx,
  ...rest
}: ConnectedButtonGroupProps) {
  const [inner, setInner] = useState<readonly string[]>(defaultValue);
  const selected = valueProp ?? inner;
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <BaseToggleGroup
      value={selected}
      multiple={multiple}
      disabled={isDisabled}
      onValueChange={(next: string[]) => {
        if (valueProp === undefined) setInner(next);
        onValueChange?.(next);
      }}
      {...rest}
      {...stylex.props(s.connected, (size === 'xsmall' || size === 'small') && dyn.minHeight(48), sx)}
    >
      {items.map((child, index) => (
        <ConnectedContext key={child.key ?? index} value={{ size, shape, selected, index, count: items.length }}>
          {child}
        </ConnectedContext>
      ))}
    </BaseToggleGroup>
  );
}

export interface ConnectedButtonGroupItemProps
  extends Omit<BaseToggle.Props, 'className' | 'style' | 'render' | 'children' | 'value'> {
  value: string;
  /** Standalone use only (inside a group the group decides): size, and whether it's selected. */
  size?: ButtonSize;
  selected?: boolean;
  icon?: ReactNode;
  /** Icon when selected (the kit uses the filled version). Defaults to `icon`. */
  selectedIcon?: ReactNode;
  children?: ReactNode;
  sx?: StyleXStyles;
}

export const ConnectedButtonGroupItem = forwardRef<HTMLButtonElement, ConnectedButtonGroupItemProps>(function ConnectedButtonGroupItem(
  { value, size: sizeProp = 'small', selected: selectedProp = false, icon, selectedIcon, children, disabled: disabledProp, sx, ...rest },
  ref,
) {
  const group = useContext(ConnectedContext);
  const ctx = group ?? { size: sizeProp, shape: 'square' as ButtonShape, selected: selectedProp ? [value] : [], index: 0, count: 1 };
  const { size, shape, index, count } = ctx;
  const forced = useForcedState();
  const isSelected = ctx.selected.includes(value);
  const isDisabled = !!disabledProp;
  const [restR, activeR] = RADII[size].map((r) => `${r}px`) as [string, string];
  const full = `${H[size] / 2}px`;
  const interacting = forced.state === 'hovered' || forced.state === 'focused' || forced.state === 'pressed';
  const first = index === 0;
  const last = index === count - 1;
  const round = shape === 'round';
  // Outer corners (fully round in a "round" group) never morph; everything else follows the segment state.
  const outerStart = first && round;
  const outerEnd = last && round;
  const corner = isSelected ? full : isDisabled || interacting ? (interacting ? activeR : restR) : null;

  const fixedOrLive = (fixed: string | null, k: 'ss' | 'se' | 'es' | 'ee') =>
    fixed ? corners[k](fixed) : corners[`${k}Live`](restR, activeR);
  const startFixed = outerStart ? full : corner;
  const endFixed = outerEnd ? full : corner;
  const radiusStyles = [fixedOrLive(startFixed, 'ss'), fixedOrLive(endFixed, 'se'), fixedOrLive(startFixed, 'es'), fixedOrLive(endFixed, 'ee')];

  return (
    <BaseToggle
      ref={ref}
      value={value}
      {...(group ? {} : { pressed: isSelected })}
      disabled={disabledProp}
      data-ripple-host=""
      {...rest}
      {...stylex.props(
        base.root,
        s.item,
        (size === 'xsmall' || size === 'small') && s.touch,
        stateLayerHost.host,
        isDisabled && stateLayerHost.disabled,
        forced.state === 'hovered' && stateLayerHost.forceHover,
        forced.state === 'focused' && stateLayerHost.forceFocus,
        forced.state === 'pressed' && stateLayerHost.forceHover,
        stylex.defaultMarker(),
        sx,
      )}
    >
      <span
        {...stylex.props(
          base.container,
          // Connected segments are ToggleButtons with connected shapes: corners morph on FastSpatial.
          containerMotion.spatial,
          containerSizes[size],
          s.container,
          dyn.height(H[size]),
          ...radiusStyles,
          isSelected ? segment.selected : segment.unselected,
          isDisabled && disabled.container,
          forced.focusRing && base.ringForced,
        )}
      >
        <StateLayer />
        <Ripple disabled={isDisabled} />
        <span {...stylex.props(base.content, gaps[size], isDisabled && disabled.content, isDisabled && isSelected && segment.disabledSelectedContent)}>
          {(isSelected ? (selectedIcon ?? icon) : icon) != null && (
            <span {...stylex.props(base.icon, iconSizes[size])}>{isSelected ? (selectedIcon ?? icon) : icon}</span>
          )}
          {children != null && <span {...stylex.props(labelRole[size], textBox.hug, base.label)}>{children}</span>}
        </span>
      </span>
    </BaseToggle>
  );
});
