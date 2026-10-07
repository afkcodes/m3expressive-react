import {
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { useSpringToken } from '../../motion/context.tsx';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';
import type { SpringParams } from '../../motion/spring.ts';
import { List } from '../List/List.tsx';
import { ForceStateBoundary } from '../../testing/ForceState.tsx';
import { cubicBezier, tween } from '../../motion/gesture.ts';
import { SearchBar } from './SearchBar.tsx';
import { searchViewVars } from './searchView.stylex.ts';

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
 * Focus: expanding from a bar (`expandedFrom`) moves focus to the input; collapsing returns it to
 * the bar's trigger (when it was in the view); Tab stays inside the full-screen view while it's
 * open; Escape asks to collapse (`onDismiss` / `onOpenChange(false)`).
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

const TABBABLE = 'a[href], button, input, select, textarea, [tabindex]';
const tabbables = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (el) => el.tabIndex >= 0 && !el.matches(':disabled') && !el.closest('[inert]') && el.getClientRects().length > 0,
  );

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
  /** Escape (Compose: back): collapse the view (set `open` false). Focus returns to the bar. */
  onDismiss?: () => void;
  /** Called with false on Escape, like `onDismiss` (for a controlled `open`). */
  onOpenChange?: (open: boolean) => void;
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
  /** Docked: the results' height for the slide, measured once per slide (not every frame). */
  slideHeight: number | null;
  dropdown: boolean;
  spring: SpringAnimation | null;
  slideSpring: SpringAnimation | null;
  fade: (() => void) | null;
  from: DOMRect | null;
  to: DOMRect | null;
}

const lerp = (from: number, to: number, fraction: number) => from + (to - from) * fraction;

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
  onOpenChange,
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
  const motionRef = useRef<Motion | null>(null);
  // Animation callbacks outlive renders: they read the latest props here (updated before the
  // effects below run).
  const props = useRef({ full, expandSpec, collapseSpec, onCollapsed });
  useLayoutEffect(() => {
    props.current = { full, expandSpec, collapseSpec, onCollapsed };
  });

  const apply = () => {
    const motion = motionRef.current;
    if (!motion) return;
    const progress = Math.min(1, Math.max(0, motion.p));
    const barEl = bar.current;
    const resultsEl = results.current;
    if (props.current.full) {
      root.current?.style.setProperty('--m3-search-surface-alpha', String(progress));
      let dy = 0;
      if (barEl && motion.from && motion.to) {
        const { from, to } = motion;
        const width = lerp(from.width, to.width, motion.p);
        const centreX = lerp(from.left + from.width / 2, to.left + to.width / 2, motion.p);
        dy = lerp(from.top, to.top, progress) - to.top;
        barEl.style.width = `${width}px`;
        barEl.style.transform = `translate(${centreX - width / 2 - to.left}px, ${dy}px)`;
      }
      if (resultsEl) {
        resultsEl.style.opacity = String(motion.c);
        resultsEl.style.transform = dy ? `translateY(${dy}px)` : '';
      }
    } else if (resultsEl) {
      resultsEl.style.opacity = String(motion.c);
      resultsEl.style.visibility = motion.dropdown || motion.slideSpring ? '' : 'hidden';
      const list = resultsEl.firstElementChild as HTMLElement | null;
      if (list) {
        if (motion.slide === 1) list.style.transform = '';
        else {
          motion.slideHeight ??= resultsEl.offsetHeight;
          list.style.transform = `translateY(${(-motion.slideHeight / 2) * (1 - motion.slide)}px)`;
        }
      }
    }
  };
  const clear = () => {
    const barEl = bar.current;
    if (barEl) {
      barEl.style.width = '';
      barEl.style.transform = '';
    }
    const resultsEl = results.current;
    if (resultsEl) {
      resultsEl.style.opacity = '';
      resultsEl.style.transform = '';
      resultsEl.style.visibility = '';
      const list = resultsEl.firstElementChild as HTMLElement | null;
      if (list) list.style.transform = '';
    }
    root.current?.style.removeProperty('--m3-search-surface-alpha');
  };
  /** Everything at rest: expanded → drop the inline motion styles; collapsed → unmount. */
  const settled = () => {
    const motion = motionRef.current;
    if (!motion || motion.spring || motion.slideSpring || motion.fade) return;
    if (motion.open) clear();
    else {
      motionRef.current = null;
      setMounted(false);
      props.current.onCollapsed?.();
    }
  };
  // Docked dropdown: AnimatedVisibility(visible = progress > 0.1 && target == Expanded), sliding
  // on the expand spec in and the collapse spec out.
  const setDropdown = (visible: boolean) => {
    const motion = motionRef.current;
    if (!motion || props.current.full || motion.dropdown === visible) return;
    motion.dropdown = visible;
    motion.slideHeight = null;
    const spec = visible ? props.current.expandSpec : props.current.collapseSpec;
    const to = visible ? 1 : 0;
    if (!spec) {
      motion.slideSpring?.stop();
      motion.slideSpring = null;
      motion.slide = to;
      apply();
      return;
    }
    if (motion.slideSpring) motion.slideSpring.retarget(to, spec);
    else
      motion.slideSpring = animateSpring({
        spring: spec,
        from: motion.slide,
        to,
        onUpdate: (v) => {
          motion.slide = v;
          apply();
        },
        onComplete: () => {
          motion.slideSpring = null;
          apply();
          settled();
        },
      });
  };

  // Focus follows the expansion: into the input when the view opens from a bar, back to the bar's
  // trigger when it collapses (if focus was in the view, or nowhere).
  const wasOpen = useRef(false);
  useLayoutEffect(() => {
    if (!mounted) return;
    const from = expandedFrom?.current;
    if (open && !wasOpen.current && from) {
      bar.current?.querySelector('input')?.focus({ preventScroll: true });
    } else if (!open && wasOpen.current && from) {
      const active = document.activeElement;
      if (!active || active === document.body || root.current?.contains(active)) {
        const trigger = from.querySelector<HTMLElement>('[data-search-trigger]') ?? tabbables(from)[0];
        trigger?.focus({ preventScroll: true });
      }
    }
    wasOpen.current = open;
  }, [open, mounted, expandedFrom]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && (onDismiss || onOpenChange)) {
      e.stopPropagation();
      onDismiss?.();
      onOpenChange?.(false);
      return;
    }
    // Full screen covers the page: Tab cycles through the view.
    const el = root.current;
    if (e.key !== 'Tab' || !full || !open || !el) return;
    const list = tabbables(el);
    const active = document.activeElement;
    if (list.length === 0 || !active) {
      e.preventDefault();
      return;
    }
    const following = (other: Element) => !!(active.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING);
    const preceding = (other: Element) => !!(active.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_PRECEDING);
    if (e.shiftKey ? !list.some(preceding) : !list.some(following)) {
      e.preventDefault();
      (e.shiftKey ? list.at(-1) : list[0])?.focus();
    }
  };

  // Each change of `open` (and the mount) starts the motion towards it, from wherever it is.
  const startMotion = useEffectEvent((open: boolean) => {
    // Without a bar to expand from (static layouts), the view starts expanded.
    const animateIn = motionRef.current == null && open && expandedFrom?.current != null;
    const motion = (motionRef.current ??= {
      open,
      p: animateIn ? 0 : 1,
      c: animateIn ? 0 : 1,
      slide: animateIn ? 0 : 1,
      slideHeight: null,
      dropdown: !animateIn,
      spring: null,
      slideSpring: null,
      fade: null,
      from: null,
      to: null,
    });
    motion.open = open;
    const target = open ? 1 : 0;

    // The bar's rest box and the collapsed bar's box.
    if (full && bar.current) {
      const barEl = bar.current;
      const { width, transform } = barEl.style;
      barEl.style.width = '';
      barEl.style.transform = '';
      motion.to = barEl.getBoundingClientRect();
      barEl.style.width = width;
      barEl.style.transform = transform;
      motion.from = expandedFrom?.current?.getBoundingClientRect() ?? null;
    }
    if (!open) setDropdown(false);

    // The progress spring (retargeting keeps its velocity, as Compose's Animatable).
    const spec: SpringParams | null = open ? expandSpec : collapseSpec;
    if (!spec || motion.p === target) {
      motion.spring?.stop();
      motion.spring = null;
      motion.p = target;
      if (open) setDropdown(true);
    } else if (motion.spring) motion.spring.retarget(target, spec);
    else
      motion.spring = animateSpring({
        spring: spec,
        from: motion.p,
        to: target,
        onUpdate: (v) => {
          motion.p = v;
          if (motion.open && v > 0.1) setDropdown(true);
          apply();
        },
        onComplete: () => {
          motion.spring = null;
          settled();
        },
      });

    // contentProgress: tweens, restarted from where they are.
    motion.fade?.();
    motion.fade = null;
    if (motion.c !== target)
      motion.fade = tween({
        from: motion.c,
        to: target,
        duration: FADE_DURATION,
        delay: open ? FADE_IN_DELAY : 0,
        easing: open ? FADE_IN : FADE_OUT,
        onUpdate: (v) => {
          motion.c = v;
          apply();
        },
        onComplete: () => {
          motion.fade = null;
          settled();
        },
      });
    apply();
    settled();
  });
  useLayoutEffect(() => {
    if (mounted) startMotion(open);
  }, [open, mounted]);

  useLayoutEffect(
    () => () => {
      motionRef.current?.spring?.stop();
      motionRef.current?.slideSpring?.stop();
      motionRef.current?.fade?.();
    },
    [],
  );

  if (!mounted) return null;
  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- Escape / Tab bubbling up from the field / results (delegation)
    <div
      ref={root}
      inert={!open || undefined}
      onKeyDown={onKeyDown}
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
