import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useSpringToken } from '../../motion/context.tsx';
import { useSpringChannel } from '../../motion/useSpringChannel.ts';
import { ITEM_PAD, ITEM_RADIUS } from './fabMenuStyles.ts';

/** Inline styles the reveal writes on the item; removed at rest, fully shown. */
const REVEAL_PROPERTIES = [
  'opacity',
  'visibility',
  'clip-path',
  'margin-inline-start',
  'padding-inline-start',
] as const;

export interface ItemReveal {
  /** Inside a FabMenu (standalone items are static). */
  animated: boolean;
  /** Shown by the menu's stagger. */
  visible: boolean;
  index: number;
  /** Reports whether the item is drawn (alpha > 0). */
  onShown: (index: number, shown: boolean) => void;
}

/**
 * Item reveal — Compose FloatingActionButtonMenuItem: width = round(natural · max(w, 0)) with the
 * padded content placed at the end edge (so it does not move), alpha a; not drawn at a = 0.
 * Widths below the natural one clip from the start side; the FastSpatial overshoot widens the
 * pill towards the start (extra start padding, cancelled by a negative margin so the layout and
 * the end edge stay put). Width (FastSpatial) and alpha (FastEffects) are two spring channels
 * writing to the element every frame.
 */
export function useItemReveal(el: RefObject<HTMLElement | null>, reveal: ItemReveal) {
  const widthSpring = useSpringToken('fast-spatial');
  const alphaSpring = useSpringToken('fast-effects');
  /** The item's natural width, measured while no overshoot styles are applied. */
  const natural = useRef(0);
  /** Writing direction, read once per transition: reading it per frame, right after the style writes,
   * forced a style recalc per item per frame. */
  const rtl = useRef(false);
  /** Whether the item is drawn (alpha > 0), as last reported. */
  const shown = useRef(false);
  // Latest index / callback for the spring callbacks; updated before the reveal effect below runs.
  const latest = useRef(reveal);
  useLayoutEffect(() => {
    latest.current = reveal;
  });
  const first = useRef(true);
  const width = useSpringChannel(update, { initial: reveal.visible ? 1 : 0, onRest: update });
  const alpha = useSpringChannel(update, { initial: reveal.visible ? 1 : 0, onRest: update });

  function update() {
    apply();
    report();
  }

  function apply() {
    const node = el.current;
    if (!node) return;
    const styles = node.style;
    if (!width.animating && !alpha.animating && width.value === 1 && alpha.value === 1) {
      for (const property of REVEAL_PROPERTIES) styles.removeProperty(property);
      return;
    }
    styles.opacity = String(alpha.value);
    styles.visibility = alpha.value === 0 ? 'hidden' : '';
    const full = natural.current;
    const drawn = Math.round(full * Math.max(width.value, 0));
    if (drawn >= full) {
      const extra = drawn - full;
      styles.removeProperty('clip-path');
      styles.marginInlineStart = extra ? `${-extra}px` : '';
      styles.paddingInlineStart = extra ? `${ITEM_PAD + extra}px` : '';
    } else {
      const cut = `${full - drawn}px`;
      styles.clipPath = rtl.current
        ? `inset(0 ${cut} 0 0 round ${ITEM_RADIUS}px)`
        : `inset(0 0 0 ${cut} round ${ITEM_RADIUS}px)`;
      styles.removeProperty('margin-inline-start');
      styles.removeProperty('padding-inline-start');
    }
  }

  function report() {
    const isShown = alpha.value !== 0;
    if (isShown !== shown.current) {
      shown.current = isShown;
      latest.current.onShown(latest.current.index, isShown);
    }
  }

  useLayoutEffect(() => {
    if (!reveal.animated) return;
    const node = el.current;
    if (first.current) {
      first.current = false;
      if (node) {
        natural.current = node.getBoundingClientRect().width;
        rtl.current = getComputedStyle(node).direction === 'rtl';
      }
      update();
      return;
    }
    const target = reveal.visible ? 1 : 0;
    if (node) {
      // Natural width: measured while no overshoot styles are applied.
      if (!width.animating && Math.round(natural.current * Math.max(width.value, 0)) <= natural.current)
        natural.current = node.getBoundingClientRect().width;
      rtl.current = getComputedStyle(node).direction === 'rtl';
    }
    width.to(target, widthSpring);
    alpha.to(target, alphaSpring);
    update();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on the stagger's visibility change
  }, [reveal.visible, reveal.animated]);

  // Unmount (the springs stop themselves): an item still drawn reports it is gone.
  useEffect(
    () => () => {
      if (!shown.current) return;
      shown.current = false;
      latest.current.onShown(latest.current.index, false);
    },
    [],
  );
}
