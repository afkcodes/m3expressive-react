import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useSpringToken } from '../../motion/context.tsx';
import { animateSpring } from '../../motion/animate.ts';
import type { SpringParams } from '../../motion/spring.ts';

/** The parallax offset of DatePicker.kt's display-mode switch (−48dp). */
const PARALLAX = -48;

/**
 * Picker ⇄ input (Compose DatePicker AnimatedContent, DatePicker.kt): to input, the text field
 * slides up from its full height (default spatial) and fades in (default effects) while the
 * calendar fades out (fast effects) and slides to −48dp; back to the picker mirrors it (the
 * calendar from −48dp, the field down by its height); the size changes on default spatial with a
 * clip. Only the bodies move — the headers and actions switch at once (Compose keeps its header
 * outside the transition; the kit's two headers differ).
 *
 * `wrap` holds one `[data-mode-slot]` per mode; `leaving` names the slot on its way out (null at
 * rest); `onDone` runs once the motion ends.
 */
export function useModeTransition(
  wrap: RefObject<HTMLDivElement | null>,
  leaving: 'picker' | 'input' | null,
  onDone: () => void,
) {
  const spatial = useSpringToken('default-spatial');
  const defaultEffects = useSpringToken('default-effects');
  const fastEffects = useSpringToken('fast-effects');
  const done = useRef(onDone);
  useLayoutEffect(() => {
    done.current = onDone;
  });
  useLayoutEffect(() => {
    const wrapper = wrap.current;
    if (!leaving || !wrapper) return undefined;
    const outSlot = wrapper.querySelector<HTMLElement>(`:scope > [data-mode-slot="${leaving}"]`);
    const inSlot = wrapper.querySelector<HTMLElement>(`:scope > [data-mode-slot]:not([data-mode-slot="${leaving}"])`);
    const outPanel = outSlot?.firstElementChild as HTMLElement | null;
    const inPanel = inSlot?.firstElementChild as HTMLElement | null;
    if (!outSlot || !inSlot || !outPanel || !inPanel) return undefined;
    const part = (el: HTMLElement, name: string) => el.querySelector<HTMLElement>(`[data-dp-${name}]`);
    const outBody = part(outPanel, 'body');
    const inBody = part(inPanel, 'body');
    const inActions = part(inPanel, 'actions');
    const toInput = leaving === 'picker';
    const [w0, h0, w1, h1] = [outSlot.offsetWidth, outSlot.offsetHeight, inSlot.offsetWidth, inSlot.offsetHeight];
    // One surface for both: the panels go transparent over the clipping wrapper.
    Object.assign(wrapper.style, {
      overflow: 'hidden',
      borderRadius: getComputedStyle(inPanel).borderTopLeftRadius,
      backgroundColor: getComputedStyle(inPanel).backgroundColor,
    });
    for (const panel of [outPanel, inPanel]) panel.style.backgroundColor = 'transparent';
    for (const name of ['header', 'actions']) {
      const el = part(outPanel, name);
      if (el) el.style.visibility = 'hidden';
    }
    for (const body of [outBody, inBody]) if (body) body.style.overflow = 'hidden';
    const slide = (body: HTMLElement | null, y: number) => {
      if (body)
        for (const child of body.children) (child as HTMLElement).style.transform = y ? `translateY(${y}px)` : '';
    };
    const inFrom = toInput ? (inBody?.offsetHeight ?? 0) : PARALLAX;
    const outTo = toInput ? PARALLAX : (outBody?.offsetHeight ?? 0);
    const running: { stop(): void }[] = [];
    let left = 0;
    const finish = () => {
      if (--left > 0) return;
      for (const key of ['overflow', 'borderRadius', 'backgroundColor', 'width', 'height'] as const) {
        wrapper.style[key] = '';
      }
      inPanel.style.backgroundColor = '';
      if (inActions) inActions.style.transform = '';
      if (inBody) {
        inBody.style.overflow = '';
        inBody.style.opacity = '';
        slide(inBody, 0);
      }
      done.current();
    };
    const run = (spec: SpringParams | null, from: number, to: number, onUpdate: (v: number) => void) => {
      if (!spec) {
        onUpdate(to);
        return;
      }
      left++;
      running.push(animateSpring({ spring: spec, from, to, precision: 0.001, onUpdate, onComplete: finish }));
    };
    // Size (SizeTransform, clip = true); the actions ride the bottom edge (Compose's dialog buttons
    // sit below the animating content).
    run(spatial, 0, 1, (progress) => {
      const height = h0 + (h1 - h0) * progress;
      wrapper.style.width = `${w0 + (w1 - w0) * progress}px`;
      wrapper.style.height = `${height}px`;
      if (inActions) inActions.style.transform = `translateY(${height - h1}px)`;
    });
    if (!spatial) {
      wrapper.style.width = '';
      wrapper.style.height = '';
    }
    // Bodies: slides (default spatial) and fades (in: default effects, out: fast effects).
    run(spatial, 0, 1, (progress) => {
      slide(inBody, inFrom * (1 - progress));
      slide(outBody, outTo * progress);
    });
    if (inBody) inBody.style.opacity = '0';
    run(defaultEffects, 0, 1, (alpha) => inBody && (inBody.style.opacity = String(alpha)));
    run(fastEffects, 1, 0, (alpha) => outBody && (outBody.style.opacity = String(alpha)));
    if (left === 0) finish();
    return () => running.forEach((r) => r.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per mode switch
  }, [leaving]);
}
