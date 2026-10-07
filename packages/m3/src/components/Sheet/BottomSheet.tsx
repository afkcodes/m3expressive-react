import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Dialog } from '@base-ui/react/dialog';
import { color } from '../../tokens/color.stylex.ts';
import { state } from '../../tokens/state.stylex.ts';
import { elevation } from '../../tokens/elevation.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { usePortalContainer } from '../../theme/portal.tsx';
import { useSpringToken } from '../../motion/context.tsx';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';
import {
  computeAnchorTarget,
  closestAnchor,
  MAX_FLING_VELOCITY,
  PointerVelocityTracker,
  pointerSlop,
  suppressNextClick,
  TOUCH_SLOP,
} from '../../motion/gesture.ts';
import { isNoDragTarget } from './dragGuard.ts';
import { scrim } from '../../primitives/scrim.ts';

/*
 * Figma kit, "Sheets" page (Bottom sheet set 51827:5859; Compose ModalBottomSheet /
 * BottomSheetScaffold, BottomSheetDefaults).
 *   Surface Container Low, 28px top corners, a 36px header holding the 32×4 Outline drag handle
 *   (16px padding), then the content. Standard sheets cast elevation 3; modal sheets sit flat on a
 *   32% Scrim.
 * Motion (Compose BottomSheet / ModalBottomSheet / AnchoredDraggable):
 *   - show on the default spatial spring (showMotionSpec), hide on fast effects (hideMotionSpec);
 *     the spring's overshoot lifts the sheet above its rest, so the surface continues below its
 *     bottom edge (Compose scales the layer up: SheetDefaults verticalScaleUp);
 *   - the whole surface drags (the handle and, while it isn't scrolled, the content), clamped to
 *     Expanded…Hidden (AnchoredDraggableState.newOffsetForDelta — no rubber band);
 *   - release: Compose's VelocityTracker (Lsq2), the boundary dampening near Hidden (125dp zone),
 *     then AnchoredDraggable.computeTarget with 56dp / 125dp/s (PositionalThreshold /
 *     VelocityThreshold) and a default spatial spring from the release velocity
 *     (anchoredDraggableMotionSpec, both directions); a sheet that settles at Hidden is dismissed
 *     once the spring ends;
 *   - the scrim follows targetValue != Hidden (the closest anchor while dragging, the target while
 *     settling), fading on default effects.
 */
const s = stylex.create({
  sheet: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    width: '100%',
    maxWidth: 640,
    overflow: 'hidden',
    color: color.onSurface,
    backgroundColor: color.surfaceContainerLow,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  standard: { boxShadow: elevation.level3 },
  header: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    flexShrink: 0,
    padding: 16,
    touchAction: 'none',
  },
  handleButton: {
    position: 'relative',
    margin: 0,
    borderWidth: 0,
    borderStyle: 'none',
    backgroundColor: 'transparent',
    cursor: 'grab',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    outlineOffset: state.focusIndicatorOuterOffset,
    // Hit target centred on the handle, like Compose's DragHandle with its 48dp minimum interactive
    // size: 48px wide × the kit's 36px header. The drawn handle and its focus ring stay 32×4.
    '::after': { content: '""', position: 'absolute', top: -16, bottom: -16, left: -8, right: -8 },
  },
  handle: { display: 'block', width: 32, height: 4, borderRadius: 2, backgroundColor: color.outline },
  content: { flexGrow: 1, minHeight: 0, overflowY: 'auto' },
  // Modal placement and motion. The popup spans the width; only the sheet takes pointer input, so a
  // press beside a narrower sheet reaches the scrim.
  popup: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    maxHeight: 'calc(100% - 72px)',
    outlineStyle: 'none',
    pointerEvents: 'none',
    translate: { default: '0 0', ':is([data-starting-style], [data-ending-style])': '0 100%' },
    transitionProperty: 'translate',
    transitionDuration: {
      default: motion.defaultSpatialDuration,
      ':is([data-ending-style])': motion.fastEffectsDuration,
    },
    transitionTimingFunction: {
      default: motion.defaultSpatialEasing,
      ':is([data-ending-style])': motion.fastEffectsEasing,
    },
    // The surface continued below the sheet: the show spring overshoots (~1.5% of the travel on
    // expressive default spatial) and a fling settles past Expanded, which would open a gap.
    '::after': {
      content: '""',
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      width: '100%',
      maxWidth: 640,
      height: '100%',
      marginInline: 'auto',
      backgroundColor: color.surfaceContainerLow,
    },
  },
  popupSheet: { maxHeight: '100%', pointerEvents: 'auto' },
});

export interface BottomSheetProps {
  /** Modal styling (flat, over a scrim). `ModalBottomSheet` sets it. */
  modal?: boolean;
  /** The drag handle (default true). */
  dragHandle?: boolean;
  /** Accessible name of the handle when it can dismiss the sheet. */
  handleLabel?: string;
  /** Activating the handle (click / Enter) dismisses the sheet. */
  onHandleActivate?: () => void;
  onHandlePointerDown?: (e: ReactPointerEvent<HTMLElement>) => void;
  /** Pointer down anywhere on the sheet (a modal sheet drags from its whole surface). */
  onSurfacePointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  /** The scrolling content element. */
  contentRef?: Ref<HTMLDivElement>;
  children?: ReactNode;
  sx?: StyleXStyles;
}

/** The bottom sheet surface (standard sheets sit in the layout; see `ModalBottomSheet`). */
export const BottomSheet = forwardRef<HTMLDivElement, BottomSheetProps>(function BottomSheet(
  {
    modal = false,
    dragHandle = true,
    handleLabel = 'Close sheet',
    onHandleActivate,
    onHandlePointerDown,
    onSurfacePointerDown,
    contentRef,
    children,
    sx,
  },
  ref,
) {
  return (
    <div ref={ref} onPointerDown={onSurfacePointerDown} {...stylex.props(s.sheet, !modal && s.standard, sx)}>
      {dragHandle && (
        <div data-sheet-header="" onPointerDown={onHandlePointerDown} {...stylex.props(s.header)}>
          {onHandleActivate ? (
            <button
              type="button"
              aria-label={handleLabel}
              onClick={onHandleActivate}
              {...stylex.props(s.handleButton, s.handle)}
            />
          ) : (
            <span aria-hidden {...stylex.props(s.handle)} />
          )}
        </div>
      )}
      <div ref={contentRef} {...stylex.props(s.content)}>
        {children}
      </div>
    </div>
  );
});

/** BottomSheetDefaults.PositionalThreshold (56dp) / VelocityThreshold (125dp/s) / BoundaryDampeningZone (125dp). */
const POSITIONAL_THRESHOLD = 56;
const VELOCITY_THRESHOLD = 125;
const BOUNDARY_DAMPENING_ZONE = 125;

export interface ModalBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dragHandle?: boolean;
  'aria-label'?: string;
  children?: ReactNode;
  sx?: StyleXStyles;
}

interface Drag {
  y0: number;
  start: number;
  active: boolean;
  slop: number;
  tracker: PointerVelocityTracker;
}

/** A modal bottom sheet: scrim, focus trap, Escape / scrim / handle / drag to dismiss. */
export function ModalBottomSheet({
  open,
  onOpenChange,
  dragHandle = true,
  'aria-label': ariaLabel,
  children,
  sx,
}: ModalBottomSheetProps) {
  const portal = usePortalContainer();
  const popup = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement | null>(null);
  const settleSpec = useSpringToken('default-spatial');
  const settle = useRef<SpringAnimation | null>(null);
  const offset = useRef(0);
  /** Ends the pointer gesture in progress (its window listeners); null when there is none. */
  const gesture = useRef<(() => void) | null>(null);
  /**
   * The touch pointerdown's verdict for the content's touchstart that follows it: a TouchEvent
   * can't tell whether a descendant (a slider) captured the pointer.
   */
  const touchExempt = useRef(false);
  // Gesture and settle callbacks outlive the render that created them: they read the latest
  // props here.
  const latest = useRef({ onOpenChange, settleSpec });
  useLayoutEffect(() => {
    latest.current = { onOpenChange, settleSpec };
  });

  const hiddenAnchor = () => popup.current?.offsetHeight ?? 0;
  const place = (y: number) => {
    offset.current = y;
    if (popup.current) popup.current.style.translate = `0 ${y}px`;
  };
  const showScrim = (visible: boolean) => {
    if (backdrop.current) backdrop.current.style.opacity = visible ? '' : '0';
  };
  const reset = () => {
    settle.current?.stop();
    settle.current = null;
    offset.current = 0;
    const el = popup.current;
    if (el) {
      el.style.translate = '';
      el.style.transition = '';
    }
    showScrim(true);
  };
  /** Drop the gesture and the settle; the sheet goes back to its CSS motion from wherever it is. */
  const interrupt = () => {
    gesture.current?.();
    settle.current?.stop();
    settle.current = null;
    const el = popup.current;
    if (el && el.style.translate) {
      el.style.transition = '';
      el.style.translate = '';
    }
  };

  /** A drag begins (after the slop, or at once over a settling sheet — startDragImmediately). */
  const begin = (d: Drag) => {
    d.active = true;
    const el = popup.current;
    if (!el) return;
    if (settle.current) {
      settle.current.stop();
      settle.current = null;
    } else {
      // Take over from the CSS show transition wherever it is (offsetTop ignores the translate).
      offset.current = el.getBoundingClientRect().top - el.offsetTop;
    }
    d.start = offset.current;
    el.style.transition = 'none';
    place(offset.current);
  };

  const moveTo = (d: Drag, clientY: number) => {
    const H = hiddenAnchor();
    place(Math.min(H, Math.max(0, d.start + clientY - d.y0)));
    // targetValue while dragging: the closest anchor.
    showScrim(closestAnchor([0, H], offset.current) !== H);
  };

  const release = (d: Drag) => {
    const H = hiddenAnchor();
    const initial = d.tracker.velocity(MAX_FLING_VELOCITY).y;
    // modalBottomSheetFlingBehavior: dampen a downward fling within 125dp of Hidden.
    let v = initial;
    if (v > 0) {
      const distanceToFloor = Math.max(0, H - offset.current);
      if (distanceToFloor < BOUNDARY_DAMPENING_ZONE) {
        const factor = distanceToFloor / BOUNDARY_DAMPENING_ZONE;
        v *= factor * factor;
        if (initial >= VELOCITY_THRESHOLD) v = Math.max(v, VELOCITY_THRESHOLD);
      }
    }
    const target = computeAnchorTarget([0, H], offset.current, v, () => POSITIONAL_THRESHOLD, VELOCITY_THRESHOLD);
    const hide = target === H;
    showScrim(!hide);
    const done = () => {
      settle.current = null;
      // Settled at Hidden: dismiss (the sheet stays there through the dialog's exit).
      if (hide) latest.current.onOpenChange(false);
      else reset();
    };
    const spring = latest.current.settleSpec;
    if (!spring) {
      place(target);
      done();
      return;
    }
    settle.current = animateSpring({
      spring,
      from: offset.current,
      to: target,
      velocity: v,
      onUpdate: place,
      onComplete: done,
    });
  };

  // Mouse / pen anywhere on the sheet, touch on the handle (touch on the content: below).
  const onSurfacePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const exempt = isNoDragTarget(e.nativeEvent, e.currentTarget);
    if (e.pointerType === 'touch') touchExempt.current = exempt;
    if (e.button !== 0 || !popup.current || exempt) return;
    const target = e.target as Element;
    const inHeader = !!target.closest('[data-sheet-header]');
    if (e.pointerType === 'touch' && !inHeader) return;
    if (!inHeader && (content.current?.scrollTop ?? 0) > 0) return;
    gesture.current?.();
    const tracker = new PointerVelocityTracker();
    tracker.down(e);
    const d: Drag = { y0: e.clientY, start: offset.current, active: false, slop: pointerSlop(e.pointerType), tracker };
    if (settle.current) begin(d);
    const id = e.pointerId;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      // The sheet unmounted under the pointer (closed by a key or by its owner).
      if (!popup.current) {
        end();
        return;
      }
      d.tracker.move(ev);
      if (!d.active) {
        const dy = ev.clientY - d.y0;
        if (Math.abs(dy) <= d.slop) return;
        // The drag starts from the slop's edge (Compose's overSlop).
        d.y0 += Math.sign(dy) * d.slop;
        begin(d);
      }
      moveTo(d, ev.clientY);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      end();
      if (!d.active || !popup.current) return;
      d.tracker.up(ev);
      suppressNextClick();
      release(d);
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (gesture.current === end) gesture.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    gesture.current = end;
  };

  // The content's touch handlers are attached by its ref, whenever the portal mounts it; they
  // reach the current gesture functions through this ref.
  const drag = useRef({ begin, moveTo, release });
  useLayoutEffect(() => {
    drag.current = { begin, moveTo, release };
  });

  // Touch on the content drags the sheet while the content is at its top and the finger moves
  // down (or the content can't scroll); otherwise the content scrolls natively.
  const contentRef = useCallback((el: HTMLDivElement | null) => {
    content.current = el;
    if (!el) return undefined;
    let d: (Drag & { id: number }) | null = null;
    const onStart = (e: TouchEvent) => {
      const exempt = touchExempt.current;
      touchExempt.current = false;
      if (e.touches.length !== 1 || el.scrollTop > 0 || exempt || isNoDragTarget(e, el)) return;
      const t = e.touches[0]!;
      const tracker = new PointerVelocityTracker();
      tracker.down({ timeStamp: e.timeStamp, clientX: t.clientX, clientY: t.clientY });
      d = { id: t.identifier, y0: t.clientY, start: offset.current, active: false, slop: TOUCH_SLOP, tracker };
      if (settle.current) drag.current.begin(d);
    };
    const onMove = (e: TouchEvent) => {
      const t = d && [...e.changedTouches].find((c) => c.identifier === d!.id);
      if (!d || !t) return;
      d.tracker.move({ timeStamp: e.timeStamp, clientX: t.clientX, clientY: t.clientY });
      if (!d.active) {
        const dy = t.clientY - d.y0;
        const scrollable = el.scrollHeight > el.clientHeight;
        if (dy < 0 && scrollable) {
          d = null; // scrolling the content
          return;
        }
        if (e.cancelable) e.preventDefault();
        if (Math.abs(dy) <= d.slop) return;
        d.y0 += Math.sign(dy) * d.slop;
        drag.current.begin(d);
      }
      if (e.cancelable) e.preventDefault();
      drag.current.moveTo(d, t.clientY);
    };
    const onEnd = (e: TouchEvent) => {
      if (!d || ![...e.changedTouches].some((c) => c.identifier === d!.id)) return;
      const ended = d;
      d = null;
      if (!ended.active) return;
      ended.tracker.up({ timeStamp: e.timeStamp });
      drag.current.release(ended);
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      if (content.current === el) content.current = null;
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  // Closed by its owner mid-gesture or mid-settle: drop both and let the CSS hide take over. (A
  // drag that dismissed the sheet has already settled at Hidden and stays there.)
  useEffect(() => {
    if (!open && (gesture.current || settle.current)) interrupt();
  });
  // Unmounted: nothing may run on (or call back from) a sheet that's gone.
  useEffect(
    () => () => {
      gesture.current?.();
      settle.current?.stop();
      settle.current = null;
    },
    [],
  );

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        // Escape / scrim / handle: hand the sheet back to the CSS hide (fast effects) from wherever
        // a drag or settle left it.
        if (!next) interrupt();
        onOpenChange(next);
      }}
    >
      <Dialog.Portal container={portal}>
        <Dialog.Backdrop ref={backdrop} {...stylex.props(scrim.backdrop)} />
        <Dialog.Popup ref={popup} aria-label={ariaLabel} {...stylex.props(s.popup)}>
          <BottomSheet
            modal
            dragHandle={dragHandle}
            onHandleActivate={() => onOpenChange(false)}
            onSurfacePointerDown={onSurfacePointerDown}
            contentRef={contentRef}
            sx={[s.popupSheet, sx]}
          >
            {children}
          </BottomSheet>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
