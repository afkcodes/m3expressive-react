import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as FrameClockModule from './frameClock.ts';

/*
 * The shared frame loop: one requestAnimationFrame for every subscriber, called in subscription
 * order, stopped when the last one leaves. requestAnimationFrame is a fake clock, and each test
 * imports a fresh module (the loop's state is module-level).
 */

let clock: typeof FrameClockModule;
let queue = new Map<number, FrameRequestCallback>();
let nextId = 1;
const requested: number[] = [];
const cancelled: number[] = [];

function frame(now: number) {
  const callbacks = [...queue.values()];
  queue = new Map();
  for (const callback of callbacks) callback(now);
}

beforeEach(async () => {
  queue = new Map();
  nextId = 1;
  requested.length = 0;
  cancelled.length = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextId++;
    queue.set(id, callback);
    requested.push(id);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    cancelled.push(id);
    queue.delete(id);
  });
  vi.resetModules();
  clock = await import('./frameClock.ts');
});
afterEach(() => vi.unstubAllGlobals());

describe('onEveryFrame', () => {
  it('runs every subscriber from one rAF loop, in subscription order, with the frame time', () => {
    const calls: string[] = [];
    clock.onEveryFrame((t) => calls.push(`a${t}`));
    clock.onEveryFrame((t) => calls.push(`b${t}`));
    clock.onEveryFrame((t) => calls.push(`c${t}`));
    expect(requested).toHaveLength(1);
    frame(16);
    frame(32);
    expect(calls).toEqual(['a16', 'b16', 'c16', 'a32', 'b32', 'c32']);
    // One request per frame, never one per subscriber.
    expect(requested).toHaveLength(3);
    expect(queue.size).toBe(1);
  });

  it('stops the loop when the last subscriber leaves, and restarts on the next subscribe', () => {
    const a = vi.fn<(now: number) => void>();
    const offA = clock.onEveryFrame(a);
    const offB = clock.onEveryFrame(vi.fn<(now: number) => void>());
    offA();
    expect(cancelled).toHaveLength(0);
    offB();
    expect(cancelled).toEqual([1]);
    expect(queue.size).toBe(0);
    // Unsubscribing twice is harmless.
    offB();
    expect(cancelled).toHaveLength(1);
    clock.onEveryFrame(a);
    expect(queue.size).toBe(1);
    frame(50);
    expect(a).toHaveBeenCalledWith(50);
  });

  it('a subscriber removed during a frame is not called later in that frame', () => {
    const calls: string[] = [];
    const offB = { current: () => {} };
    clock.onEveryFrame(() => {
      calls.push('a');
      offB.current();
    });
    offB.current = clock.onEveryFrame(() => calls.push('b'));
    clock.onEveryFrame(() => calls.push('c'));
    frame(16);
    frame(32);
    expect(calls).toEqual(['a', 'c', 'a', 'c']);
  });

  it('a subscriber added during a frame starts on the next frame, without a second loop', () => {
    const calls: string[] = [];
    let added = false;
    clock.onEveryFrame(() => {
      calls.push('a');
      if (!added) {
        added = true;
        clock.onEveryFrame(() => calls.push('late'));
      }
    });
    frame(16);
    expect(calls).toEqual(['a']);
    expect(queue.size).toBe(1);
    frame(32);
    expect(calls).toEqual(['a', 'a', 'late']);
    expect(queue.size).toBe(1);
  });

  it('the last subscriber leaving inside its own callback ends the loop (no request after the frame)', () => {
    const off = clock.onEveryFrame(() => off());
    frame(16);
    expect(queue.size).toBe(0);
    expect(requested).toHaveLength(1);
    expect(cancelled).toHaveLength(0);
  });

  it('leaving and rejoining within one frame keeps exactly one loop', () => {
    const calls: number[] = [];
    let off = clock.onEveryFrame(function first(t) {
      calls.push(t);
      off();
      off = clock.onEveryFrame(first);
    });
    frame(16);
    frame(32);
    expect(calls).toEqual([16, 32]);
    expect(queue.size).toBe(1);
  });
});

describe('observeOnScreen', () => {
  it('without IntersectionObserver (SSR, jsdom) it never reports and cleans up as a no-op', () => {
    const onChange = vi.fn<(visible: boolean) => void>();
    const stop = clock.observeOnScreen({} as Element, onChange);
    stop();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports the latest entry of each batch and disconnects on cleanup', () => {
    const disconnect = vi.fn<() => void>();
    const observed: Element[] = [];
    let report: (entries: { isIntersecting: boolean }[]) => void = () => {};
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: typeof report) {
          report = callback;
        }
        observe(el: Element) {
          observed.push(el);
        }
        disconnect = disconnect;
      },
    );
    const element = {} as Element;
    const onChange = vi.fn<(visible: boolean) => void>();
    const stop = clock.observeOnScreen(element, onChange);
    expect(observed).toEqual([element]);
    report([{ isIntersecting: true }, { isIntersecting: false }]);
    report([]);
    report([{ isIntersecting: true }]);
    expect(onChange.mock.calls).toEqual([[false], [true]]);
    stop();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
