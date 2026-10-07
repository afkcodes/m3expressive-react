import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { playgrounds } from './pages.ts';

/*
 * The library must work where browser APIs are missing — jsdom (consumers' component tests) has no
 * matchMedia, ResizeObserver, Element.animate or document.fonts. Mount, interact-free render and
 * unmount every playground; any throw or React error fails.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('every playground renders in jsdom', () => {
  it('found the playgrounds', () => {
    expect(playgrounds.length).toBeGreaterThanOrEqual(20);
  });

  for (const { name, Page } of playgrounds) {
    it(name, async () => {
      const errors: unknown[] = [];
      vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args));
      const host = document.body.appendChild(document.createElement('div'));
      const root = createRoot(host);
      await act(async () => root.render(<Page />));
      expect(host.childElementCount).toBeGreaterThan(0);
      await act(async () => root.unmount());
      expect(errors).toEqual([]);
    });
  }
});
