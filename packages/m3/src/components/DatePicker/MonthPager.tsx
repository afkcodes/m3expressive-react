import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useReducedMotion, useSpringToken } from '../../motion/context.tsx';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';
import { PointerVelocityTracker, pointerSlop, suppressNextClick } from '../../motion/gesture.ts';
import { addMonths } from './calendar.ts';

/*
 * The months of a date picker as Compose's HorizontalMonthsList (DatePicker.kt), one month wide:
 *   - previous / next (and keyboard navigation off a month's edge) slide the grids one month width
 *     on animateScrollToItem's default spring() (no bounce, stiffness 1500 / StiffnessMedium);
 *   - a horizontal drag moves the months with the pointer and snaps on release
 *     (DatePickerDefaults.rememberSnapFlingBehavior: ≥ 400dp/s → the next / previous month in the
 *     fling direction, slower → the closer one) on the default effects spring from the release
 *     velocity;
 *   - the weekday headings stay put (Compose draws them outside the list); a jump (a year pick) is
 *     instant (scrollToItem).
 * The grids are CalendarMonths (role="grid" with role="row" children; the first row is the
 * weekday headings). The outgoing month is a decorative, inert copy.
 */
const s = stylex.create({
  pager: { position: 'relative', touchAction: 'pan-y' },
  outgoing: { position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none' },
});

/** animateScrollToItem's spring(): DampingRatioNoBouncy, StiffnessMedium. */
const SLIDE_SPRING = { dampingRatio: 1, stiffness: 1500 };
/** SnapFlingBehavior MinFlingVelocityDp. */
const MIN_FLING_VELOCITY = 400;

const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth();

/** The pager's moving parts and the measurements a frame needs. */
interface Parts {
  /** The shown month's week rows (not the weekday headings). */
  main: HTMLElement[];
  /** The other (outgoing / neighbouring) month's week rows. */
  copy: HTMLElement[];
  copyHeader: HTMLElement | null;
  /** One month's width and its left edge inside the pager (the first row). */
  width: number;
  left: number;
  pagerWidth: number;
}

function measureParts(pager: HTMLElement | null): Parts | null {
  if (!pager) return null;
  const main = pager.querySelector<HTMLElement>(':scope > [role="grid"]');
  const copy = pager.querySelector<HTMLElement>(':scope > [data-month-copy] > [role="grid"]');
  const rows = (grid: HTMLElement | null) =>
    grid ? [...grid.querySelectorAll<HTMLElement>(':scope > [role="row"]')] : [];
  const mainRows = rows(main);
  const copyRows = rows(copy);
  return {
    main: mainRows.slice(1),
    copy: copyRows.slice(1),
    copyHeader: copyRows[0] ?? null,
    width: mainRows[0]?.offsetWidth ?? 0,
    left: mainRows[0]?.offsetLeft ?? 0,
    pagerWidth: pager.clientWidth,
  };
}

interface Other {
  month: Date;
  /** +1: the other month sits after (to the right of) the shown one. */
  side: 1 | -1;
}

export interface MonthPagerProps {
  month: Date;
  /** Render one month's grid. `copy` is the decorative outgoing / neighbouring month. */
  children: (month: Date, copy: boolean) => ReactNode;
  /** A swipe settled on another month. */
  onSwipe?: (month: Date) => void;
  /** Show the next month change without the slide (a jump). */
  instant?: boolean;
  /** Out of the tab order and the accessibility tree (a calendar leaving under the year list). */
  inert?: boolean;
}

export function MonthPager({ month, children, onSwipe, instant = false, inert = false }: MonthPagerProps) {
  const pager = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const snapSpec = useSpringToken('default-effects');
  const [other, setOther] = useState<Other | null>(null);
  const anim = useRef<SpringAnimation | null>(null);
  const shown = useRef(month);
  // dx of the shown month's rows (px); the other month sits one width beside it.
  const offset = useRef(0);
  const swipeCommit = useRef(false);

  // The rows and sizes are queried once per commit (a commit may bring new rows: a new month, the
  // other month's copy) and reused by every frame of a slide or drag.
  const measured = useRef<Parts | null>(null);
  useLayoutEffect(() => {
    measured.current = null;
  });
  const parts = () => (measured.current ??= measureParts(pager.current));
  const apply = (dx: number, side: 1 | -1) => {
    const p = parts();
    const el = pager.current;
    if (!p || !el) return;
    offset.current = dx;
    for (const row of p.main) row.style.transform = dx ? `translateX(${dx}px)` : '';
    for (const row of p.copy) row.style.transform = `translateX(${dx + side * p.width}px)`;
    if (p.copyHeader) p.copyHeader.style.visibility = 'hidden';
    // Compose clips the list to its own width (inside the picker's side padding).
    el.style.clipPath = `inset(0 ${p.pagerWidth - p.left - p.width}px 0 ${p.left}px)`;
  };
  const clear = () => {
    const p = parts();
    if (p) for (const row of p.main) row.style.transform = '';
    if (pager.current) pager.current.style.clipPath = '';
    offset.current = 0;
  };
  const stop = () => {
    anim.current?.stop();
    anim.current = null;
  };

  // A month change by one (buttons, keys) slides; anything else (or a committed swipe) jumps.
  useLayoutEffect(() => {
    const prev = shown.current;
    shown.current = month;
    if (monthIndex(prev) === monthIndex(month)) return;
    const diff = monthIndex(month) - monthIndex(prev);
    stop();
    if (swipeCommit.current || instant || reduced || Math.abs(diff) !== 1) {
      swipeCommit.current = false;
      clear();
      setOther(null);
      return;
    }
    // The old month leaves on the side it came from: next → it ends at −width.
    setOther({ month: prev, side: diff > 0 ? -1 : 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  // Run the slide once the outgoing copy is rendered.
  const sliding = useRef<Other | null>(null);
  useLayoutEffect(() => {
    if (!other || other === sliding.current) return;
    // A drag asked for the neighbouring month in its move handler, before React rendered it: place
    // the new copy's rows at the drag offset before they paint (unplaced, they sat on top of the
    // shown month — overlapping date numbers).
    if (drag.current) {
      apply(offset.current, other.side);
      return;
    }
    const p = parts();
    if (!p) return;
    sliding.current = other;
    // The shown (new) month enters from the copy's opposite side.
    const from = -other.side * p.width;
    apply(from, other.side);
    anim.current = animateSpring({
      spring: SLIDE_SPRING,
      from,
      to: 0,
      precision: 0.01,
      onUpdate: (dx) => apply(dx, other.side),
      onComplete: () => {
        anim.current = null;
        sliding.current = null;
        clear();
        setOther(null);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [other]);

  // Swipe. The gesture's window listeners are removed on release, on a new press and on unmount.
  const drag = useRef<{ side: 1 | -1 } | null>(null);
  const endGesture = useRef<(() => void) | null>(null);
  useLayoutEffect(
    () => () => {
      anim.current?.stop();
      endGesture.current?.();
    },
    [],
  );
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // A gesture during a slide / snap is ignored (Compose ignores keys while the list scrolls).
    if (e.button !== 0 || !onSwipe || anim.current) return;
    endGesture.current?.();
    const id = e.pointerId;
    const slop = pointerSlop(e.pointerType);
    const tracker = new PointerVelocityTracker();
    tracker.down(e);
    let x0 = e.clientX;
    let active = false;
    const setSide = (side: 1 | -1) => {
      if (drag.current?.side === side) return;
      drag.current = { side };
      setOther({ month: addMonths(shown.current, side), side });
    };
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      tracker.move(ev);
      const moved = ev.clientX - x0;
      if (!active) {
        if (Math.abs(moved) <= slop) return;
        active = true;
        x0 += Math.sign(moved) * slop; // Compose's overSlop
      }
      const monthWidth = parts()?.width ?? 0;
      const dx = Math.max(-monthWidth, Math.min(monthWidth, ev.clientX - x0));
      // Dragging left reveals the next month on the right.
      setSide(dx < 0 ? 1 : -1);
      apply(dx, drag.current!.side);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      detach();
      if (!active || !drag.current) {
        drag.current = null;
        return;
      }
      tracker.up(ev);
      suppressNextClick();
      const side = drag.current.side;
      const monthWidth = parts()?.width ?? 0;
      const dx = offset.current;
      // LazyList snap: the bounds around the scroll position (scroll = −dx), in scroll units.
      const scrollVelocity = -tracker.velocity().x;
      const lower = side > 0 ? dx : dx - monthWidth; // ≤ 0: the snap behind
      const upper = side > 0 ? dx + monthWidth : dx; // ≥ 0: the snap ahead
      const toUpper =
        Math.abs(scrollVelocity) >= MIN_FLING_VELOCITY ? scrollVelocity > 0 : Math.abs(upper) <= Math.abs(lower);
      const target = toUpper ? dx - upper : dx - lower; // the shown month's resting dx
      const commit = target !== 0 ? addMonths(shown.current, side) : null;
      const done = () => {
        anim.current = null;
        drag.current = null;
        setOther(null);
        if (commit) {
          // Keep the rows where they are: the month change clears them in the same commit.
          swipeCommit.current = true;
          onSwipe?.(commit);
        } else clear();
      };
      if (!snapSpec) {
        apply(target, side);
        done();
        return;
      }
      anim.current = animateSpring({
        spring: snapSpec,
        from: dx,
        to: target,
        velocity: tracker.velocity().x,
        precision: 0.01,
        onUpdate: (v) => apply(v, side),
        onComplete: done,
      });
    };
    const detach = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (endGesture.current === detach) endGesture.current = null;
    };
    endGesture.current = detach;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return (
    <div ref={pager} inert={inert || undefined} onPointerDown={onPointerDown} {...stylex.props(s.pager)}>
      {children(month, false)}
      {other && (
        <div data-month-copy="" aria-hidden inert {...stylex.props(s.outgoing)}>
          {children(other.month, true)}
        </div>
      )}
    </div>
  );
}
