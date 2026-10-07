import {
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';
import type { SpringParams } from '../../motion/spring.ts';
import { GROUP_BOX_ATTR } from './context.ts';

/*
 * Press to widen — Compose ButtonGroup (ButtonGroup.kt): every item tagged `animateWidth` owns a
 * press progress (EnlargeOnPressNode) that springs 0 → 1 on FastSpatial while pressed; on
 * release it waits until progress > 0.75 (at most 1 s), then springs back to 0. Each layout pass
 * grows the pressed item at its neighbours' expense, so the group keeps its width:
 *   middle item: each neighbour gives round(p · min(0.15 · w / 2, prevLimit, nextLimit));
 *   first / last: the one neighbour gives round(p · min(0.15 · w, neighbourLimit));
 * a neighbour never gives more than its width; limit = the neighbour's compression limit
 * (GROUP_BOX_ATTR on its box). Widths are applied to each item's visual box; with no press in
 * flight the boxes carry no inline width (the kit's rest layout).
 *
 * The press springs write widths straight to the boxes every frame — no React state. Items come
 * and go with the group's children, so each pressed item owns a plain `animateSpring` (keyed by
 * its element) rather than a hook-bound spring channel.
 */
const EXPANDED_RATIO = 0.15; // ButtonGroupDefaults.ExpandedRatio
const MAX_WAIT_MS = 1000; // MAX_WAIT_TIME_MILLIS
/** EnlargeOnPressNode: a released item springs back once its press progress passes this. */
const RELEASE_PROGRESS = 0.75;

interface PressState {
  progress: number;
  anim: SpringAnimation | null;
  pressed: boolean;
  /** rAF handle of the post-release wait. */
  wait: number;
}

function boxOf(item: Element): HTMLElement | null {
  return item.matches(`[${GROUP_BOX_ATTR}]`)
    ? (item as HTMLElement)
    : item.querySelector<HTMLElement>(`[${GROUP_BOX_ATTR}]`);
}

/** Wires the press-to-widen motion onto the group element in `ref`; spread the handlers onto it. */
export function useEnlargeOnPress(ref: RefObject<HTMLDivElement | null>, spring: SpringParams | null) {
  const presses = useRef(new Map<Element, PressState>());
  /** Natural box widths, measured once per press session (null at rest). */
  const naturalWidths = useRef<number[] | null>(null);
  const springRef = useRef(spring);
  useLayoutEffect(() => {
    springRef.current = spring;
  }, [spring]);
  const keyItem = useRef<Element | null>(null);
  // Window listeners that end a pointer press; removed on release or unmount.
  const pointerEnds = useRef(new Set<() => void>());
  const disposed = useRef(false);

  const layout = () => {
    const root = ref.current;
    if (!root) return;
    const items = Array.from(root.children);
    const boxes = items.map(boxOf);
    const progress = items.map((item) => presses.current.get(item)?.progress ?? 0);
    if (progress.every((value) => value === 0)) {
      for (const box of boxes) box?.style.removeProperty('width');
      naturalWidths.current = null;
      return;
    }
    // No inline widths are set while naturalWidths is null, so this measures the rest layout.
    if (!naturalWidths.current || naturalWidths.current.length !== items.length) {
      for (const box of boxes) box?.style.removeProperty('width');
      naturalWidths.current = items.map((item, i) => (boxes[i] ?? item).getBoundingClientRect().width);
    }
    const natural = naturalWidths.current;
    const widths = natural.slice();
    const limits = boxes.map((box) => (box ? Number(box.getAttribute(GROUP_BOX_ATTR)) || 0 : 0));
    const widthAt = (i: number) => widths[i] ?? 0;
    const limitAt = (i: number) => limits[i] ?? 0;
    const count = widths.length;
    if (count > 1) {
      for (let i = 0; i < count; i++) {
        const itemProgress = progress[i] ?? 0;
        if (itemProgress === 0) continue;
        let gained: number;
        if (i >= 1 && i < count - 1) {
          // Middle: both neighbours give way.
          const growth = Math.round(
            itemProgress * Math.min((EXPANDED_RATIO * widthAt(i)) / 2, limitAt(i - 1), limitAt(i + 1)),
          );
          const fromPrev = Math.min(growth, widthAt(i - 1));
          const fromNext = Math.min(growth, widthAt(i + 1));
          widths[i - 1] = widthAt(i - 1) - fromPrev;
          widths[i + 1] = widthAt(i + 1) - fromNext;
          gained = fromPrev + fromNext;
        } else if (i === 0) {
          const growth = Math.round(itemProgress * Math.min(EXPANDED_RATIO * widthAt(i), limitAt(i + 1)));
          const fromNext = Math.min(growth, widthAt(i + 1));
          widths[i + 1] = widthAt(i + 1) - fromNext;
          gained = fromNext;
        } else {
          const growth = Math.round(itemProgress * Math.min(EXPANDED_RATIO * widthAt(i), limitAt(i - 1)));
          const fromPrev = Math.min(growth, widthAt(i - 1));
          widths[i - 1] = widthAt(i - 1) - fromPrev;
          gained = fromPrev;
        }
        widths[i] = widthAt(i) + gained;
      }
    }
    boxes.forEach((box, i) => {
      if (!box) return;
      if (widths[i] === natural[i]) box.style.removeProperty('width');
      else box.style.width = `${widths[i]}px`;
    });
  };

  const pressOf = (item: Element) => {
    let press = presses.current.get(item);
    if (!press) presses.current.set(item, (press = { progress: 0, anim: null, pressed: false, wait: 0 }));
    return press;
  };

  const animate = (item: Element, press: PressState, to: number) => {
    if (disposed.current) return;
    const params = springRef.current;
    if (!params) {
      press.anim?.stop();
      press.anim = null;
      press.progress = to;
      layout();
      return;
    }
    if (press.anim) {
      // Still running (release while the press spring is in flight): keep its velocity.
      press.anim.retarget(to);
      return;
    }
    press.anim = animateSpring({
      spring: params,
      from: press.progress,
      to,
      onUpdate: (value) => {
        press.progress = value;
        layout();
      },
      onComplete: () => {
        press.anim = null;
        if (press.progress === 0 && !press.pressed) presses.current.delete(item);
      },
    });
  };

  const pressItem = (item: Element) => {
    const press = pressOf(item);
    if (press.pressed) return;
    press.pressed = true;
    cancelAnimationFrame(press.wait);
    if (press.anim && press.anim.target === 1) return;
    // A press during the release spring cancels it (Compose resets the velocity) and starts afresh.
    press.anim?.stop();
    press.anim = null;
    animate(item, press, 1);
  };

  const releaseItem = (item: Element) => {
    const press = presses.current.get(item);
    if (!press?.pressed || disposed.current) return;
    press.pressed = false;
    const start = performance.now();
    const check = (now: number) => {
      if (press.pressed) return;
      if (press.progress > RELEASE_PROGRESS || now - start > MAX_WAIT_MS) animate(item, press, 0);
      else press.wait = requestAnimationFrame(check);
    };
    press.wait = requestAnimationFrame(check);
  };

  // Unmount: stop every press spring and pending release wait, drop the window listeners.
  useEffect(() => {
    disposed.current = false;
    const ends = pointerEnds.current;
    const all = presses.current;
    return () => {
      disposed.current = true;
      for (const press of all.values()) {
        press.anim?.stop();
        press.anim = null;
        cancelAnimationFrame(press.wait);
      }
      all.clear();
      for (const end of ends) {
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
      }
      ends.clear();
    };
  }, []);

  /** The group child holding `target`, if it is an enabled item with a resizable box. */
  const itemOf = (target: EventTarget | null): Element | null => {
    const root = ref.current;
    if (!root || !(target instanceof Node)) return null;
    let node: Node | null = target;
    while (node && node.parentNode !== root) node = node.parentNode;
    if (!(node instanceof Element) || !boxOf(node)) return null;
    if (node.matches(':disabled, [aria-disabled="true"], [data-disabled]')) return null;
    return node;
  };

  return {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const item = itemOf(e.target);
      if (!item) return;
      pressItem(item);
      const up = () => {
        releaseItem(item);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        pointerEnds.current.delete(up);
      };
      pointerEnds.current.add(up);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    },
    onKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if ((e.key !== ' ' && e.key !== 'Enter') || e.repeat) return;
      const item = itemOf(e.target);
      if (!item) return;
      keyItem.current = item;
      pressItem(item);
    },
    onKeyUp: (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if ((e.key !== ' ' && e.key !== 'Enter') || !keyItem.current) return;
      releaseItem(keyItem.current);
      keyItem.current = null;
    },
    onBlur: () => {
      if (!keyItem.current) return;
      releaseItem(keyItem.current);
      keyItem.current = null;
    },
  };
}
