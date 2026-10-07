import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { color } from '../../tokens/color.stylex.ts';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { textBox } from '../../primitives/textBox.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';
import { useSpringToken } from '../../motion/context.tsx';
import type { SpringParams } from '../../motion/spring.ts';
import { base, containerMotion, containerSizes, disabled, gaps, iconSizes, labelRole, type ButtonShape, type ButtonSize } from '../Button/buttonStyles.ts';
import { ButtonGroupContext, GROUP_BOX_ATTR } from './context.ts';

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
  const ref = useRef<HTMLDivElement>(null);
  const handlers = useEnlargeOnPress(ref, useSpringToken('fast-spatial'));
  return (
    <ButtonGroupContext value={{ inGroup: true }}>
      <div ref={ref} role="group" {...rest} {...handlers} {...stylex.props(s.standard, dyn.spacing(gap, pad), sx)}>
        {children}
      </div>
    </ButtonGroupContext>
  );
}

/*
 * Press to widen — Compose ButtonGroup (ButtonGroup.kt): every item tagged `animateWidth` owns a
 * press progress (EnlargeOnPressNode) that springs 0 → 1 on FastSpatial while pressed; on
 * release it waits until progress > 0.75 (at most 1 s), then springs back to 0. Each layout pass
 * grows the pressed item at its neighbours' expense, so the group keeps its width:
 *   middle item: each neighbour gives round(p · min(0.15 · w / 2, prevLimit, nextLimit));
 *   first / last: the one neighbour gives round(p · min(0.15 · w, neighbourLimit));
 * a neighbour never gives more than its width; limit = the neighbour's compression limit
 * (GROUP_BOX_ATTR on its box). Widths are applied to each item's visual box; with no press in
 * flight the boxes carry no inline width (the kit's rest layout).
 */
const EXPANDED_RATIO = 0.15; // ButtonGroupDefaults.ExpandedRatio
const MAX_WAIT_MS = 1000; // MAX_WAIT_TIME_MILLIS

interface PressState {
  progress: number;
  anim: SpringAnimation | null;
  pressed: boolean;
  wait: number;
}

function boxOf(item: Element): HTMLElement | null {
  return item.matches(`[${GROUP_BOX_ATTR}]`) ? (item as HTMLElement) : item.querySelector<HTMLElement>(`[${GROUP_BOX_ATTR}]`);
}

function useEnlargeOnPress(ref: RefObject<HTMLDivElement | null>, spring: SpringParams | null) {
  const states = useRef(new Map<Element, PressState>());
  const base = useRef<number[] | null>(null);
  const springRef = useRef(spring);
  springRef.current = spring;
  const keyItem = useRef<Element | null>(null);

  const layout = () => {
    const root = ref.current;
    if (!root) return;
    const items = Array.from(root.children);
    const boxes = items.map(boxOf);
    const progress = items.map((it) => states.current.get(it)?.progress ?? 0);
    if (progress.every((p) => p === 0)) {
      for (const b of boxes) b?.style.removeProperty('width');
      base.current = null;
      return;
    }
    // Natural widths, measured once per press session (no inline widths are set while base is null).
    if (!base.current || base.current.length !== items.length) {
      for (const b of boxes) b?.style.removeProperty('width');
      base.current = items.map((it, i) => (boxes[i] ?? it).getBoundingClientRect().width);
    }
    const widths = base.current.slice();
    const limits = boxes.map((b) => (b ? Number(b.getAttribute(GROUP_BOX_ATTR)) || 0 : 0));
    const w = (i: number) => widths[i] ?? 0;
    const lim = (i: number) => limits[i] ?? 0;
    const n = widths.length;
    if (n > 1) {
      for (let i = 0; i < n; i++) {
        const p = progress[i] ?? 0;
        if (p === 0) continue;
        let actual: number;
        if (i >= 1 && i < n - 1) {
          // Middle: both neighbours give way.
          const growth = Math.round(p * Math.min((EXPANDED_RATIO * w(i)) / 2, lim(i - 1), lim(i + 1)));
          const left = Math.min(growth, w(i - 1));
          const right = Math.min(growth, w(i + 1));
          widths[i - 1] = w(i - 1) - left;
          widths[i + 1] = w(i + 1) - right;
          actual = left + right;
        } else if (i === 0) {
          const growth = Math.round(p * Math.min(EXPANDED_RATIO * w(i), lim(i + 1)));
          const right = Math.min(growth, w(i + 1));
          widths[i + 1] = w(i + 1) - right;
          actual = right;
        } else {
          const growth = Math.round(p * Math.min(EXPANDED_RATIO * w(i), lim(i - 1)));
          const left = Math.min(growth, w(i - 1));
          widths[i - 1] = w(i - 1) - left;
          actual = left;
        }
        widths[i] = w(i) + actual;
      }
    }
    boxes.forEach((b, i) => {
      if (!b) return;
      if (widths[i] === base.current![i]) b.style.removeProperty('width');
      else b.style.width = `${widths[i]}px`;
    });
  };

  const stateOf = (item: Element) => {
    let st = states.current.get(item);
    if (!st) states.current.set(item, (st = { progress: 0, anim: null, pressed: false, wait: 0 }));
    return st;
  };

  const animate = (item: Element, st: PressState, to: number) => {
    const sp = springRef.current;
    if (!sp) {
      st.anim?.stop();
      st.anim = null;
      st.progress = to;
      layout();
      return;
    }
    if (st.anim) {
      // Still running (release while the press spring is in flight): keep its velocity.
      st.anim.retarget(to);
      return;
    }
    st.anim = animateSpring({
      spring: sp,
      from: st.progress,
      to,
      onUpdate: (v) => {
        st.progress = v;
        layout();
      },
      onComplete: () => {
        st.anim = null;
        if (st.progress === 0 && !st.pressed) states.current.delete(item);
      },
    });
  };

  const press = (item: Element) => {
    const st = stateOf(item);
    if (st.pressed) return;
    st.pressed = true;
    cancelAnimationFrame(st.wait);
    if (st.anim && st.anim.target === 1) return;
    // A press during the release spring cancels it (Compose resets the velocity) and starts afresh.
    st.anim?.stop();
    st.anim = null;
    animate(item, st, 1);
  };

  const release = (item: Element) => {
    const st = states.current.get(item);
    if (!st?.pressed) return;
    st.pressed = false;
    const start = performance.now();
    const check = (now: number) => {
      if (st.pressed) return;
      if (st.progress > 0.75 || now - start > MAX_WAIT_MS) animate(item, st, 0);
      else st.wait = requestAnimationFrame(check);
    };
    st.wait = requestAnimationFrame(check);
  };

  useEffect(
    () => () => {
      for (const st of states.current.values()) {
        st.anim?.stop();
        cancelAnimationFrame(st.wait);
      }
    },
    [],
  );

  const itemOf = (target: EventTarget | null): Element | null => {
    const root = ref.current;
    if (!root || !(target instanceof Node)) return null;
    let node: Node | null = target;
    while (node && node.parentNode !== root) node = node.parentNode;
    if (!(node instanceof Element) || !boxOf(node)) return null;
    if (node.matches(':disabled, [aria-disabled="true"], [data-disabled]')) return null;
    return node;
  };

  return {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const item = itemOf(e.target);
      if (!item) return;
      press(item);
      const up = () => {
        release(item);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    },
    onKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if ((e.key !== ' ' && e.key !== 'Enter') || e.repeat) return;
      const item = itemOf(e.target);
      if (!item) return;
      keyItem.current = item;
      press(item);
    },
    onKeyUp: (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if ((e.key !== ' ' && e.key !== 'Enter') || !keyItem.current) return;
      release(keyItem.current);
      keyItem.current = null;
    },
    onBlur: () => {
      if (!keyItem.current) return;
      release(keyItem.current);
      keyItem.current = null;
    },
  };
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
