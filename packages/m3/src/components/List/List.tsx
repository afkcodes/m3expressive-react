import { useMemo, type ComponentPropsWithRef, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { SxProps } from '../../primitives/types.ts';
import { ListContext, type ListVariant } from './context.ts';

const s = stylex.create({
  root: { display: 'flex', flexDirection: 'column', margin: 0, padding: 0, listStyle: 'none', boxSizing: 'border-box' },
  // Segmented (filled): items are separate Surface tiles 2px apart inside a 16px-cornered clip,
  // so the first / last items show the list's outer corners (Compose segmentedShapes).
  segmented: { rowGap: 2, borderRadius: 16, overflow: 'hidden' },
});

/** `ref`, native props and `sx` go to the `<ul>`. */
export interface ListProps extends SxProps<ComponentPropsWithRef<'ul'>> {
  /**
   * `standard` (expressive items on the background, the default), `segmented` (expressive filled
   * tiles, 2px gaps) or `baseline` (the classic M3 list). Items read it from the list.
   */
  variant?: ListVariant;
  children: ReactNode;
}

/** A list of <ListItem>s (rendered as ul/li). */
export function List({ variant = 'standard', children, sx, ...rest }: ListProps) {
  const ctx = useMemo(() => ({ inList: true, variant }), [variant]);
  return (
    <ListContext value={ctx}>
      <ul {...rest} {...stylex.props(s.root, variant === 'segmented' && s.segmented, sx)}>
        {children}
      </ul>
    </ListContext>
  );
}
