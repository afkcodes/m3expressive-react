// @vitest-environment jsdom
import { act, createElement, type RefObject } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stepSpring } from '../../motion/spring.ts';
import { motionSchemes } from '../../motion/tokens.ts';
import {
  COLLAPSED_HEIGHT,
  EXPANDED_HEIGHT,
  EXPANDED_HEIGHT_WITH_SUBTITLE,
  useAppBarScrollEvents,
  type AppBarScrollOptions,
  type AppBarScrollState,
  type TopAppBarSize,
} from './useAppBarScroll.ts';

/*
 * The scroll engine of the top app bars (Compose TopAppBarScrollBehavior): collapsed fraction =
 * scroll / (expanded − 64) for medium (112) and large (120) bars; exitUntilCollapsed pads the
 * scroller by the collapsed amount and, when a scroll stops part way, settles (settleAppBar) to
 * the nearer end on default effects (TopAppBarDefaults.snapAnimationSpec). jsdom has no layout:
 * the test owns `scrollTop`, `scrollTo` and the `scroll` / `scrollend` events; requestAnimationFrame
 * is a fake clock.
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
  // Take the `scrollend` path of onScrollEnd (no 150ms timer).
  Object.defineProperty(window, 'onscrollend', { value: null, configurable: true });
});
afterEach(() => vi.unstubAllGlobals());

async function mount(size: TopAppBarSize, options: AppBarScrollOptions = {}, basePadding = '') {
  const states: AppBarScrollState[] = [];
  let top = 0;
  const scrolledTo: number[] = [];
  // The scroller's ref, as an app would hold it (`scrollTarget`).
  const target: RefObject<HTMLDivElement | null> = { current: null };
  function Probe() {
    useAppBarScrollEvents(target, size, options, (state) => states.push(state));
    return createElement('div', { ref: target, style: basePadding ? { paddingTop: basePadding } : undefined });
  }
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  await act(async () => root.render(createElement(Probe)));
  // The hook attached on mount (jsdom scrollTop 0); from here on the test owns the scroll position.
  const scroller = host.firstElementChild as HTMLDivElement;
  Object.defineProperty(scroller, 'scrollTop', { get: () => top, configurable: true });
  scroller.scrollTo = ((opts: ScrollToOptions) => {
    top = opts.top!;
    scrolledTo.push(top);
  }) as typeof scroller.scrollTo;
  return {
    states,
    scrolledTo,
    scroller: () => scroller,
    top: () => top,
    scroll: (y: number) =>
      act(async () => {
        top = y;
        scroller.dispatchEvent(new Event('scroll'));
      }),
    end: () => act(async () => scroller.dispatchEvent(new Event('scrollend'))),
    unmount: () => act(async () => root.unmount()),
  };
}

describe('useAppBarScrollEvents', () => {
  it('bar heights: medium 112, large 120, every bar collapses to 64', () => {
    expect(EXPANDED_HEIGHT).toEqual({ small: 64, medium: 112, large: 120 });
    expect(COLLAPSED_HEIGHT).toBe(64);
    // Compose Medium / LargeFlexibleAppBarWithSubtitleExpandedHeight.
    expect(EXPANDED_HEIGHT_WITH_SUBTITLE).toEqual({ small: 64, medium: 136, large: 152 });
  });

  it('a bar with a subtitle collapses over its taller range (medium: 72px)', async () => {
    const t = await mount('medium', { subtitle: true });
    await t.scroll(36);
    await t.scroll(72);
    expect(t.states.slice(1)).toEqual([
      { overlapped: true, fraction: 0.5 },
      { overlapped: true, fraction: 1 },
    ]);
    await t.unmount();
  });

  it('reports once on attach, then the fraction scroll / range (clamped) and overlap per scroll', async () => {
    const t = await mount('medium');
    expect(t.states).toEqual([{ overlapped: false, fraction: 0 }]);
    await t.scroll(12);
    await t.scroll(24);
    await t.scroll(48);
    await t.scroll(500);
    await t.scroll(-20); // iOS-style overscroll counts as the top
    expect(t.states.slice(1)).toEqual([
      { overlapped: true, fraction: 0.25 },
      { overlapped: true, fraction: 0.5 },
      { overlapped: true, fraction: 1 },
      { overlapped: true, fraction: 1 },
      { overlapped: false, fraction: 0 },
    ]);
    await t.unmount();
  });

  it('large bars collapse over 56px; small bars only report overlap', async () => {
    const large = await mount('large');
    await large.scroll(14);
    expect(large.states.at(-1)).toEqual({ overlapped: true, fraction: 0.25 });
    await large.unmount();
    const small = await mount('small', { exitUntilCollapsed: true });
    await small.scroll(30);
    expect(small.states.at(-1)).toEqual({ overlapped: true, fraction: 0 });
    // No range: nothing to pad or settle.
    expect(small.scroller().style.paddingTop).toBe('');
    await small.end();
    expect(queue.size).toBe(0);
    await small.unmount();
  });

  it('exitUntilCollapsed pads the scroller by the collapsed amount on top of its own padding', async () => {
    const t = await mount('medium', { exitUntilCollapsed: true }, '8px');
    const el = t.scroller();
    expect(el.style.overflowAnchor).toBe('none');
    await t.scroll(20);
    expect(el.style.paddingTop).toBe('28px');
    await t.scroll(200);
    expect(el.style.paddingTop).toBe('56px');
    await t.scroll(0);
    expect(el.style.paddingTop).toBe('8px');
    await t.unmount();
    // Restored on detach.
    expect([el.style.paddingTop, el.style.overflowAnchor]).toEqual(['8px', '']);
  });

  it('a scroll ending less than half collapsed settles open on default effects', async () => {
    const snap = motionSchemes.expressive['default-effects'];
    const t = await mount('medium', { exitUntilCollapsed: true });
    await t.scroll(20);
    await t.end();
    frame(0);
    frame(16);
    expect(t.scrolledTo.at(-1)).toBeCloseTo(stepSpring(snap, { value: 20, velocity: 0 }, 0, 16).value, 9);
    for (let ms = 32; ms < 1000; ms += 16) frame(ms);
    expect(t.top()).toBe(0);
    expect(queue.size).toBe(0);
    await t.unmount();
  });

  it('half collapsed or more settles shut; under 1% or fully collapsed is left alone', async () => {
    const t = await mount('medium', { exitUntilCollapsed: true });
    await t.scroll(24);
    await t.end();
    for (let ms = 0; ms < 1000; ms += 16) frame(ms);
    expect(t.top()).toBe(48);
    const count = t.scrolledTo.length;
    await t.scroll(0.4); // 0.83%
    await t.end();
    await t.scroll(48);
    await t.end();
    await t.scroll(300);
    await t.end();
    expect(queue.size).toBe(0);
    expect(t.scrolledTo).toHaveLength(count);
    await t.unmount();
  });

  it('without exitUntilCollapsed nothing settles', async () => {
    const t = await mount('large');
    await t.scroll(20);
    await t.end();
    expect(queue.size).toBe(0);
    await t.unmount();
  });

  it('a user gesture takes over from a running settle; unmount stops it too', async () => {
    const t = await mount('medium', { exitUntilCollapsed: true });
    await t.scroll(30);
    await t.end();
    frame(0);
    frame(16);
    expect(queue.size).toBe(1);
    t.scroller().dispatchEvent(new Event('wheel'));
    expect(queue.size).toBe(0);
    // A new scroll end starts a fresh settle; unmounting cancels it.
    await t.end();
    expect(queue.size).toBe(1);
    await t.unmount();
    expect(queue.size).toBe(0);
  });

  it('a programmatic scroll during the settle takes over too', async () => {
    const t = await mount('medium', { exitUntilCollapsed: true });
    await t.scroll(30);
    await t.end();
    frame(0);
    frame(16);
    // The settle's own write comes back as a scroll event: it keeps running.
    await t.scroll(t.top());
    expect(queue.size).toBe(1);
    // scrollTo / focus moved the scroller elsewhere: the settle stops and leaves it there.
    await t.scroll(48);
    expect(queue.size).toBe(0);
    frame(32);
    expect(t.top()).toBe(48);
    await t.unmount();
  });
});
