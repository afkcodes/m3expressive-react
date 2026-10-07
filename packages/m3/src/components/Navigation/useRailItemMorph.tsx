import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { typescale } from '../../tokens/typescale.ts';
import { textBox, textCentred } from '../../primitives/textBox.ts';
import type { RailMorph, RailProgress } from './context.ts';
import { railItemGeometry, type RailLabelMetrics } from './railMorph.ts';

/* A navigation item's part of the rail morph (Compose AnimatedNavigationItem; see railMorph.ts). */
const s = stylex.create({
  measure: { position: 'absolute', left: 0, top: 0, visibility: 'hidden', whiteSpace: 'nowrap', pointerEvents: 'none' },
});

/**
 * The label's box in both rail text styles, measured (hidden) when a morph starts: Compose
 * measures the label with the style of the moment, and the kit's rest layouts size it the same
 * way (collapsed: centred without its trailing tracking; expanded: a hug box).
 */
export function useRailLabelMetrics(
  active: boolean,
  label: ReactNode,
): { box: RailLabelMetrics | null; measurers: ReactNode } | null {
  const top = useRef<HTMLSpanElement>(null);
  const start = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<RailLabelMetrics | null>(null);
  // Measured again whenever the label changes.
  useLayoutEffect(() => {
    if (!active || label == null || !top.current || !start.current) return;
    const topBox = top.current.getBoundingClientRect();
    const trim = parseFloat(getComputedStyle(top.current).marginRight) || 0;
    const startBox = start.current.getBoundingClientRect();
    setBox({
      topWidth: topBox.width + trim,
      topHeight: topBox.height,
      startWidth: startBox.width,
      startHeight: startBox.height,
    });
  }, [active, label]);
  if (!active) return null;
  const measurers = (
    <>
      <span ref={top} aria-hidden {...stylex.props(typescale.labelMedium, textCentred.trimTracking, s.measure)}>
        {label}
      </span>
      <span ref={start} aria-hidden {...stylex.props(typescale.labelLarge, textBox.hug, s.measure)}>
        {label}
      </span>
    </>
  );
  return { box, measurers };
}

const px = (value: number) => `${value}px`;

function placeBox(el: HTMLElement | null, box: { x: number; y: number; width: number; height: number }) {
  if (!el) return;
  el.style.left = px(box.x);
  el.style.top = px(box.y);
  el.style.width = px(box.width);
  el.style.height = px(box.height);
}

/**
 * Places a morphing item's parts on every frame of the rail's progress — Compose
 * AnimatedNavigationItem's geometry (railItemGeometry) written to the elements, so a frame
 * re-renders nothing. The root's size is dropped when the morph ends (its rest layout takes over;
 * the parts unmount). Returns the refs to attach.
 */
export function useRailMorphGeometry(
  morph: RailMorph | null,
  progress: RailProgress | undefined,
  metrics: RailLabelMetrics | null,
) {
  const root = useRef<HTMLElement | null>(null);
  const indicator = useRef<HTMLSpanElement | null>(null);
  const ripple = useRef<HTMLSpanElement | null>(null);
  const icon = useRef<HTMLSpanElement | null>(null);
  const label = useRef<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    const item = root.current;
    if (!morph || !progress || !metrics || !item) return undefined;
    const apply = (value: number) => {
      const geometry = railItemGeometry(value, morph.toExpanded, metrics);
      item.style.width = px(geometry.width);
      item.style.height = px(geometry.height);
      placeBox(indicator.current, geometry.indicator);
      placeBox(ripple.current, geometry.ripple);
      if (icon.current) {
        icon.current.style.left = px(geometry.icon.x);
        icon.current.style.top = px(geometry.icon.y);
      }
      if (label.current) {
        label.current.style.left = px(geometry.label.x);
        label.current.style.top = px(geometry.label.y);
        label.current.style.opacity = String(Math.min(1, geometry.label.alpha));
      }
    };
    apply(progress.value);
    const unsubscribe = progress.subscribe(apply);
    return () => {
      unsubscribe();
      item.style.removeProperty('width');
      item.style.removeProperty('height');
    };
  }, [morph, progress, metrics]);
  return { rootRef: root, indicatorRef: indicator, rippleRef: ripple, iconRef: icon, labelRef: label };
}
