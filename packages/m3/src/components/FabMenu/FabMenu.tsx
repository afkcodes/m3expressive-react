import {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Button as BaseButton } from '@base-ui/react/button';
import { color } from '../../tokens/color.stylex.ts';
import { elevation } from '../../tokens/elevation.stylex.ts';
import { state } from '../../tokens/state.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { elevationMotion } from '../../primitives/elevationMotion.ts';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { textBox } from '../../primitives/textBox.ts';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';
import { useSpringToken } from '../../motion/context.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { rovingIndex } from './roving.ts';

export type FabMenuColor = 'primary' | 'secondary' | 'tertiary';

/*
 * Figma kit, Buttons page, "FAB menu" + building blocks (per colour: Segment, FAB).
 *   Item: 56px pill, padding 16/24, gap 8, 24px icon, title-medium label, {colour}-container fill,
 *         on-{colour}-container content, no elevation. Hover 8% / focus 10% / press 8% + ripple.
 *   Close: 56px circle, {colour} fill, 20px "close" icon, level 3 (hover 4; focused: no spread).
 *   Layout: items right-aligned 4px apart, 8px above the close button.
 * Closed, the menu is a regular FAB in the {colour}-container colour.
 *
 * Motion — Compose FloatingActionButtonMenu.kt (androidx-main):
 *   - The FAB and the close button are one ToggleFloatingActionButton driven by a single checked
 *     progress on FastSpatial: corner radius lerp(16, 28), container {colour}-container → {colour}
 *     and icon on-{colour}-container → on-{colour} (Oklab lerp), icon size lerp(24, 20); the glyph
 *     swaps to "close" once progress > 0.5 (FloatingActionButtonMenuSample). The kit's open / closed
 *     frames are the progress-1 / progress-0 rest states.
 *   - Items stagger: a visible-item count springs to N (open) / 0 (close) on SlowEffects with
 *     visibilityThreshold 1, read as an Int (truncated); item i (0 = top) is shown while
 *     i >= N - count, so the bottom item comes first on open and the top item leaves first on close.
 *   - Each item reveals with its width 0 → 1 (FastSpatial, anchored to the end edge, content not
 *     moving) and alpha (FastEffects); a fully transparent item is not drawn. The list unmounts
 *     once every item has faded out.
 * Keyboard (menu pattern): opening from the toggle moves focus to the first item as soon as it is
 * drawn; the items are one tab stop (roving tabindex: arrows, Home / End); Escape closes and
 * returns focus to the toggle.
 */
const CLOSE = 'M6.4 19L5 17.6L10.6 12L5 6.4L6.4 5L12 10.6L17.6 5L19 6.4L13.4 12L19 17.6L17.6 19L12 13.4L6.4 19Z';
const ITEM_PAD = 24;

const s = stylex.create({
  root: { display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', rowGap: 8, verticalAlign: 'bottom' },
  list: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', rowGap: 4, margin: 0, padding: 0 },
  button: {
    appearance: 'none',
    borderWidth: 0,
    margin: 0,
    backgroundImage: 'none',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    textAlign: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    flexShrink: 0,
    cursor: 'pointer',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    outlineOffset: state.focusIndicatorOuterOffset,
  },
  item: {
    height: 56,
    paddingBlock: 16,
    paddingInline: ITEM_PAD,
    columnGap: 8,
    borderRadius: 28,
  },
  close: {
    width: 56,
    height: 56,
    padding: 0,
    borderRadius: 28,
    boxShadow: {
      default: elevation.level3,
      ':hover': { default: null, '@media (hover: hover)': elevation.level4 },
      ':focus-visible': { default: elevation.level3NoSpread, '@media (hover: hover)': elevation.level3NoSpread },
      ':active': { default: elevation.level3, '@media (hover: hover)': elevation.level3 },
    },
  },
  // Closed: the FAB's 16px corners (ToggleFloatingActionButton at progress 0).
  closed: { borderRadius: 16 },
  closeHovered: { boxShadow: elevation.level4 },
  closeFocused: { boxShadow: elevation.level3NoSpread },
  ringForced: { outlineStyle: 'solid' },
  icon: { position: 'relative', display: 'inline-flex', flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  icon24: { width: 24, height: 24 },
  icon20: { width: 20, height: 20 },
  // While the toggle morphs, the icon box follows --m3-fab-icon (set per frame).
  iconMorph: { width: 'var(--m3-fab-icon)', height: 'var(--m3-fab-icon)' },
  label: { position: 'relative', color: 'inherit' },
});

const itemColors = stylex.create({
  primary: { backgroundColor: color.primaryContainer, color: color.onPrimaryContainer },
  secondary: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  tertiary: { backgroundColor: color.tertiaryContainer, color: color.onTertiaryContainer },
});
const closeColors = stylex.create({
  primary: { backgroundColor: color.primary, color: color.onPrimary },
  secondary: { backgroundColor: color.secondary, color: color.onSecondary },
  tertiary: { backgroundColor: color.tertiary, color: color.onTertiary },
});
/** [closed, open] container and content colours of the toggle, for the per-frame Oklab mix. */
const TOGGLE_COLORS: Record<FabMenuColor, { container: [string, string]; content: [string, string] }> = {
  primary: { container: [color.primaryContainer, color.primary], content: [color.onPrimaryContainer, color.onPrimary] },
  secondary: {
    container: [color.secondaryContainer, color.secondary],
    content: [color.onSecondaryContainer, color.onSecondary],
  },
  tertiary: {
    container: [color.tertiaryContainer, color.tertiary],
    content: [color.onTertiaryContainer, color.onTertiary],
  },
};

interface FabMenuContextValue {
  color: FabMenuColor;
  close: () => void;
  /** 0 = top item. */
  index: number;
  /** Inside a FabMenu: reveal / hide with the stagger. Standalone items are static. */
  animated: boolean;
  visible: boolean;
  /** Item reports whether it is drawn (alpha > 0) so the menu can unmount the list after closing. */
  onShown: (index: number, shown: boolean) => void;
  /** Roving tabindex: this item is the menu's tab stop. */
  tabStop: boolean;
  /** Item received focus (it becomes the tab stop). */
  onItemFocus: (index: number) => void;
}
const FabMenuContext = createContext<FabMenuContextValue>({
  color: 'primary',
  close: () => {},
  index: 0,
  animated: false,
  visible: true,
  onShown: () => {},
  tabStop: true,
  onItemFocus: () => {},
});

function forcedStyles(forced: ReturnType<typeof useForcedState>) {
  return [
    forced.state === 'hovered' && stateLayerHost.forceHover,
    forced.state === 'focused' && stateLayerHost.forceFocus,
    forced.state === 'pressed' && stateLayerHost.forceHover,
    forced.focusRing && s.ringForced,
  ];
}

export interface FabMenuProps {
  color?: FabMenuColor;
  /** Controlled open state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Icon of the closed FAB (use currentColor). */
  icon?: ReactNode;
  /** Accessible name of the closed FAB. */
  'aria-label': string;
  /** Accessible name of the close button. */
  closeLabel?: string;
  /** <FabMenuItem/>s, top to bottom. */
  children?: ReactNode;
  sx?: StyleXStyles;
}

export function FabMenu({
  color: menuColor = 'primary',
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  icon,
  'aria-label': label,
  closeLabel = 'Close menu',
  children,
  sx,
}: FabMenuProps) {
  const [inner, setInner] = useState(defaultOpen);
  const open = openProp ?? inner;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInner(next);
    onOpenChange?.(next);
  };
  const listRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  // Roving tab stop (item index) and a pending "focus the first item once it is drawn".
  const [tabStop, setTabStop] = useState(0);
  const focusFirst = useRef(false);
  const menuItems = () => Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? []);
  const close = () => {
    focusFirst.current = false;
    setOpen(false);
    requestAnimationFrame(() => fabRef.current?.focus());
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'Escape') return close();
    const list = menuItems();
    const next = rovingIndex(e.key, list.indexOf(document.activeElement as HTMLElement), list.length);
    // Home / End only within the items (the toggle keeps its own keys).
    if (next == null || ((e.key === 'Home' || e.key === 'End') && !listRef.current?.contains(e.target as Node))) return;
    focusFirst.current = false;
    list[next]?.focus();
    e.preventDefault();
  };
  const items = Children.toArray(children).filter(isValidElement);
  const { count, mounted, onShown } = useStagger(open, items.length, (index) => {
    // The first item is drawn (alpha > 0): it can take focus now.
    if (index !== 0 || !focusFirst.current) return;
    focusFirst.current = false;
    menuItems()[0]?.focus();
  });
  const hasMenu = items.length > 0;

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- arrow-key navigation delegated from the items
    <span {...stylex.props(s.root, sx)} onKeyDown={onKeyDown}>
      {mounted && hasMenu && (
        // Closing: the items fade out but are no longer part of the menu.
        <div ref={listRef} id={listId} role="menu" aria-label={label} inert={!open} {...stylex.props(s.list)}>
          {items.map((child, index) => (
            <FabMenuContext
              key={child.key ?? index}
              value={{
                color: menuColor,
                close,
                index,
                animated: true,
                visible: index >= items.length - count,
                onShown,
                tabStop: index === Math.min(tabStop, items.length - 1),
                onItemFocus: setTabStop,
              }}
            >
              {child}
            </FabMenuContext>
          ))}
        </div>
      )}
      <FabMenuToggle
        ref={fabRef}
        open={open}
        color={menuColor}
        icon={icon}
        aria-label={open ? closeLabel : label}
        aria-haspopup={hasMenu ? 'menu' : undefined}
        aria-controls={mounted && hasMenu ? listId : undefined}
        onClick={() => {
          if (open) return close();
          setTabStop(0);
          focusFirst.current = hasMenu;
          setOpen(true);
          // Reopened while the first item is still drawn (closing): it won't report being shown.
          requestAnimationFrame(() => {
            if (!focusFirst.current) return;
            const first = menuItems()[0];
            first?.focus();
            if (first && document.activeElement === first) focusFirst.current = false;
          });
        }}
      />
    </span>
  );
}

/**
 * Visible-item count (stagger) and list lifetime. `onItemShown` hears every item that starts being
 * drawn (alpha > 0).
 */
function useStagger(open: boolean, n: number, onItemShown: (index: number) => void) {
  const spring = useSpringToken('slow-effects')!;
  const [count, setCount] = useState(open ? n : 0);
  const [mounted, setMounted] = useState(open);
  // Opening mounts the list in the same render (closing keeps it until the items have faded out).
  if (open && !mounted) setMounted(true);
  const value = useRef(open ? n : 0);
  const anim = useRef<SpringAnimation | null>(null);
  const shown = useRef(new Set<number>());
  // Latest props for the callbacks below (items call them from their effects and springs).
  const live = useRef({ open, onItemShown });
  useLayoutEffect(() => {
    live.current = { open, onItemShown };
  });
  const first = useRef(true);

  const maybeUnmount = useCallback(() => {
    const { open: isOpen } = live.current;
    if (!isOpen && value.current === 0 && !anim.current && shown.current.size === 0) setMounted(false);
  }, []);

  const onShown = useCallback(
    (index: number, isShown: boolean) => {
      if (isShown) shown.current.add(index);
      else shown.current.delete(index);
      if (isShown) live.current.onItemShown(index);
      maybeUnmount();
    },
    [maybeUnmount],
  );

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const target = open ? n : 0;
    if (anim.current) {
      anim.current.retarget(target);
      return;
    }
    // Already there (count === trunc(value) === target): only the list's lifetime can change.
    if (value.current === target) {
      maybeUnmount();
      return;
    }
    anim.current = animateSpring({
      spring,
      from: value.current,
      to: target,
      // Animatable<Int> with spring(visibilityThreshold = 1); the count is the truncated value.
      precision: 1,
      onUpdate: (v) => {
        value.current = v;
        setCount(Math.trunc(v));
      },
      onComplete: () => {
        anim.current = null;
        maybeUnmount();
      },
    });
  }, [open, n, spring, maybeUnmount]);

  useEffect(() => () => anim.current?.stop(), []);

  return { count, mounted, onShown };
}

interface FabMenuToggleProps extends Omit<BaseButton.Props, 'className' | 'style' | 'render' | 'children' | 'color'> {
  open: boolean;
  color: FabMenuColor;
  icon?: ReactNode;
}

/** The menu's FAB and close button: one element morphing on the checked progress. */
const FabMenuToggle = forwardRef<HTMLButtonElement, FabMenuToggleProps>(function FabMenuToggle(
  { open, color: c, icon, ...rest },
  ref,
) {
  const forced = useForcedState();
  const spring = useSpringToken('fast-spatial');
  const el = useRef<HTMLButtonElement | null>(null);
  useImperativeHandle(ref, () => el.current!, []);
  const progress = useRef(open ? 1 : 0);
  const anim = useRef<SpringAnimation | null>(null);
  const [morphing, setMorphing] = useState(false);
  const [glyphClose, setGlyphClose] = useState(open);
  // Toggling starts the morph (or snaps without motion) in the same render; the effect below runs
  // the spring.
  const [prev, setPrev] = useState({ open, spring });
  if (prev.open !== open || prev.spring !== spring) {
    setPrev({ open, spring });
    if (!spring) {
      setMorphing(false);
      setGlyphClose(open);
    } else if (prev.open !== open) setMorphing(true);
  }
  const first = useRef(true);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const node = el.current;
    const target = open ? 1 : 0;
    if (!anim.current && progress.current === target) return;
    const clear = () => {
      if (!node) return;
      for (const p of ['border-radius', 'background-color', 'color', '--m3-fab-icon']) node.style.removeProperty(p);
    };
    const apply = (p: number) => {
      if (!node) return;
      const { container, content } = TOGGLE_COLORS[c];
      // Compose lerps colours in Oklab; CSS color-mix needs 0–100%, so the overshoot is clamped there.
      const mix = `${Math.min(1, Math.max(0, p)) * 100}%`;
      node.style.borderRadius = `${16 + 12 * p}px`;
      node.style.backgroundColor = `color-mix(in oklab, ${container[0]}, ${container[1]} ${mix})`;
      node.style.color = `color-mix(in oklab, ${content[0]}, ${content[1]} ${mix})`;
      const dpr = window.devicePixelRatio || 1;
      node.style.setProperty('--m3-fab-icon', `${Math.round((24 - 4 * p) * dpr) / dpr}px`);
      setGlyphClose(p > 0.5);
    };
    if (!spring) {
      anim.current?.stop();
      anim.current = null;
      progress.current = target;
      clear();
      return;
    }
    if (anim.current) {
      anim.current.retarget(target);
      return;
    }
    anim.current = animateSpring({
      spring,
      from: progress.current,
      to: target,
      onUpdate: (v) => {
        progress.current = v;
        apply(v);
      },
      onComplete: () => {
        anim.current = null;
        clear();
        setMorphing(false);
      },
    });
  }, [open, spring, c]);

  useEffect(() => () => anim.current?.stop(), []);

  const showClose = morphing ? glyphClose : open;
  return (
    <BaseButton
      ref={el}
      aria-expanded={open}
      data-ripple-host=""
      {...rest}
      {...stylex.props(
        s.button,
        s.close,
        open ? closeColors[c] : [s.closed, itemColors[c]],
        stateLayerHost.host,
        elevationMotion.host,
        ...forcedStyles(forced),
        forced.state === 'hovered' && s.closeHovered,
        forced.state === 'focused' && s.closeFocused,
      )}
    >
      <StateLayer />
      {/* The FAB draws its pressed ripple over the icon, the close button under it (kit layer order). */}
      <Ripple above={!open} />
      {showClose ? (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
          {...stylex.props(s.icon, s.icon20, morphing && s.iconMorph)}
        >
          <path d={CLOSE} />
        </svg>
      ) : (
        <span {...stylex.props(s.icon, s.icon24, morphing && s.iconMorph)}>{icon}</span>
      )}
    </BaseButton>
  );
});

export interface FabMenuItemProps extends Omit<BaseButton.Props, 'className' | 'style' | 'render' | 'children'> {
  /** Leading icon (use currentColor), 24px. */
  icon?: ReactNode;
  children: ReactNode;
  /** Overrides the menu's colour (standalone use). */
  color?: FabMenuColor;
  /** Keep the menu open after this item is chosen. */
  keepOpen?: boolean;
  sx?: StyleXStyles;
}

export const FabMenuItem = forwardRef<HTMLButtonElement, FabMenuItemProps>(function FabMenuItem(
  { icon, children, color: colorProp, keepOpen = false, onClick, onFocus, sx, ...rest },
  ref,
) {
  const ctx = useContext(FabMenuContext);
  const forced = useForcedState();
  const el = useRef<HTMLButtonElement | null>(null);
  useImperativeHandle(ref, () => el.current!, []);
  useItemReveal(el, ctx);
  return (
    <BaseButton
      ref={el}
      role="menuitem"
      data-ripple-host=""
      // Inside a menu only the roving tab stop is tabbable (arrow keys move between items).
      tabIndex={ctx.animated ? (ctx.tabStop ? 0 : -1) : undefined}
      onClick={(e) => {
        onClick?.(e);
        if (!keepOpen && !e.defaultPrevented) ctx.close();
      }}
      onFocus={(e) => {
        ctx.onItemFocus(ctx.index);
        onFocus?.(e);
      }}
      {...rest}
      {...stylex.props(
        s.button,
        s.item,
        itemColors[colorProp ?? ctx.color],
        stateLayerHost.host,
        ...forcedStyles(forced),
        sx,
      )}
    >
      <StateLayer />
      <Ripple />
      {icon != null && <span {...stylex.props(s.icon, s.icon24)}>{icon}</span>}
      <span {...stylex.props(typescale.titleMedium, textBox.hug, s.label)}>{children}</span>
    </BaseButton>
  );
});

/**
 * Item reveal — Compose FloatingActionButtonMenuItem: width = round(natural · max(w, 0)) with the
 * padded content placed at the end edge (so it does not move), alpha a; not drawn at a = 0.
 * Widths below the natural one clip from the start side; the FastSpatial overshoot widens the
 * pill towards the start (extra start padding, cancelled by a negative margin so the layout and
 * the end edge stay put).
 */
function useItemReveal(el: { current: HTMLElement | null }, ctx: FabMenuContextValue) {
  const widthSpring = useSpringToken('fast-spatial');
  const alphaSpring = useSpringToken('fast-effects')!;
  const st = useRef({
    w: ctx.visible ? 1 : 0,
    a: ctx.visible ? 1 : 0,
    wAnim: null as SpringAnimation | null,
    aAnim: null as SpringAnimation | null,
    natural: 0,
    shown: false,
  });
  // Latest context for the spring callbacks; updated before the reveal effect below runs.
  const ctxRef = useRef(ctx);
  useLayoutEffect(() => {
    ctxRef.current = ctx;
  });
  const first = useRef(true);

  const apply = () => {
    const node = el.current;
    const S = st.current;
    if (!node) return;
    const styles = node.style;
    const resting = !S.wAnim && !S.aAnim;
    if (resting && S.w === 1 && S.a === 1) {
      for (const p of ['opacity', 'visibility', 'clip-path', 'margin-inline-start', 'padding-inline-start'])
        styles.removeProperty(p);
      return;
    }
    styles.opacity = String(S.a);
    styles.visibility = S.a === 0 ? 'hidden' : '';
    const width = Math.round(S.natural * Math.max(S.w, 0));
    if (width >= S.natural) {
      const extra = width - S.natural;
      styles.removeProperty('clip-path');
      styles.marginInlineStart = extra ? `${-extra}px` : '';
      styles.paddingInlineStart = extra ? `${ITEM_PAD + extra}px` : '';
    } else {
      const cut = `${S.natural - width}px`;
      const rtl = getComputedStyle(node).direction === 'rtl';
      styles.clipPath = rtl ? `inset(0 ${cut} 0 0 round 28px)` : `inset(0 0 0 ${cut} round 28px)`;
      styles.removeProperty('margin-inline-start');
      styles.removeProperty('padding-inline-start');
    }
  };

  const report = () => {
    const S = st.current;
    const shown = S.a !== 0;
    if (shown !== S.shown) {
      S.shown = shown;
      ctxRef.current.onShown(ctxRef.current.index, shown);
    }
  };

  useLayoutEffect(() => {
    if (!ctx.animated) return;
    const S = st.current;
    const node = el.current;
    if (first.current) {
      first.current = false;
      if (node) S.natural = node.getBoundingClientRect().width;
      apply();
      report();
      return;
    }
    const target = ctx.visible ? 1 : 0;
    // Natural width: measured while no overshoot styles are applied.
    if (node && !S.wAnim && Math.round(S.natural * Math.max(S.w, 0)) <= S.natural)
      S.natural = node.getBoundingClientRect().width;
    const run = (key: 'w' | 'a', animKey: 'wAnim' | 'aAnim', spring: typeof widthSpring) => {
      if (!spring) {
        S[animKey]?.stop();
        S[animKey] = null;
        S[key] = target;
        return;
      }
      const running = S[animKey];
      if (running) return running.retarget(target);
      if (S[key] === target) return;
      S[animKey] = animateSpring({
        spring,
        from: S[key],
        to: target,
        onUpdate: (v) => {
          S[key] = v;
          apply();
          report();
        },
        onComplete: () => {
          S[animKey] = null;
          apply();
          report();
        },
      });
    };
    run('w', 'wAnim', widthSpring);
    run('a', 'aAnim', alphaSpring);
    apply();
    report();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.visible, ctx.animated]);

  useEffect(
    () => () => {
      const S = st.current;
      S.wAnim?.stop();
      S.aAnim?.stop();
      if (S.shown) {
        S.shown = false;
        ctxRef.current.onShown(ctxRef.current.index, false);
      }
    },
    [],
  );
}
