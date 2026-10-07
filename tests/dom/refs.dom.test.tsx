import { act, createRef, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { List, ListItem } from '../../packages/m3/src/index.ts';

/*
 * docs/API-CONVENTIONS.md §1–2: `ref` and the native props land on the same element. Base UI's
 * trigger composition (Menu `trigger`, Tooltip children) puts both on one element and returns
 * focus through the ref, so a split (ref on a wrapper, handlers on the row) breaks focus return.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount(node: ReactNode) {
  const host = document.body.appendChild(document.createElement('div'));
  const root = createRoot(host);
  await act(async () => root.render(node));
  return { host, unmount: () => act(async () => root.unmount()) };
}

describe('ListItem ref and native props', () => {
  const rows = {
    button: { onClick: () => {} },
    link: { href: '#inbox' },
    static: {},
  };

  for (const [kind, props] of Object.entries(rows)) {
    for (const inList of [true, false]) {
      it(`${kind} row ${inList ? 'inside' : 'outside'} a List: ref is the element with the props`, async () => {
        const ref = createRef<HTMLElement>();
        const item = (
          <ListItem ref={ref} data-probe="row" {...props}>
            Inbox
          </ListItem>
        );
        const { unmount } = await mount(inList ? <List aria-label="Mail">{item}</List> : item);
        expect(ref.current).not.toBeNull();
        expect(ref.current!.getAttribute('data-probe')).toBe('row');
        expect(ref.current!.tagName).not.toBe('LI');
        await unmount();
      });
    }
  }
});
