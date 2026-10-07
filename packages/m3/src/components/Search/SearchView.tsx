import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex';
import { useSpringToken } from '../../motion/context.tsx';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';
import type { SpringParams } from '../../motion/spring.ts';
import { List } from '../List/List.tsx';
import { ForceStateBoundary } from '../../testing/ForceState.tsx';
import { cubicBezier, tween } from '../../motion/gesture.ts';
import { SearchBar } from './SearchBar.tsx';
import { searchViewVars } from './searchView.stylex';

/*
 * Figma kit, "Search full-screen layout" / "Search docked layout" (59178:4963 / 4992; Compose
 * ExpandedFullScreenContainedSearchBar / ExpandedDockedSearchBarWithGap — the kit's geometry wins,
 * e.g. the 12px input inset).
 *   Full screen: the input bar 12px in from the sides over results 2px below, in a 16px-cornered
 *   surface (results clipped to 12px corners). Docked: the 360px bar over a Surface Container High
 *   result panel (12px corners) 2px below.
 * Motion (Compose SearchBarState, SearchBar.kt):
 *   - one progress drives the layout: full screen expands and collapses on fast spatial
 *     (rememberContainedSearchBarState), docked expands on default spatial and collapses on fast
 *     spatial (rememberSearchBarWithGapState);
 *   - full screen: the surface is full size at once with alpha = progress; the input's width lerps
 *     from the collapsed bar's width to the view's (minus its insets) and its centre from the
 *     collapsed bar's, its top from the bar's top (FullScreenSearchBarLayout); the results follow
 *     below it;
 *   - results fade with contentProgress: in 100ms after 50ms on standard accelerate
 *     (0.3, 0, 1, 1), out 100ms on standard decelerate (0, 0, 0, 1);
 *   - docked: the result panel shows once progress > 0.1, its list sliding in from −height/2 on
 *     the expand spring (out on the collapse spring), at alpha = contentProgress;
 *   - collapsing keeps the view mounted until the motion ends (content fades first), then it
 *     unmounts and calls onCollapsed.
 */
const s = stylex.create({
  view: {
    position: 'relative',
    isolation: 'isolate',
    display: 'flex',
    flexDirection: 'column',
    rowGap: 2,
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  fullScreen: {
    borderRadius: 16,
    // The surface (searchViewVars.containerColor), faded by the expand progress.
    '::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      zIndex: -1,
      borderRadius: 'inherit',
      backgroundColor: searchViewVars.containerColor,
      opacity: 'var(--m3-search-surface-alpha, 1)',
      pointerEvents: 'none',
    },
  },
  header: { flexShrink: 0 },
  headerFull: { paddingInline: 12 },
  results: { overflow: 'hidden', borderRadius: 12 },
  resultsDocked: { backgroundColor: color.surfaceContainerHigh },
});

const FADE_IN = cubicBezier(0.3, 0, 1, 1); // MotionTokens.EasingStandardAccelerateCubicBezier
const FADE_OUT = cubicBezier(0, 0, 0, 1); // MotionTokens.EasingStandardDecelerateCubicBezier
const FADE_DURATION = 100; // DurationShort2
const FADE_IN_DELAY = 50; // DurationShort1

export interface SearchViewProps {
  mode?: 'full-screen' | 'docked';
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Leading icon button (typically "back", closing the view). */
  leading?: ReactNode;
  /** Trailing icon buttons (clear / voice). */
  trailing?: ReactNode;
  /** Result rows (`ListItem`s). */
  children?: ReactNode;
  autoFocus?: boolean;
  /** Escape (Compose: back) — close the view and return focus to the bar. */
  onDismiss?: () => void;
  /**
   * Expanded (default true). Set false to collapse: the view animates back and then unmounts
   * itself (keep rendering it), calling `onCollapsed`.
   */
  open?: boolean;
  /** The collapsed `SearchBar` the view expands from and collapses into. */
  expandedFrom?: RefObject<HTMLElement | null>;
  onCollapsed?: () => void;
  'aria-label'?: string;
  sx?: StyleXStyles;
}

interface Motion {
  open: boolean;
  /** Expand progress (Compose animatable.value; may overshoot). */
  p: number;
  /** contentProgress. */
  c: number;
  /** Docked: the dropdown's slide (0 = −height/2, 1 = in place). */
  slide: number;
  dropdown: boolean;
  spring: SpringAnimation | null;
  slideSpring: SpringAnimation | null;
  fade: (() => void) | null;
  from: DOMRect | null;
  to: DOMRect | null;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The expanded search: an input bar over its results (place it in a dialog / popover). */
export function SearchView({
  mode = 'full-screen',
  value,
  onValueChange,
  placeholder,
  leading,
  trailing,
  children,
  autoFocus,
  onDismiss,
  open = true,
  expandedFrom,
  onCollapsed,
  'aria-label': ariaLabel,
  sx,
}: SearchViewProps) {
  const full = mode === 'full-screen';
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const expandSpec = useSpringToken(full ? 'fast-spatial' : 'default-spatial');
  const collapseSpec = useSpringToken('fast-spatial');
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const m = useRef<Motion | null>(null);
  // Animation callbacks outlive renders: they read everything through refs.
  const props = useRef({ full, expandSpec, collapseSpec, onCollapsed });
  props.current = { full, expandSpec, collapseSpec, onCollapsed };

  const apply = () => {
    const st = m.current;
    if (!st) return;
    const prog = Math.min(1, Math.max(0, st.p));
    const b = bar.current;
    const res = results.current;
    if (props.current.full) {
      root.current?.style.setProperty('--m3-search-surface-alpha', String(prog));
      let dy = 0;
      if (b && st.from && st.to) {
        const { from, to } = st;
        const w = lerp(from.width, to.width, st.p);
        const cx = lerp(from.left + from.width / 2, to.left + to.width / 2, st.p);
        dy = lerp(from.top, to.top, prog) - to.top;
        b.style.width = `${w}px`;
        b.style.transform = `translate(${cx - w / 2 - to.left}px, ${dy}px)`;
      }
      if (res) {
        res.style.opacity = String(st.c);
        res.style.transform = dy ? `translateY(${dy}px)` : '';
      }
    } else if (res) {
      res.style.opacity = String(st.c);
      res.style.visibility = st.dropdown || st.slideSpring ? '' : 'hidden';
      const list = res.firstElementChild as HTMLElement | null;
      if (list) list.style.transform = st.slide === 1 ? '' : `translateY(${(-res.offsetHeight / 2) * (1 - st.slide)}px)`;
    }
  };
  const clear = () => {
    const b = bar.current;
    if (b) {
      b.style.width = '';
      b.style.transform = '';
    }
    const res = results.current;
    if (res) {
      res.style.opacity = '';
      res.style.transform = '';
      res.style.visibility = '';
      const list = res.firstElementChild as HTMLElement | null;
      if (list) list.style.transform = '';
    }
    root.current?.style.removeProperty('--m3-search-surface-alpha');
  };
  /** Everything at rest: expanded → drop the inline motion styles; collapsed → unmount. */
  const settled = () => {
    const st = m.current;
    if (!st || st.spring || st.slideSpring || st.fade) return;
    if (st.open) clear();
    else {
      m.current = null;
      setMounted(false);
      props.current.onCollapsed?.();
    }
  };
  // Docked dropdown: AnimatedVisibility(visible = progress > 0.1 && target == Expanded), sliding
  // on the expand spec in and the collapse spec out.
  const setDropdown = (visible: boolean) => {
    const st = m.current;
    if (!st || props.current.full || st.dropdown === visible) return;
    st.dropdown = visible;
    const spec = visible ? props.current.expandSpec : props.current.collapseSpec;
    const to = visible ? 1 : 0;
    if (!spec) {
      st.slideSpring?.stop();
      st.slideSpring = null;
      st.slide = to;
      apply();
      return;
    }
    if (st.slideSpring) st.slideSpring.retarget(to, spec);
    else
      st.slideSpring = animateSpring({
        spring: spec,
        from: st.slide,
        to,
        onUpdate: (v) => {
          st.slide = v;
          apply();
        },
        onComplete: () => {
          st.slideSpring = null;
          apply();
          settled();
        },
      });
  };

  useLayoutEffect(() => {
    if (!mounted) return;
    // Without a bar to expand from (static layouts), the view starts expanded.
    const animateIn = m.current == null && open && expandedFrom?.current != null;
    const st = (m.current ??= {
      open,
      p: animateIn ? 0 : 1,
      c: animateIn ? 0 : 1,
      slide: animateIn ? 0 : 1,
      dropdown: !animateIn,
      spring: null,
      slideSpring: null,
      fade: null,
      from: null,
      to: null,
    });
    st.open = open;
    const target = open ? 1 : 0;

    // The bar's rest box and the collapsed bar's box.
    if (full && bar.current) {
      const b = bar.current;
      const { width, transform } = b.style;
      b.style.width = '';
      b.style.transform = '';
      st.to = b.getBoundingClientRect();
      b.style.width = width;
      b.style.transform = transform;
      st.from = expandedFrom?.current?.getBoundingClientRect() ?? null;
    }
    if (!open) setDropdown(false);

    // The progress spring (retargeting keeps its velocity, as Compose's Animatable).
    const spec: SpringParams | null = open ? expandSpec : collapseSpec;
    if (!spec || st.p === target) {
      st.spring?.stop();
      st.spring = null;
      st.p = target;
      if (open) setDropdown(true);
    } else if (st.spring) st.spring.retarget(target, spec);
    else
      st.spring = animateSpring({
        spring: spec,
        from: st.p,
        to: target,
        onUpdate: (v) => {
          st.p = v;
          if (st.open && v > 0.1) setDropdown(true);
          apply();
        },
        onComplete: () => {
          st.spring = null;
          settled();
        },
      });

    // contentProgress: tweens, restarted from where they are.
    st.fade?.();
    st.fade = null;
    if (st.c !== target)
      st.fade = tween({
        from: st.c,
        to: target,
        duration: FADE_DURATION,
        delay: open ? FADE_IN_DELAY : 0,
        easing: open ? FADE_IN : FADE_OUT,
        onUpdate: (v) => {
          st.c = v;
          apply();
        },
        onComplete: () => {
          st.fade = null;
          settled();
        },
      });
    apply();
    settled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted]);

  useLayoutEffect(
    () => () => {
      m.current?.spring?.stop();
      m.current?.slideSpring?.stop();
      m.current?.fade?.();
    },
    [],
  );

  if (!mounted) return null;
  return (
    <div
      ref={root}
      inert={!open || undefined}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && onDismiss) {
          e.stopPropagation();
          onDismiss();
        }
      }}
      {...stylex.props(s.view, full && s.fullScreen, sx)}
    >
      <div {...stylex.props(s.header, full && s.headerFull)}>
        <SearchBar
          ref={bar}
          value={value}
          onValueChange={onValueChange}
          placeholder={placeholder}
          leading={leading}
          trailing={trailing}
          autoFocus={autoFocus}
          aria-label={ariaLabel}
        />
      </div>
      {children != null && (
        <div ref={results} {...stylex.props(s.results, !full && s.resultsDocked)}>
          <ForceStateBoundary>
            <List aria-label="Results">{children}</List>
          </ForceStateBoundary>
        </div>
      )}
    </div>
  );
}
