// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stepSpring, type SpringParams } from '../../motion/spring.ts';
import { motionSchemes } from '../../motion/tokens.ts';
import { useExitAlwaysOffset, type ExitAlwaysOffset } from './exitAlways.ts';

/*
 * Compose exitAlways (BottomAppBarState.heightOffset / FloatingToolbarState.offset): the offset
 * follows the scroll 1:1 between 0 (shown) and the limit (hidden, negative); settleAppBar /
 * settleFloatingToolbar springs a part-hidden bar to the nearer end. requestAnimationFrame is a
 * fake clock.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let queue = new Map<number, FrameRequestCallback>();
let nextId = 1;
function frame(now: number) {
  const callbacks = [...queue.values()];
  queue = new Map();
  for (const callback of callbacks) callback(now);
}

beforeEach(() => {
  queue = new Map();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextId++;
    queue.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => queue.delete(id));
});
afterEach(() => vi.unstubAllGlobals());

const snap = motionSchemes.expressive['default-effects'];

/** Mounts the hook; `limit` and `spring` can be changed by re-rendering. */
async function mount(limit: number, spring: SpringParams | null = snap) {
  const applied: number[] = [];
  let api!: ExitAlwaysOffset;
  function Probe(props: { limit: number; spring: SpringParams | null }) {
    api = useExitAlwaysOffset(
      (offset) => applied.push(offset),
      () => props.limit,
      props.spring,
    );
    return null;
  }
  const root = createRoot(document.createElement('div'));
  await act(async () => root.render(createElement(Probe, { limit, spring })));
  return {
    api: () => api,
    applied,
    rerender: (next: { limit: number; spring: SpringParams | null }) =>
      act(async () => root.render(createElement(Probe, next))),
    unmount: () => act(async () => root.unmount()),
  };
}

describe('useExitAlwaysOffset', () => {
  it('follows the scroll 1:1, clamped between shown (0) and the limit', async () => {
    const { api, applied, unmount } = await mount(-80);
    api().follow(-30);
    api().follow(-30);
    api().follow(-30);
    api().follow(45);
    api().follow(500);
    api().follow(-1000);
    expect(applied).toEqual([-30, -60, -80, -35, 0, -80]);
    await unmount();
  });

  it('settles less than half hidden back to shown, on the spring', async () => {
    const { api, applied, unmount } = await mount(-80);
    api().follow(-30);
    api().settle();
    expect(api().settling).toBe(true);
    frame(0);
    frame(16);
    expect(applied.at(-1)).toBeCloseTo(stepSpring(snap, { value: -30, velocity: 0 }, 0, 16).value, 9);
    for (let t = 32; t < 1000; t += 16) frame(t);
    expect(applied.at(-1)).toBe(0);
    expect(api().settling).toBe(false);
    await unmount();
  });

  it('settles half hidden or more to hidden', async () => {
    const { api, applied, unmount } = await mount(-80);
    api().follow(-40);
    api().settle();
    for (let t = 0; t < 1000; t += 16) frame(t);
    expect(applied.at(-1)).toBe(-80);
    await unmount();
  });

  it('without a spring (reduced motion) settles at once', async () => {
    const { api, applied, unmount } = await mount(-80, null);
    api().follow(-50);
    api().settle();
    expect(applied.at(-1)).toBe(-80);
    expect(api().settling).toBe(false);
    expect(queue.size).toBe(0);
    await unmount();
  });

  it('leaves a bar alone when under 1% hidden, fully hidden, or with nothing to hide', async () => {
    const { api, applied, unmount } = await mount(-80);
    api().follow(-0.7); // 0.875%
    api().settle();
    expect(api().settling).toBe(false);
    api().follow(-1000);
    api().settle();
    expect(api().settling).toBe(false);
    expect(applied).toEqual([-0.7, -80]);
    const zero = await mount(0);
    zero.api().follow(-10);
    zero.api().settle();
    expect(zero.applied).toEqual([0]);
    expect(zero.api().settling).toBe(false);
    await zero.unmount();
    await unmount();
  });

  it('a scroll during a settle takes over; stop() halts it where it is', async () => {
    const { api, applied, unmount } = await mount(-80);
    api().follow(-30);
    api().settle();
    frame(0);
    frame(16);
    const mid = applied.at(-1)!;
    api().follow(-5);
    expect(api().settling).toBe(false);
    expect(applied.at(-1)).toBeCloseTo(mid - 5, 9);
    expect(queue.size).toBe(0);
    api().settle();
    frame(100);
    api().stop();
    const count = applied.length;
    frame(116);
    expect(applied).toHaveLength(count);
    expect(api().settling).toBe(false);
    await unmount();
  });

  it('a second settle while one runs is ignored (no restart)', async () => {
    const { api, unmount } = await mount(-80);
    api().follow(-60);
    api().settle();
    frame(0);
    frame(16);
    api().settle();
    expect(queue.size).toBe(1);
    await unmount();
  });

  it('reads the limit and spring of the latest render', async () => {
    const { api, applied, rerender, unmount } = await mount(-80);
    await rerender({ limit: -40, spring: null });
    api().follow(-100);
    expect(applied.at(-1)).toBe(-40);
    api().follow(25); // 37.5% hidden
    api().settle();
    expect(applied.at(-1)).toBe(0);
    await unmount();
  });

  it('stops a running settle on unmount', async () => {
    const { api, unmount } = await mount(-80);
    api().follow(-30);
    api().settle();
    frame(0);
    await unmount();
    expect(queue.size).toBe(0);
  });
});
