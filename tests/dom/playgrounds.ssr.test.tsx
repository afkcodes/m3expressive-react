import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { playgrounds } from './pages.ts';

/** Server rendering: no window / document at module scope or during render (Next.js, Remix, …). */
describe('every playground renders on the server', () => {
  for (const { name, Page } of playgrounds) {
    it(name, () => {
      expect(renderToString(<Page />).length).toBeGreaterThan(0);
    });
  }
});
