/**
 * Pointer input for the live specs. Velocity-dependent gestures are dispatched inside the page on
 * an exact schedule (CDP input timing jitters under load; CLAUDE.md §5).
 */
import type { Locator, Page } from '@playwright/test';

export interface Point {
  x: number;
  y: number;
}

/** The centre of `target`'s box (viewport CSS px). */
export async function centre(target: Locator): Promise<Point> {
  const b = (await target.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Moves the mouse to the centre of `target` (no actionability checks, unlike `hover()`). */
export async function moveToCentre(target: Locator) {
  const { x, y } = await centre(target);
  await target.page().mouse.move(x, y);
}

/** A move to (start + dx, start + dy), `ms` after the previous event. */
export type DragStep = readonly [dx: number, dy: number, ms: number];

export interface DragOptions {
  /** Dispatch on this element (default: the element under the start point). */
  target?: Locator;
  pointerType?: 'mouse' | 'touch';
  pointerId?: number;
  /** Rest this long at the last point before the release (timers and frames keep running). */
  holdMs?: number;
}

/** In the page: the drag itself (busy-waits between events; the times are absolute, so they don't drift). */
async function dragInPage(
  el: Element,
  o: {
    at: Point | null;
    from: Point;
    steps: readonly DragStep[];
    pointerType: string;
    pointerId: number;
    holdMs: number;
  },
) {
  const target = o.at ? document.elementFromPoint(o.at.x, o.at.y)! : el;
  const fire = (type: string, x: number, y: number) =>
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: o.pointerId,
        pointerType: o.pointerType,
        isPrimary: true,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        clientX: x,
        clientY: y,
      }),
    );
  let [x, y] = [o.from.x, o.from.y];
  let t = performance.now();
  fire('pointerdown', x, y);
  for (const [dx, dy, ms] of o.steps) {
    t += ms;
    while (performance.now() < t);
    [x, y] = [o.from.x + dx, o.from.y + dy];
    fire('pointermove', x, y);
  }
  if (o.holdMs) await new Promise((resolve) => setTimeout(resolve, o.holdMs));
  fire('pointerup', x, y);
}

/**
 * A pointer drag dispatched inside the page with exact timing: down at `from`, then each step's
 * move `ms` after the previous event, then up at the last point — at once (released while moving)
 * or after `holdMs` at rest.
 */
export async function pointerDrag(page: Page, from: Point, steps: readonly DragStep[], options: DragOptions = {}) {
  const { target, pointerType = 'mouse', pointerId = 7, holdMs = 0 } = options;
  await (target ?? page.locator(':root')).evaluate(dragInPage, {
    at: target ? null : from,
    from,
    steps,
    pointerType,
    pointerId,
    holdMs,
  });
}

/**
 * Real touch input through CDP: a touch at `from`, then `n` moves of (dx, dy) / n, 16ms apart.
 * Returns the release (the touch stays down until it is called).
 */
export async function touchDrag(page: Page, from: Point, dx: number, dy: number, n = 10) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await send('touchStart', from.x, from.y);
  for (let i = 1; i <= n; i++) {
    await send('touchMove', from.x + (dx * i) / n, from.y + (dy * i) / n);
    // The drag's pace (one move a frame), not a wait for the page.
    await page.waitForTimeout(16);
  }
  return async () => {
    await send('touchEnd', 0, 0);
    await cdp.detach();
  };
}
