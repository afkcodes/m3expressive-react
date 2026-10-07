import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { Divider } from '../Divider/Divider.tsx';
import { isNoDragTarget } from '../../motion/dragGuard.ts';
import { ModalShell } from '../../primitives/ModalShell.tsx';
import { prefersReducedMotion } from '../../motion/context.tsx';
import {
  MAX_FLING_VELOCITY,
  PointerVelocityTracker,
  suppressNextClick,
  TOUCH_SLOP,
  tween,
} from '../../motion/gesture.ts';
import { computeSettleDuration, quinticOut, shouldHideOnRelease, type SideSheetGeometry } from './sideSheetDrag.ts';

/*
 * Figma kit, "Sheets" page (Side Sheet set 53198:27851).
 *   320px. Header 76px: 12px top / 12px end / 16px bottom padding, 4px start with the narrow back
 *   button (24px without), the title-large On Surface Variant headline 12px down, the close button.
 *   Content fills; actions sit under a full-width divider (12px top, 24px sides, 8px gaps) with
 *   20px below. Standard: Surface with a vertical divider on its start edge. Modal: Surface
 *   Container Low, 16px corners, over a 32% Scrim.
 * Motion: Compose has no side sheet; Material Components' modal side sheet is the reference
 *   (SideSheetDialog / SideSheetBehavior):
 *   - show / hide: the dialog window slides in from / out to its edge by 100% of the window width
 *     over 275ms on m3_sys_motion_easing_emphasized (the path below, exact as linear()); the edge
 *     follows the layout direction (SheetDialog picks the left animations for an absolute-left
 *     sheet). The scrim keeps the M3 default-effects fade (Android dims the window separately);
 *   - drag to dismiss (ViewDragHelper): horizontal drags past the touch slop move the sheet between
 *     Expanded and fully off screen (width + its 16px inner margin); on release it hides when
 *     moving inwards fast (> 500px/s, mostly horizontal) or released past half way, expands when
 *     moving outwards, and settles over ViewDragHelper's computed duration (≤ 600ms) on its
 *     quintic ease-out.
 */
/**
 * m3_sys_motion_easing_emphasized — path(M 0,0 C 0.05,0 0.133333,0.06 0.166666,0.4 C 0.208333,0.82
 * 0.25,1 1,1) (MDC motion tokens.xml), sampled to ≤ 0.0005 (checked in gesture.test.ts).
 */
const EMPHASIZED =
  'linear(0, 0.0005 0.83%, 0.0021 1.63%, 0.0047 2.43%, 0.0082 3.2%, 0.0128 3.98%, 0.0185 4.75%, 0.0251 5.5%, 0.0327 6.22%, 0.041 6.93%, 0.0506 7.63%, 0.0611 8.3%, 0.0723 8.95%, 0.0845 9.57%, 0.098 10.2%, 0.1117 10.78%, 0.1269 11.35%, 0.1421 11.88%, 0.158 12.38%, 0.1746 12.85%, 0.1927 13.33%, 0.2104 13.75%, 0.2298 14.17%, 0.2498 14.57%, 0.2704 14.95%, 0.2884 15.25%, 0.3079 15.55%, 0.3273 15.82%, 0.3486 16.1%, 0.3633 16.28%, 0.3789 16.45%, 0.4402 17.08%, 0.4768 17.47%, 0.5121 17.9%, 0.5292 18.13%, 0.5452 18.35%, 0.5618 18.6%, 0.5772 18.85%, 0.5929 19.13%, 0.6074 19.4%, 0.6221 19.7%, 0.6357 20%, 0.661 20.63%, 0.6762 21.05%, 0.6901 21.48%, 0.7043 21.95%, 0.7174 22.43%, 0.7299 22.93%, 0.7421 23.45%, 0.7655 24.6%, 0.7876 25.87%, 0.8078 27.25%, 0.827 28.78%, 0.8448 30.43%, 0.8649 32.63%, 0.8833 35.05%, 0.9002 37.72%, 0.9155 40.63%, 0.9295 43.8%, 0.9421 47.25%, 0.9533 50.98%, 0.9633 55%, 0.972 59.35%, 0.9795 64.03%, 0.9858 69.05%, 0.9909 74.42%, 0.9949 80.2%, 0.9977 86.38%, 0.9994 92.97%, 1)';

const s = stylex.create({
  sheet: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    width: 320,
    minHeight: 0,
    paddingBottom: 20,
    color: color.onSurface,
    backgroundColor: color.surface,
  },
  modal: { backgroundColor: color.surfaceContainerLow, borderRadius: 16, overflow: 'hidden' },
  // The kit's divider instance runs 1px past the sheet's bottom edge.
  edge: { position: 'absolute', insetInlineStart: 0, top: 0, bottom: -1 },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    flexShrink: 0,
    paddingBlock: '12px 16px',
    paddingInline: '24px 12px',
  },
  headerNav: { paddingInlineStart: 4 },
  headline: { flexGrow: 1, minWidth: 0, margin: 0, paddingTop: 12, color: color.onSurfaceVariant },
  slot: { display: 'flex', flexShrink: 0 },
  content: { flexGrow: 1, minHeight: 0, overflowY: 'auto' },
  actions: { flexShrink: 0, display: 'flex', flexDirection: 'column' },
  buttons: { display: 'flex', alignItems: 'center', columnGap: 8, paddingTop: 12, paddingInline: 24 },
  // Modal placement (detached: 16px from the edges) and motion.
  popup: {
    position: 'fixed',
    top: 16,
    bottom: 16,
    insetInlineEnd: 16,
    display: 'flex',
    outlineStyle: 'none',
    touchAction: 'pan-y',
    translate: {
      default: '0 0',
      ':is([data-starting-style], [data-ending-style])': { default: '100vw 0', ':dir(rtl)': '-100vw 0' },
    },
    transitionProperty: 'translate',
    transitionDuration: { default: '275ms', '@media (prefers-reduced-motion: reduce)': '0ms' },
    transitionTimingFunction: EMPHASIZED,
  },
  popupStart: {
    insetInlineEnd: 'auto',
    insetInlineStart: 16,
    translate: {
      default: '0 0',
      ':is([data-starting-style], [data-ending-style])': { default: '-100vw 0', ':dir(rtl)': '100vw 0' },
    },
  },
});

export interface SideSheetProps {
  /** Modal styling (rounded, Surface Container Low, no edge divider). `ModalSideSheet` sets it. */
  modal?: boolean;
  headline?: ReactNode;
  /** Leading icon button, e.geometry. back (the kit's narrow icon button). */
  navigation?: ReactNode;
  /** Trailing icon button, e.geometry. close. */
  close?: ReactNode;
  /** Buttons under the divider at the bottom. */
  actions?: ReactNode;
  children?: ReactNode;
  /** Id for the headline (a modal sheet's dialog is labelled by it). */
  headlineId?: string;
  sx?: StyleXStyles;
}

/** The side sheet surface (standard sheets sit beside the content; see `ModalSideSheet`). */
export const SideSheet = forwardRef<HTMLDivElement, SideSheetProps>(function SideSheet(
  { modal = false, headline, navigation, close, actions, children, headlineId, sx },
  ref,
) {
  return (
    <div ref={ref} {...stylex.props(s.sheet, modal && s.modal, sx)}>
      {!modal && <Divider orientation="vertical" sx={s.edge} />}
      {(headline != null || navigation != null || close != null) && (
        <div {...stylex.props(s.header, navigation != null && s.headerNav)}>
          {navigation != null && <span {...stylex.props(s.slot)}>{navigation}</span>}
          <h2 id={headlineId} {...stylex.props(typescale.titleLarge, s.headline)}>
            {headline}
          </h2>
          {close != null && <span {...stylex.props(s.slot)}>{close}</span>}
        </div>
      )}
      <div {...stylex.props(s.content)}>{children}</div>
      {actions != null && (
        <div {...stylex.props(s.actions)}>
          <Divider />
          <div {...stylex.props(s.buttons)}>{actions}</div>
        </div>
      )}
    </div>
  );
});

export interface ModalSideSheetProps extends Omit<SideSheetProps, 'modal' | 'headlineId'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The edge it slides in from (default the end edge). */
  side?: 'end' | 'start';
}

/** A modal side sheet: scrim, focus trap, Escape / scrim / drag to dismiss. */
export function ModalSideSheet({ open, onOpenChange, side = 'end', ...sheet }: ModalSideSheetProps) {
  const id = useId();
  const popup = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const settling = useRef<(() => void) | null>(null);
  /** Ends the pointer gesture in progress (its window listeners); null when there is none. */
  const gesture = useRef<(() => void) | null>(null);
  // Inward offset from Expanded (px, ≥ 0); the sheet's physical edge sets the sign.
  const offset = useRef(0);
  // Settle callbacks outlive the render that created them.
  const latest = useRef(onOpenChange);
  useLayoutEffect(() => {
    latest.current = onOpenChange;
  });

  const measure = (el: HTMLElement): SideSheetGeometry => {
    const rtl = getComputedStyle(el).direction === 'rtl';
    const right = (side === 'end') !== rtl;
    const parentWidth = document.documentElement.clientWidth;
    const childWidth = el.offsetWidth;
    const innerMargin = right ? parentWidth - el.offsetLeft - childWidth : el.offsetLeft;
    return { right, parentWidth, childWidth, innerMargin, range: childWidth + innerMargin };
  };
  const place = (inward: number, right: boolean) => {
    offset.current = inward;
    if (popup.current) popup.current.style.translate = `${right ? inward : -inward}px 0`;
  };
  const showScrim = (visible: boolean) => {
    if (backdrop.current) backdrop.current.style.opacity = visible ? '' : '0';
  };
  const reset = () => {
    settling.current?.();
    settling.current = null;
    offset.current = 0;
    if (popup.current) {
      popup.current.style.translate = '';
      popup.current.style.transition = '';
    }
    showScrim(true);
  };
  /** Drop the gesture and the settle: the window animation takes over from wherever the sheet is. */
  const interrupt = () => {
    gesture.current?.();
    settling.current?.();
    settling.current = null;
    if (popup.current?.style.translate) {
      popup.current.style.transition = '';
      popup.current.style.translate = '';
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const popupEl = popup.current;
    if (e.button !== 0 || !popupEl || isNoDragTarget(e.nativeEvent, e.currentTarget)) return;
    gesture.current?.();
    // Measured once per drag: the release maths use the press-time geometry.
    const geometry = measure(popupEl);
    const tracker = new PointerVelocityTracker();
    tracker.down(e);
    const pointer = e.pointerId;
    const x0 = e.clientX;
    const y0 = e.clientY;
    let start = offset.current;
    let active = false;
    const begin = (el: HTMLElement) => {
      active = true;
      settling.current?.();
      settling.current = null;
      // From wherever the sheet is (a show transition may still be running).
      const shift = el.getBoundingClientRect().left - el.offsetLeft;
      start = Math.min(geometry.range, Math.max(0, geometry.right ? shift : -shift));
      el.style.transition = 'none';
      place(start, geometry.right);
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer) return;
      // The sheet unmounted under the pointer (closed by a key or by its owner).
      const el = popup.current;
      if (!el) {
        end();
        return;
      }
      tracker.move(ev);
      const dx = ev.clientX - x0;
      if (!active) {
        // ViewDragHelper.checkTouchSlop on the horizontal axis (vertical drags scroll the content).
        if (Math.abs(dx) <= TOUCH_SLOP || Math.abs(dx) <= Math.abs(ev.clientY - y0)) return;
        begin(el);
      }
      // clampViewPositionHorizontal: between Expanded and fully off screen.
      place(Math.min(geometry.range, Math.max(0, start + (geometry.right ? dx : -dx))), geometry.right);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointer) return;
      end();
      if (!active || !popup.current) return;
      tracker.up(ev);
      suppressNextClick();
      const { x: vx, y: vy } = tracker.velocity(MAX_FLING_VELOCITY);
      const hide = shouldHideOnRelease(geometry, offset.current, vx, vy);
      showScrim(!hide);
      const to = hide ? geometry.range : 0;
      const finish = () => {
        settling.current = null;
        if (hide) latest.current(false);
        else reset();
      };
      const left = (inward: number) =>
        geometry.right
          ? geometry.parentWidth - geometry.innerMargin - geometry.childWidth + inward
          : geometry.innerMargin - inward;
      const duration = prefersReducedMotion()
        ? 0
        : computeSettleDuration(left(to) - left(offset.current), vx, vy, geometry.range, geometry.parentWidth);
      settling.current = tween({
        from: offset.current,
        to,
        duration,
        easing: quinticOut,
        onUpdate: (v) => place(v, geometry.right),
        onComplete: finish,
      });
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

  // Closed by its owner mid-gesture or mid-settle: drop both and let the window animation take
  // over. (A drag that dismissed the sheet has already settled off screen and stays there.)
  useEffect(() => {
    if (!open && (gesture.current || settling.current)) interrupt();
  });
  // Unmounted: nothing may run on (or call back from) a sheet that's gone.
  useEffect(
    () => () => {
      gesture.current?.();
      settling.current?.();
      settling.current = null;
    },
    [],
  );

  return (
    <ModalShell
      open={open}
      onOpenChange={(next) => {
        // Escape / scrim: the window animation takes over from wherever a drag left the sheet.
        if (!next) interrupt();
        onOpenChange(next);
      }}
      ref={popup}
      backdropRef={backdrop}
      aria-labelledby={sheet.headline != null ? id : undefined}
      onPointerDown={onPointerDown}
      sx={[s.popup, side === 'start' && s.popupStart]}
    >
      <SideSheet modal headlineId={id} {...sheet} />
    </ModalShell>
  );
}
