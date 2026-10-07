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
}

export function MonthPager({ month, children, onSwipe, instant = false }: MonthPagerProps) {
  const pager = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const snapSpec = useSpringToken('default-effects');
  const [other, setOther] = useState<Other | null>(null);
  const anim = useRef<SpringAnimation | null>(null);
  const shown = useRef(month);
  // dx of the shown month's rows (px); the other month sits one width beside it.
  const offset = useRef(0);
  const swipeCommit = useRef(false);

  /** The shown month's and the other month's week rows (not the weekday headings). */
  const parts = () => {
    const el = pager.current;
    if (!el) return null;
    const main = el.querySelector<HTMLElement>(':scope > [role="grid"]');
    const copy = el.querySelector<HTMLElement>(':scope > [data-month-copy] > [role="grid"]');
    const rows = (g: HTMLElement | null) => (g ? [...g.querySelectorAll<HTMLElement>(':scope > [role="row"]')].slice(1) : []);
    const firstRow = main?.querySelector<HTMLElement>(':scope > [role="row"]');
    return { main: rows(main), copy: rows(copy), copyHeader: copy?.querySelector<HTMLElement>(':scope > [role="row"]'), width: firstRow?.offsetWidth ?? 0, left: firstRow?.offsetLeft ?? 0 };
  };
  const apply = (dx: number, side: 1 | -1) => {
    const p = parts();
    const el = pager.current;
    if (!p || !el) return;
    offset.current = dx;
    for (const r of p.main) r.style.transform = dx ? `translateX(${dx}px)` : '';
    for (const r of p.copy) r.style.transform = `translateX(${dx + side * p.width}px)`;
    if (p.copyHeader) p.copyHeader.style.visibility = 'hidden';
    // Compose clips the list to its own width (inside the picker's side padding).
    el.style.clipPath = `inset(0 ${el.clientWidth - p.left - p.width}px 0 ${p.left}px)`;
  };
  const clear = () => {
    const p = parts();
    if (p) for (const r of p.main) r.style.transform = '';
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
    if (!other || other === sliding.current || drag.current) return;
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

  useLayoutEffect(() => () => anim.current?.stop(), []);

  // Swipe.
  const drag = useRef<{ side: 1 | -1 } | null>(null);
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // A gesture during a slide / snap is ignored (Compose ignores keys while the list scrolls).
    if (e.button !== 0 || !onSwipe || anim.current) return;
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
      const dx = ev.clientX - x0;
      if (!active) {
        if (Math.abs(dx) <= slop) return;
        active = true;
        x0 += Math.sign(dx) * slop; // Compose's overSlop
      }
      const w = parts()?.width ?? 0;
      const d = Math.max(-w, Math.min(w, ev.clientX - x0));
      // Dragging left reveals the next month on the right.
      setSide(d < 0 ? 1 : -1);
      apply(d, drag.current!.side);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!active || !drag.current) {
        drag.current = null;
        return;
      }
      tracker.up(ev);
      suppressNextClick();
      const side = drag.current.side;
      const w = parts()?.width ?? 0;
      const dx = offset.current;
      // LazyList snap: the bounds around the scroll position (scroll = −dx), in scroll units.
      const scrollVelocity = -tracker.velocity().x;
      const lower = side > 0 ? dx : dx - w; // ≤ 0: the snap behind
      const upper = side > 0 ? dx + w : dx; // ≥ 0: the snap ahead
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
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return (
    <div ref={pager} onPointerDown={onPointerDown} {...stylex.props(s.pager)}>
      {children(month, false)}
      {other && (
        <div data-month-copy="" aria-hidden inert {...stylex.props(s.outgoing)}>
          {children(other.month, true)}
        </div>
      )}
    </div>
  );
}
