import { Children, createContext, forwardRef, isValidElement, useContext, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { color } from '../../tokens/color.stylex';
import { motion } from '../../tokens/motion.stylex';
import { state } from '../../tokens/state.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { textBox } from '../../primitives/textBox.ts';
import { useForcedState } from '../../testing/ForceState.tsx';

export type SegmentedButtonDensity = 0 | -1 | -2 | -3;

/*
 * Figma kit, Buttons page, "Baseline" → "Segmented button" (2–5 segments × density 0…-3) and the
 * start / middle / end segment building blocks.
 *   Segment: 40px container (density -1/-2/-3: 36/32/28) in a 4px-padded touch row, 1px inside
 *   outline stroke, neighbours overlap by 1px so shared borders are one line; start / end are
 *   fully rounded on their outer side. Padding 10/12, gap 8, 18px icons, label-large.
 *   Unselected: transparent / on-surface. Selected: secondary-container / on-secondary-container
 *   with a check (replacing the icon when there is one and a label; in front of icon-only or
 *   label-only content). Hover 8%, focus 10%, press a flat 10% layer (no ripple in the kit).
 *   Disabled: outline on-surface 10%, content 38%.
 */
const CHECK = 'M9.55 18L3.85 12.3L5.275 10.875L9.55 15.15L18.725 5.975L20.15 7.4L9.55 18Z';

const s = stylex.create({
  group: { display: 'inline-flex', verticalAlign: 'middle' },
  root: {
    appearance: 'none',
    borderWidth: 0,
    margin: 0,
    padding: 0,
    backgroundColor: 'transparent',
    backgroundImage: 'none',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    textAlign: 'inherit',
    color: 'inherit',
    display: 'flex',
    alignItems: 'center',
    flex: '1 1 0',
    minWidth: 0,
    cursor: { default: 'pointer', ':disabled': 'default' },
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    outline: 'none',
  },
  overlap: { marginInlineStart: -1 },
  container: {
    position: 'relative',
    isolation: 'isolate',
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    paddingInline: 12,
    columnGap: 8,
    outlineStyle: { default: 'none', [stylex.when.ancestor(':focus-visible')]: 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    outlineOffset: state.focusIndicatorOuterOffset,
    transitionProperty: 'background-color',
    transitionDuration: motion.fastEffectsDuration,
    transitionTimingFunction: motion.fastEffectsEasing,
    // Inside stroke, drawn above the state layer (kit order).
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: 'inherit',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: color.outline,
      pointerEvents: 'none',
    },
  },
  ringForced: { outlineStyle: 'solid' },
  unselected: { backgroundColor: 'transparent', color: color.onSurface },
  selected: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  disabled: { color: color.onSurface, '::after': { borderColor: `color-mix(in srgb, ${color.onSurface} 10%, transparent)` } },
  disabledSelected: { backgroundColor: `color-mix(in srgb, ${color.onSurface} 10%, transparent)` },
  content: { position: 'relative', display: 'inline-flex', alignItems: 'center', columnGap: 8 },
  contentDisabled: { opacity: state.disabledContentOpacity },
  icon: { width: 18, height: 18, flexShrink: 0 },
  label: { color: 'inherit' },
});

const dyn = stylex.create({
  heights: (row: number, box: number) => ({ height: row, paddingBlock: (row - box) / 2 }),
  box: (h: number) => ({ height: h }),
  radii: (start: string, end: string) => ({
    borderStartStartRadius: start,
    borderEndStartRadius: start,
    borderStartEndRadius: end,
    borderEndEndRadius: end,
  }),
});

interface SegmentedContextValue {
  density: SegmentedButtonDensity;
  selected: readonly string[];
  index: number;
  count: number;
}
const SegmentedContext = createContext<SegmentedContextValue | null>(null);

export interface SegmentedButtonProps {
  density?: SegmentedButtonDensity;
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

export function SegmentedButton({
  density = 0,
  value: valueProp,
  defaultValue = [],
  onValueChange,
  multiple = false,
  disabled,
  children,
  sx,
  ...rest
}: SegmentedButtonProps) {
  const [inner, setInner] = useState<readonly string[]>(defaultValue);
  const selected = valueProp ?? inner;
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <BaseToggleGroup
      value={selected}
      multiple={multiple}
      disabled={disabled}
      onValueChange={(next: string[]) => {
        if (valueProp === undefined) setInner(next);
        onValueChange?.(next);
      }}
      {...rest}
      {...stylex.props(s.group, sx)}
    >
      {items.map((child, index) => (
        <SegmentedContext key={child.key ?? index} value={{ density, selected, index, count: items.length }}>
          {child}
        </SegmentedContext>
      ))}
    </BaseToggleGroup>
  );
}

export interface SegmentedButtonItemProps extends Omit<BaseToggle.Props, 'className' | 'style' | 'render' | 'children' | 'value'> {
  value: string;
  /** 18px icon (use currentColor). */
  icon?: ReactNode;
  children?: ReactNode;
  /** Standalone use (building blocks): position in a row, selection, density. */
  position?: 'start' | 'middle' | 'end' | 'only';
  selected?: boolean;
  density?: SegmentedButtonDensity;
  sx?: StyleXStyles;
}

export const SegmentedButtonItem = forwardRef<HTMLButtonElement, SegmentedButtonItemProps>(function SegmentedButtonItem(
  { value, icon, children, position: positionProp = 'only', selected: selectedProp = false, density: densityProp = 0, disabled, sx, ...rest },
  ref,
) {
  const group = useContext(SegmentedContext);
  const forced = useForcedState();
  const density = group?.density ?? densityProp;
  const isSelected = group ? group.selected.includes(value) : selectedProp;
  const position = group
    ? group.count === 1
      ? 'only'
      : group.index === 0
        ? 'start'
        : group.index === group.count - 1
          ? 'end'
          : 'middle'
    : positionProp;
  const isDisabled = !!disabled;
  const box = 40 + 4 * density;
  const full = `${box / 2}px`;
  const start = position === 'start' || position === 'only' ? full : '0px';
  const end = position === 'end' || position === 'only' ? full : '0px';
  const check = (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...stylex.props(s.icon)}>
      <path d={CHECK} />
    </svg>
  );
  const iconNode = icon != null ? <span {...stylex.props(s.icon)}>{icon}</span> : null;
  // Selected: check replaces the icon next to a label; it is added in front of icon-only / label-only content.
  const leading = isSelected ? (iconNode && children != null ? [check] : [check, iconNode]) : [iconNode];

  return (
    <BaseToggle
      ref={ref}
      value={value}
      disabled={disabled}
      {...(group ? {} : { pressed: isSelected })}
      {...rest}
      {...stylex.props(
        s.root,
        dyn.heights(box + 8, box),
        group && group.index > 0 && s.overlap,
        stateLayerHost.hostPressLayer,
        isDisabled && stateLayerHost.disabled,
        forced.state === 'hovered' && stateLayerHost.forceHover,
        forced.state === 'focused' && stateLayerHost.forceFocus,
        forced.state === 'pressed' && stateLayerHost.forcePressed,
        stylex.defaultMarker(),
        sx,
      )}
    >
      <span
        {...stylex.props(
          s.container,
          dyn.box(box),
          dyn.radii(start, end),
          isSelected ? s.selected : s.unselected,
          isDisabled && s.disabled,
          isDisabled && isSelected && s.disabledSelected,
          forced.focusRing && s.ringForced,
        )}
      >
        <StateLayer />
        <span {...stylex.props(s.content, isDisabled && s.contentDisabled)}>
          {leading.map((n, i) => (n ? <span key={i} style={{ display: 'contents' }}>{n}</span> : null))}
          {children != null && <span {...stylex.props(typescale.labelLarge, textBox.hug, s.label)}>{children}</span>}
        </span>
      </span>
    </BaseToggle>
  );
});
