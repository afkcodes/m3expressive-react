import { forwardRef, useMemo, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { ListContext, type ListItemVariant } from './ListItem.tsx';

const s = stylex.create({
  root: { display: 'flex', flexDirection: 'column', margin: 0, padding: 0, listStyle: 'none', boxSizing: 'border-box' },
  // Segmented (filled): items are separate Surface tiles 2px apart inside a 16px-cornered clip,
  // so the first / last items show the list's outer corners (Compose segmentedShapes).
  segmented: { rowGap: 2, borderRadius: 16, overflow: 'hidden' },
});

export interface ListProps {
  /** "standard" (items on the background) or "segmented" (filled tiles, 2px gaps). */
  type?: 'standard' | 'segmented';
  /** Item style for the whole list (expressive by default; "baseline" = the classic M3 list). */
  variant?: ListItemVariant;
  'aria-label'?: string;
  children: ReactNode;
  sx?: StyleXStyles;
}

/** A list of <ListItem>s (rendered as ul/li). */
export const List = forwardRef<HTMLUListElement, ListProps>(function List(
  { type = 'standard', variant = 'expressive', children, sx, ...aria },
  ref,
) {
  const segmented = type === 'segmented';
  const ctx = useMemo(() => ({ inList: true, segmented, variant }), [segmented, variant]);
  return (
    <ListContext value={ctx}>
      <ul ref={ref} {...aria} {...stylex.props(s.root, type === 'segmented' && s.segmented, sx)}>
        {children}
      </ul>
    </ListContext>
  );
});
