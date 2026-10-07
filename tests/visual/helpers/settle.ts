/**
 * Waiting for motion to end, and counting animation frames, without fixed timeouts.
 */
import type { Locator, Page } from '@playwright/test';

/** The page's requestAnimationFrame calls, counted by a wrapper (`native` bypasses it). */
interface FrameCounter {
  requests: number;
  native: (callback: FrameRequestCallback) => number;
}
type CountingWindow = Window & { __m3xFrames?: FrameCounter };

/** In the page: wraps requestAnimationFrame once per document; returns the requests so far. */
function installFrameCounter(): number {
  const w = window as CountingWindow;
  if (!w.__m3xFrames) {
    const native = window.requestAnimationFrame.bind(window);
    const counter: FrameCounter = { requests: 0, native };
    window.requestAnimationFrame = (callback) => {
      counter.requests++;
      return native(callback);
    };
    w.__m3xFrames = counter;
  }
  return w.__m3xFrames.requests;
}

/**
 * Counts the page's requestAnimationFrame calls from now on (settle()'s own frames don't count).
 * Returns a reader of the count.
 */
export async function countFrames(page: Page): Promise<() => Promise<number>> {
  const start = await page.evaluate(installFrameCounter);
  return async () => (await page.evaluate(() => (window as CountingWindow).__m3xFrames!.requests)) - start;
}

export interface SettleOptions {
  /**
   * Also wait for requestAnimationFrame-driven motion (animateSpring, gesture settles, staggers,
   * the progress frame clock) to stop: until the page requests no frame for two frames. Default
   * true; pass false on pages with endless rAF motion (wavy or indeterminate progress).
   */
  springs?: boolean;
  /** Give up after this many ms (default 5000). */
  timeout?: number;
}

/** In the page: null once settled, else what is still moving when the deadline passes. */
async function settleInPage(
  root: Element,
  o: { document: boolean; springs: boolean; timeout: number },
): Promise<string | null> {
  const counter = (window as CountingWindow).__m3xFrames!;
  const frame = () => new Promise<void>((resolve) => counter.native(() => resolve()));
  // Finished (filled), paused and endless animations never end on their own: not motion to wait for.
  const running = () =>
    (o.document ? document.getAnimations() : root.getAnimations({ subtree: true })).filter(
      (a) => a.playState === 'running' && a.effect?.getComputedTiming().endTime !== Infinity,
    );
  const describe = (a: Animation) => {
    const name = (a as CSSTransition).transitionProperty || (a as CSSAnimation).animationName || a.id || 'animation';
    const target = (a.effect as KeyframeEffect | null)?.target;
    return `${name} on ${target ? target.tagName.toLowerCase() : '?'}`;
  };
  const deadline = performance.now() + o.timeout;
  const timeLeft = () => new Promise((resolve) => setTimeout(resolve, Math.max(0, deadline - performance.now())));
  for (;;) {
    let anims = running();
    while (anims.length > 0) {
      if (performance.now() > deadline) return `still running: ${anims.map(describe).join(', ')}`;
      await Promise.race([Promise.all(anims.map((a) => a.finished.catch(() => null))), timeLeft()]);
      anims = running();
    }
    // Two quiet frames: motion that starts a frame later (an effect, a cascading transition, the
    // next spring segment) shows up here.
    const requests = counter.requests;
    await frame();
    await frame();
    const looping = o.springs && counter.requests !== requests;
    if (!looping && running().length === 0) return null;
    if (performance.now() > deadline) return 'animation frames still requested (a rAF loop is running)';
  }
}

/**
 * Waits for motion to finish: every running CSS transition / animation and Web Animation (in the
 * locator's subtree, pseudo-elements included, or the whole document for a page) has ended, then
 * two frames pass with nothing new started; with `springs` (default) also no rAF loop. Use it
 * instead of a fixed timeout before reading an end state; keep fixed waits only where the timing
 * itself is under test.
 */
export async function settle(target: Page | Locator, { springs = true, timeout = 5000 }: SettleOptions = {}) {
  const isPage = 'goto' in target;
  const page = isPage ? target : target.page();
  await page.evaluate(installFrameCounter);
  const root = isPage ? target.locator(':root') : target;
  const pending = await root.evaluate(settleInPage, { document: isPage, springs, timeout });
  if (pending) throw new Error(`settle: ${pending} after ${timeout}ms`);
}
