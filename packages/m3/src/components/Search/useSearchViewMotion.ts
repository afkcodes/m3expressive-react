import { useEffectEvent, useLayoutEffect, useRef, type RefObject } from 'react';
import { useSpringToken } from '../../motion/context.tsx';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';
import type { SpringParams } from '../../motion/spring.ts';
import { cubicBezier, tween } from '../../motion/gesture.ts';

const FADE_IN = cubicBezier(0.3, 0, 1, 1); // MotionTokens.EasingStandardAccelerateCubicBezier
const FADE_OUT = cubicBezier(0, 0, 0, 1); // MotionTokens.EasingStandardDecelerateCubicBezier
const FADE_DURATION = 100; // DurationShort2
const FADE_IN_DELAY = 50; // DurationShort1

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

export interface SearchViewMotionOptions {
  full: boolean;
  open: boolean;
  /** The view is mounted (the motion starts with each change of `open` once it is). */
  mounted: boolean;
  /** The collapsed bar the view expands from (full screen: the input grows from its box). */
  expandedFrom?: RefObject<HTMLElement | null>;
  rootRef: RefObject<HTMLDivElement | null>;
  barRef: RefObject<HTMLDivElement | null>;
  resultsRef: RefObject<HTMLDivElement | null>;
  /** The collapse has finished: unmount the view. */
  onCollapsed: () => void;
}

/**
 * SearchView's expand / collapse (Compose SearchBarState): the progress spring, the docked
 * dropdown's slide and the results' contentProgress fade, written to the view's elements every
 * frame (see SearchView.tsx for the motion spec).
 */
export function useSearchViewMotion({
  full,
  open,
  mounted,
  expandedFrom,
  rootRef,
  barRef,
  resultsRef,
  onCollapsed,
}: SearchViewMotionOptions) {
  const expandSpec = useSpringToken(full ? 'fast-spatial' : 'default-spatial');
  const collapseSpec = useSpringToken('fast-spatial');
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
    const barEl = barRef.current;
    const resultsEl = resultsRef.current;
    if (props.current.full) {
      rootRef.current?.style.setProperty('--m3-search-surface-alpha', String(progress));
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
    const barEl = barRef.current;
    if (barEl) {
      barEl.style.width = '';
      barEl.style.transform = '';
    }
    const resultsEl = resultsRef.current;
    if (resultsEl) {
      resultsEl.style.opacity = '';
      resultsEl.style.transform = '';
      resultsEl.style.visibility = '';
      const list = resultsEl.firstElementChild as HTMLElement | null;
      if (list) list.style.transform = '';
    }
    rootRef.current?.style.removeProperty('--m3-search-surface-alpha');
  };
  /** Everything at rest: expanded → drop the inline motion styles; collapsed → unmount. */
  const settled = () => {
    const motion = motionRef.current;
    if (!motion || motion.spring || motion.slideSpring || motion.fade) return;
    if (motion.open) clear();
    else {
      motionRef.current = null;
      props.current.onCollapsed();
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
    if (full && barRef.current) {
      const barEl = barRef.current;
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
}
