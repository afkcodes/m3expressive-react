import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useSpringToken } from '../../motion/context.tsx';
import { useSpringChannel } from '../../motion/useSpringChannel.ts';

/** Inline styles the collapse writes on the FAB; removed again at rest expanded. */
const MOTION_PROPERTIES = ['width', 'overflow', 'justify-content'] as const;

/*
 * Expand / collapse — Compose expressive ExtendedFloatingActionButton (FloatingActionButton.kt):
 * one transition drives width progress p on FastSpatial and label alpha on FastEffects;
 * width = lerp(minWidth (= height), expanded width, p) with the padded content laid out at the
 * start and clipped (padding never changes); the label is removed only once fully collapsed
 * (target 0 and nothing running). At rest expanded nothing is overridden (the kit's frames).
 * Both springs write to the DOM every frame; React only hears when the label mounts / unmounts.
 */
export function useExpandMotion(
  root: RefObject<HTMLElement | null>,
  label: RefObject<HTMLElement | null>,
  expanded: boolean,
  minWidth: number,
): boolean {
  const widthSpring = useSpringToken('fast-spatial');
  const alphaSpring = useSpringToken('fast-effects');
  const [labelShown, setLabelShown] = useState(expanded);
  /** The expanded width, measured while the label is mounted and nothing is moving. */
  const fullWidth = useRef(0);
  const first = useRef(true);
  const width = useSpringChannel(apply, { initial: expanded ? 1 : 0, onRest: settle });
  const alpha = useSpringChannel(apply, { initial: expanded ? 1 : 0, onRest: settle });

  function apply() {
    const node = root.current;
    if (!node) return;
    if (!width.animating && !alpha.animating && width.value === 1) {
      for (const property of MOTION_PROPERTIES) node.style.removeProperty(property);
      label.current?.style.removeProperty('opacity');
      return;
    }
    node.style.width = `${minWidth + Math.round((fullWidth.current - minWidth) * width.value)}px`;
    node.style.overflow = 'hidden';
    node.style.justifyContent = 'flex-start';
    if (label.current) label.current.style.opacity = String(alpha.value);
  }

  /** Both springs at rest: write the final frame; fully collapsed drops the label. */
  function settle() {
    if (width.animating || alpha.animating) return;
    apply();
    if (width.value === 0 && alpha.value === 0) setLabelShown(false);
  }

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      apply();
      return;
    }
    // Expanding: mount the label (transparent) first, then measure.
    if (expanded && !labelShown) {
      setLabelShown(true);
      return;
    }
    const node = root.current;
    if (node && labelShown && !width.animating) {
      const inline = node.style.width;
      node.style.removeProperty('width');
      fullWidth.current = node.getBoundingClientRect().width;
      node.style.width = inline;
    }
    const target = expanded ? 1 : 0;
    width.to(target, widthSpring);
    alpha.to(target, alphaSpring);
    apply();
    settle();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on the transition, not on every spring / ref identity
  }, [expanded, labelShown]);

  return labelShown;
}
