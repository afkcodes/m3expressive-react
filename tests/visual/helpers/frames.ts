/**
 * Per-frame sampling inside the page: motion is read on every animation frame, where it happens,
 * not by polling from the test runner.
 */
import type { Locator, Page } from '@playwright/test';

/** One sample: `t` in ms (frame timestamps) from the action, or from the first sample without one. */
export interface Frame<T> {
  t: number;
  v: T;
}

/**
 * Runs in the page and returns the per-frame function. Page functions can't close over test
 * variables: pass those as `arg`.
 */
export type InPage<A, F> = (arg: A) => F;

export interface FrameOptions<A> {
  /** Runs right after the first sample, in the same frame (e.g. a click), so the motion starts in view. */
  act?: InPage<A, (el: Element) => void>;
  arg?: A;
}

/**
 * Starts sampling `read(el)` every animation frame for `ms` and resolves once the first sample has
 * been taken (and `act` has run), so a test action that follows lands inside the recording. Call
 * the returned function for the frames. A page samples its root element.
 */
export async function recordFrames<T, A = undefined>(
  target: Locator | Page,
  ms: number,
  read: InPage<A, (el: Element) => T>,
  { act, arg }: FrameOptions<A> = {},
): Promise<() => Promise<Frame<T>[]>> {
  const root = 'goto' in target ? target.locator(':root') : target;
  const page = root.page();
  // Generic page functions don't fit Playwright's Unboxed<Arg> inference: the arg is plain data.
  const reader = await page.evaluateHandle(read as InPage<unknown, (el: Element) => T>, arg);
  const action = act ? await page.evaluateHandle(act as InPage<unknown, (el: Element) => void>, arg) : null;
  const recording = await root.evaluateHandle(
    (el, o) =>
      new Promise<{ done: Promise<Frame<T>[]> }>((started, failed) => {
        // The unwrapped rAF when settle() counts the page's frames: the sampler's own aren't motion.
        const counted = (window as Window & { __m3xFrames?: { native: typeof requestAnimationFrame } }).__m3xFrames;
        const nextFrame = counted ? counted.native : requestAnimationFrame;
        const out: Frame<T>[] = [];
        let finish: (frames: Frame<T>[]) => void = () => {};
        let fail: (error: unknown) => void = () => {};
        const done = new Promise<Frame<T>[]>((resolve, reject) => {
          finish = resolve;
          fail = reject;
        });
        let t0 = 0;
        const tick = (now: number) => {
          try {
            if (out.length === 0) t0 = now;
            const v = o.read(el);
            if (out.length === 0 && o.act) {
              t0 = performance.now();
              o.act(el);
            }
            out.push({ t: now - t0, v });
          } catch (error) {
            // A throwing reader ends the recording with its error instead of hanging it.
            if (out.length === 0) failed(error);
            else fail(error);
            return;
          }
          if (out.length === 1) started({ done });
          if (now - t0 < o.ms) nextFrame(tick);
          else finish(out);
        };
        nextFrame(tick);
      }),
    { read: reader, act: action, ms },
  );
  return async () => {
    const frames = await recording.evaluate((r) => r.done);
    await Promise.all([recording.dispose(), reader.dispose(), action?.dispose()]);
    return frames;
  };
}

/** Samples `read(el)` every animation frame for `ms` (see recordFrames) and returns the frames. */
export async function sampleFrames<T, A = undefined>(
  target: Locator | Page,
  ms: number,
  read: InPage<A, (el: Element) => T>,
  options: FrameOptions<A> = {},
): Promise<Frame<T>[]> {
  return (await recordFrames(target, ms, read, options))();
}
