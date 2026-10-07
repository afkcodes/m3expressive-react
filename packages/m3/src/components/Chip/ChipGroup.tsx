import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';

/** Kit "Chip groups": chips 8px apart in one scrollable row or wrapping rows (16px apart). */
const groupStyles = stylex.create({
  group: { display: 'flex', alignItems: 'center', columnGap: 8, paddingBlock: 8, boxSizing: 'border-box' },
  scroll: { flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none' },
  wrap: { flexWrap: 'wrap', rowGap: 16 },
});

export interface ChipGroupProps {
  /** One scrollable row, or wrapping rows (kit "Chip groups"). */
  layout?: 'scroll' | 'wrap';
  'aria-label'?: string;
  children: ReactNode;
  sx?: StyleXStyles;
}

export function ChipGroup({ layout = 'wrap', children, sx, ...rest }: ChipGroupProps) {
  return (
    <div
      role="group"
      {...rest}
      {...stylex.props(groupStyles.group, layout === 'scroll' ? groupStyles.scroll : groupStyles.wrap, sx)}
    >
      {children}
    </div>
  );
}
