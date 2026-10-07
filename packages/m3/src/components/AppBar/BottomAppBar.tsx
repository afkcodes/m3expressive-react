import { useEffect, useRef, useState, type ComponentPropsWithRef, type ReactNode, type RefObject } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { useSpringToken } from '../../motion/context.tsx';
import { useMergedRefs } from '../../hooks/useMergedRefs.ts';
import { useRovingTabStop } from '../../hooks/useRovingTabStop.ts';
import type { SxProps } from '../../primitives/types.ts';
import { useExitAlwaysOffset } from './exitAlways.ts';
import { onScrollEnd, onUserScroll } from './scrollEvents.ts';

/** The kit's bottom app bar height. */
const BOTTOM_HEIGHT = 80;

/* Bottom app bar — kit geometry and motion in ./AppBar.tsx. */
const s = stylex.create({
  bottom: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    boxSizing: 'border-box',
    width: '100%',
    height: BOTTOM_HEIGHT,
    paddingInlineStart: 4,
    paddingInlineEnd: 16,
    backgroundColor: color.surfaceContainer,
  },
  // exitAlways: the bar's height gives way to the scroll (written per frame); its content stays
  // top-placed and clips.
  bottomClip: { display: 'block', flexShrink: 0, width: '100%', height: BOTTOM_HEIGHT, overflow: 'hidden' },
  bottomActions: { display: 'flex', alignItems: 'center', columnGap: 8 },
  bottomFab: { marginInlineStart: 'auto', display: 'flex' },
});

/**
 * `ref`, native props and `sx` go to the root: the `role="toolbar"` bar, or — with a
 * `scrollTarget` — the clip that hides it. `aria-label` / `aria-labelledby` always name the bar.
 */
export interface BottomAppBarProps extends SxProps<Omit<ComponentPropsWithRef<'div'>, 'children'>> {
  /** Icon buttons, from the start. */
  actions?: ReactNode;
  /** A FAB at the end (use `Fab elevated={false}`: the kit's bottom-bar FAB has no shadow). */
  fab?: ReactNode;
  /**
   * The scroll container above the bar: scrolling its content up hides the bar, any scroll back
   * shows it again (Compose BottomAppBarDefaults.exitAlwaysScrollBehavior).
   */
  scrollTarget?: RefObject<HTMLElement | null>;
}

const hiddenLimit = () => -BOTTOM_HEIGHT;

/**
 * exitAlways: the height offset follows every scroll delta (clamped to the bar's height); a
 * scroll that stops with the bar part-hidden snaps it (f < 0.5 shows) on fast spatial
 * (BottomAppBarDefaults.snapAnimationSpec), clamped like BottomAppBarState.heightOffset. The
 * height is written to the clip element per change; React renders only when the bar becomes fully hidden or
 * shows again (inert).
 */
function useBottomBarExitAlways(target: RefObject<HTMLElement | null> | undefined) {
  const clip = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);
  const spring = useSpringToken('fast-spatial');
  const offset = useExitAlwaysOffset(
    (value) => {
      const height = BOTTOM_HEIGHT + Math.min(0, Math.max(-BOTTOM_HEIGHT, value));
      if (clip.current) clip.current.style.height = `${height}px`;
      setHidden(height <= 0);
    },
    hiddenLimit,
    spring,
  );
  useEffect(() => {
    const el = target?.current;
    if (!el) return undefined;
    let last = el.scrollTop;
    let lastClient = el.clientHeight;
    const onScroll = () => {
      const top = el.scrollTop;
      const delta = top - last;
      const resized = el.clientHeight !== lastClient;
      last = top;
      lastClient = el.clientHeight;
      // The scroller grows as the bar hides; a clamp at the end of its content isn't a user scroll.
      if (resized && top >= el.scrollHeight - el.clientHeight - 0.5) return;
      if (delta !== 0 && !offset.settling) offset.follow(-delta);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    const offEnd = onScrollEnd(el, () => offset.settle());
    const offUser = onUserScroll(el, () => offset.stop());
    return () => {
      offset.stop();
      el.removeEventListener('scroll', onScroll);
      offEnd();
      offUser();
    };
  }, [target, offset]);
  return { clipRef: clip, hidden };
}

/**
 * Baseline bottom app bar: 80px Surface Container, actions from the start, FAB at the end. A
 * toolbar: one tab stop, arrow keys move between its buttons. Hidden by the scroll, it leaves the
 * tab order (inert) until it shows again.
 */
export function BottomAppBar({
  actions,
  fab,
  scrollTarget,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  sx,
  ref: refProp,
  ...rest
}: BottomAppBarProps) {
  const { clipRef, hidden } = useBottomBarExitAlways(scrollTarget);
  const clipped = scrollTarget != null;
  const ref = useRef<HTMLDivElement>(null);
  // Without a scroll target the bar is the root.
  const setRef = useMergedRefs(ref, clipped ? null : refProp);
  const setClip = useMergedRefs(clipRef, clipped ? refProp : null);
  const { onFocus, onKeyDown } = useRovingTabStop(ref, false);
  const bar = (
    <div
      ref={setRef}
      role="toolbar"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      {...(clipped ? null : rest)}
      // The roving tab stop runs after the app's own handlers (on the bar when it is the root).
      onFocus={(e) => {
        if (!clipped) rest.onFocus?.(e);
        onFocus(e);
      }}
      onKeyDown={(e) => {
        if (!clipped) rest.onKeyDown?.(e);
        onKeyDown(e);
      }}
      {...stylex.props(s.bottom, !clipped && sx)}
    >
      {actions != null && <div {...stylex.props(s.bottomActions)}>{actions}</div>}
      {fab != null && <div {...stylex.props(s.bottomFab)}>{fab}</div>}
    </div>
  );
  if (!clipped) return bar;
  return (
    <div ref={setClip} inert={hidden || undefined} {...rest} {...stylex.props(s.bottomClip, sx)}>
      {bar}
    </div>
  );
}
