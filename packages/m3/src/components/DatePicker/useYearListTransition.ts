import { useLayoutEffect, useRef, useState } from 'react';
import { useSpringToken } from '../../motion/context.tsx';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';

/** Day ⇄ year: the year list expands over the calendar / shrinks away before the rest state. */
export type YearListPhase = 'day' | 'year' | 'to-year' | 'to-day';

/** The year list's alpha when it starts expanding (Compose fadeIn(initialAlpha = 0.6f)). */
const ENTER_ALPHA = 0.6;

/**
 * The year view's entrance and exit (Compose DatePicker YearPicker AnimatedVisibility): the list
 * expands over the calendar from its top edge with its content anchored at the bottom
 * (expandVertically) while fading in from 60% — both on default effects — and shrinks back on
 * default effects while fading out on fast effects. Our kit's year list is shorter than the
 * calendar, so the area resizes on the same spring. An interrupted run carries on from where the
 * last one left the inline styles.
 *
 * Returns the phase (the calendar renders until 'year', the list from 'to-year') and the refs to
 * attach: the area holding both (its first child is the calendar), the list's clipping box and
 * the scrolling list.
 */
export function useYearListTransition(view: 'day' | 'year') {
  const [phase, setPhase] = useState<YearListPhase>(view);
  if (view === 'year' && (phase === 'day' || phase === 'to-day')) setPhase('to-year');
  if (view === 'day' && (phase === 'year' || phase === 'to-year')) setPhase('to-day');
  const area = useRef<HTMLDivElement>(null);
  const yearsBox = useRef<HTMLDivElement>(null);
  const years = useRef<HTMLDivElement>(null);
  const defaultEffects = useSpringToken('default-effects');
  const fastEffects = useSpringToken('fast-effects');

  useLayoutEffect(() => {
    if (phase !== 'to-year' && phase !== 'to-day') return undefined;
    const areaEl = area.current;
    const box = yearsBox.current;
    const list = years.current;
    const calendar = areaEl?.firstElementChild as HTMLElement | null;
    if (!areaEl || !box || !list || !calendar) return undefined;
    const entering = phase === 'to-year';
    const calendarHeight = calendar.offsetHeight;
    const listHeight = list.offsetHeight;
    // Interrupted: carry on from where the last run left the inline styles.
    const num = (v: string, fallback: number) => (v ? parseFloat(v) : fallback);
    const boxFrom = num(box.style.height, entering ? 0 : listHeight);
    const areaFrom = num(areaEl.style.height, entering ? calendarHeight : listHeight);
    const alphaFrom = num(box.style.opacity, entering ? ENTER_ALPHA : 1);
    const [boxTo, areaTo, alphaTo] = entering ? [listHeight, listHeight, 1] : [0, calendarHeight, 0];
    areaEl.style.overflow = 'hidden';
    const running: SpringAnimation[] = [];
    let left = 2;
    const finish = () => {
      if (--left > 0) return;
      areaEl.style.height = '';
      areaEl.style.overflow = '';
      box.style.height = '';
      box.style.opacity = '';
      setPhase(entering ? 'year' : 'day');
    };
    const size = (progress: number) => {
      box.style.height = `${boxFrom + (boxTo - boxFrom) * progress}px`;
      areaEl.style.height = `${areaFrom + (areaTo - areaFrom) * progress}px`;
    };
    size(0);
    box.style.opacity = String(alphaFrom);
    // expandVertically / shrinkVertically: default effects; fadeIn default effects (from 60%), fadeOut fast effects.
    running.push(
      animateSpring({ spring: defaultEffects, from: 0, to: 1, precision: 0.001, onUpdate: size, onComplete: finish }),
    );
    running.push(
      animateSpring({
        spring: entering ? defaultEffects : fastEffects,
        from: alphaFrom,
        to: alphaTo,
        onUpdate: (alpha) => (box.style.opacity = String(alpha)),
        onComplete: finish,
      }),
    );
    return () => running.forEach((r) => r.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per phase change
  }, [phase]);

  return { phase, area, yearsBox, years };
}
