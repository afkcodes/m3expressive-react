// @vitest-environment jsdom
import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { SCROLL_DISTANCE_THRESHOLD, useFloatingToolbarNestedScroll } from './scrollBehavior.ts';

/*
 * Compose Modifier.floatingToolbarVerticalNestedScroll (VerticalNestedScrollExpansionNode): the
 * content offset accumulates the scroll; scrolling down to `threshold` collapses and re-arms the
 * threshold 40px above, scrolling up to it expands and re-arms 40px below — each threshold is
 * measured from the last turn. jsdom has no layout: the test sets `scrollTop` and dispatches
 * `scroll` itself.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface Options {
  initial?: boolean;
  expandScrollDistanceThreshold?: number;
  collapseScrollDistanceThreshold?: number;
  reverseLayout?: boolean;
}

async function mount(options: Options = {}) {
  const calls: boolean[] = [];
  let expanded = options.initial ?? true;
  let scroller: HTMLDivElement | null = null;
  function Probe() {
    const [state, setState] = useState(options.initial ?? true);
    expanded = state;
    const ref = useFloatingToolbarNestedScroll({
      ...options,
      expanded: state,
      onExpandedChange: (next) => {
        calls.push(next);
        setState(next);
      },
    });
    return createElement('div', {
      ref: (el: HTMLDivElement | null) => {
        scroller = el;
        ref(el);
      },
    });
  }
  const root = createRoot(document.body.appendChild(document.createElement('div')));
  await act(async () => root.render(createElement(Probe)));
  let top = 0;
  Object.defineProperty(scroller!, 'scrollTop', { get: () => top, configurable: true });
  return {
    calls,
    expanded: () => expanded,
    /** Scroll the content to `y` (one scroll event). */
    scrollTo: (y: number) =>
      act(async () => {
        top = y;
        scroller!.dispatchEvent(new Event('scroll'));
      }),
    unmount: () => act(async () => root.unmount()),
  };
}

describe('useFloatingToolbarNestedScroll', () => {
  it('collapses after 40px of scrolling down, not before', async () => {
    expect(SCROLL_DISTANCE_THRESHOLD).toBe(40);
    const t = await mount();
    await t.scrollTo(20);
    await t.scrollTo(39);
    expect(t.calls).toEqual([]);
    await t.scrollTo(40);
    expect(t.calls).toEqual([false]);
    expect(t.expanded()).toBe(false);
    await t.unmount();
  });

  it('expands after 40px back up from the last turn, with hysteresis', async () => {
    const t = await mount();
    await t.scrollTo(300);
    expect(t.calls).toEqual([false]);
    // Each further step down re-arms the threshold (Compose calls onCollapse again).
    await t.scrollTo(400);
    expect(t.calls).toEqual([false, false]);
    await t.scrollTo(361);
    expect(t.expanded()).toBe(false);
    await t.scrollTo(360);
    expect(t.calls.at(-1)).toBe(true);
    expect(t.expanded()).toBe(true);
    // Collapsing again needs 40px down from where it expanded.
    await t.scrollTo(399);
    expect(t.expanded()).toBe(true);
    await t.scrollTo(400);
    expect(t.expanded()).toBe(false);
    await t.unmount();
  });

  it('a small reversal never collapses (scrolling up while expanded only re-arms: onExpand again)', async () => {
    const t = await mount();
    for (const y of [10, 25, 5, 30, 12, 35, 1]) await t.scrollTo(y);
    expect(t.calls.includes(false)).toBe(false);
    expect(t.expanded()).toBe(true);
    await t.unmount();
  });

  it('uses the custom thresholds per direction', async () => {
    const t = await mount({ collapseScrollDistanceThreshold: 100, expandScrollDistanceThreshold: 10 });
    await t.scrollTo(99);
    expect(t.calls).toEqual([]);
    await t.scrollTo(100);
    expect(t.calls).toEqual([false]);
    await t.scrollTo(91);
    expect(t.calls).toEqual([false]);
    await t.scrollTo(90);
    expect(t.calls).toEqual([false, true]);
    await t.unmount();
  });

  it('a collapsed toolbar arms the expand threshold at mount', async () => {
    const t = await mount({ initial: false });
    await t.scrollTo(50);
    await t.scrollTo(11);
    expect(t.calls.filter(Boolean)).toEqual([]);
    await t.scrollTo(10);
    expect(t.calls.at(-1)).toBe(true);
    await t.unmount();
  });

  it('reverse layouts flip the direction', async () => {
    const t = await mount({ reverseLayout: true });
    // Content moving up counts as scrolling back: it re-arms 40px below (onExpand again).
    await t.scrollTo(100);
    expect(t.calls).toEqual([true]);
    await t.scrollTo(61);
    expect(t.expanded()).toBe(true);
    await t.scrollTo(60);
    expect(t.calls).toEqual([true, false]);
    expect(t.expanded()).toBe(false);
    await t.unmount();
  });
});
