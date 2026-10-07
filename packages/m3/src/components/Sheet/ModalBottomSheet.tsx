import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
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
import { ModalShell } from '../../primitives/ModalShell.tsx';
import { BottomSheet } from './BottomSheet.tsx';
import { isNoDragTarget } from '../../motion/dragGuard.ts';

/* The modal bottom sheet: placement, show / hide and the drag — kit geometry and motion in ./BottomSheet.tsx. */
const s = stylex.create({
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
  /** The Hidden anchor (the sheet's height), measured when the drag begins. */
  hidden: number;
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
  const begin = (drag: Drag) => {
    drag.active = true;
    const el = popup.current;
    if (!el) return;
    // The sheet's height doesn't change while it's dragged: measured once, not on every move.
    drag.hidden = hiddenAnchor();
    if (settle.current) {
      settle.current.stop();
      settle.current = null;
    } else {
      // Take over from the CSS show transition wherever it is (offsetTop ignores the translate).
      offset.current = el.getBoundingClientRect().top - el.offsetTop;
    }
    drag.start = offset.current;
    el.style.transition = 'none';
    place(offset.current);
  };

  const moveTo = (drag: Drag, clientY: number) => {
    place(Math.min(drag.hidden, Math.max(0, drag.start + clientY - drag.y0)));
    // targetValue while dragging: the closest anchor.
    showScrim(closestAnchor([0, drag.hidden], offset.current) !== drag.hidden);
  };

  const release = (drag: Drag) => {
    const initial = drag.tracker.velocity(MAX_FLING_VELOCITY).y;
    // modalBottomSheetFlingBehavior: dampen a downward fling within 125dp of Hidden.
    let velocity = initial;
    if (velocity > 0) {
      const distanceToFloor = Math.max(0, drag.hidden - offset.current);
      if (distanceToFloor < BOUNDARY_DAMPENING_ZONE) {
        const factor = distanceToFloor / BOUNDARY_DAMPENING_ZONE;
        velocity *= factor * factor;
        if (initial >= VELOCITY_THRESHOLD) velocity = Math.max(velocity, VELOCITY_THRESHOLD);
      }
    }
    const target = computeAnchorTarget(
      [0, drag.hidden],
      offset.current,
      velocity,
      () => POSITIONAL_THRESHOLD,
      VELOCITY_THRESHOLD,
    );
    const hide = target === drag.hidden;
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
      velocity,
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
    const drag: Drag = {
      y0: e.clientY,
      start: offset.current,
      active: false,
      slop: pointerSlop(e.pointerType),
      tracker,
      hidden: 0,
    };
    if (settle.current) begin(drag);
    const id = e.pointerId;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      // The sheet unmounted under the pointer (closed by a key or by its owner).
      if (!popup.current) {
        end();
        return;
      }
      drag.tracker.move(ev);
      if (!drag.active) {
        const dy = ev.clientY - drag.y0;
        if (Math.abs(dy) <= drag.slop) return;
        // The drag starts from the slop's edge (Compose's overSlop).
        drag.y0 += Math.sign(dy) * drag.slop;
        begin(drag);
      }
      moveTo(drag, ev.clientY);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      end();
      if (!drag.active || !popup.current) return;
      drag.tracker.up(ev);
      suppressNextClick();
      release(drag);
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
  const handlers = useRef({ begin, moveTo, release });
  useLayoutEffect(() => {
    handlers.current = { begin, moveTo, release };
  });

  // Touch on the content drags the sheet while the content is at its top and the finger moves
  // down (or the content can't scroll); otherwise the content scrolls natively.
  const contentRef = useCallback((el: HTMLDivElement | null) => {
    content.current = el;
    if (!el) return undefined;
    let drag: (Drag & { id: number }) | null = null;
    const onStart = (e: TouchEvent) => {
      const exempt = touchExempt.current;
      touchExempt.current = false;
      if (e.touches.length !== 1 || el.scrollTop > 0 || exempt || isNoDragTarget(e, el)) return;
      const touch = e.touches[0]!;
      const tracker = new PointerVelocityTracker();
      tracker.down({ timeStamp: e.timeStamp, clientX: touch.clientX, clientY: touch.clientY });
      drag = {
        id: touch.identifier,
        y0: touch.clientY,
        start: offset.current,
        active: false,
        slop: TOUCH_SLOP,
        tracker,
        hidden: 0,
      };
      if (settle.current) handlers.current.begin(drag);
    };
    const onMove = (e: TouchEvent) => {
      const touch = drag && [...e.changedTouches].find((c) => c.identifier === drag!.id);
      if (!drag || !touch) return;
      drag.tracker.move({ timeStamp: e.timeStamp, clientX: touch.clientX, clientY: touch.clientY });
      if (!drag.active) {
        const dy = touch.clientY - drag.y0;
        const scrollable = el.scrollHeight > el.clientHeight;
        if (dy < 0 && scrollable) {
          drag = null; // scrolling the content
          return;
        }
        if (e.cancelable) e.preventDefault();
        if (Math.abs(dy) <= drag.slop) return;
        drag.y0 += Math.sign(dy) * drag.slop;
        handlers.current.begin(drag);
      }
      if (e.cancelable) e.preventDefault();
      handlers.current.moveTo(drag, touch.clientY);
    };
    const onEnd = (e: TouchEvent) => {
      if (!drag || ![...e.changedTouches].some((c) => c.identifier === drag!.id)) return;
      const ended = drag;
      drag = null;
      if (!ended.active) return;
      ended.tracker.up({ timeStamp: e.timeStamp });
      handlers.current.release(ended);
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
    <ModalShell
      open={open}
      onOpenChange={(next) => {
        // Escape / scrim / handle: hand the sheet back to the CSS hide (fast effects) from wherever
        // a drag or settle left it.
        if (!next) interrupt();
        onOpenChange(next);
      }}
      ref={popup}
      backdropRef={backdrop}
      aria-label={ariaLabel}
      sx={s.popup}
    >
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
    </ModalShell>
  );
}
