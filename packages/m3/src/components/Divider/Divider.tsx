import type { ComponentPropsWithRef, ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import type { SxProps } from '../../primitives/types.ts';

export type DividerInset = 'none' | 'start' | 'middle';

/*
 * Figma kit, "Dividers" page: horizontal / vertical × full-width / inset / middle-inset, and
 * "Divider with subhead". A 1px outline-variant line; insets are 16px (start, or both sides for
 * middle). With a subheader: line, 4px, title-small on-surface-variant label, 16px inline padding.
 */
const s = stylex.create({
  horizontal: { display: 'flex', flexDirection: 'column', boxSizing: 'border-box', width: '100%', flexShrink: 0 },
  vertical: {
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    width: 1,
    alignSelf: 'stretch',
    flexShrink: 0,
  },
  line: { backgroundColor: color.outlineVariant, flexShrink: 0 },
  lineH: { height: 1 },
  lineV: { width: 1, flexGrow: 1 },
  insetStartH: { paddingInlineStart: 16 },
  insetMiddleH: { paddingInline: 16 },
  insetStartV: { paddingTop: 16 },
  insetMiddleV: { paddingBlock: 16 },
  withSub: { paddingInline: 16, rowGap: 4 },
  sub: { color: color.onSurfaceVariant, margin: 0 },
});

/** `ref`, native props and `sx` go to the root `<div role="separator">`. */
export interface DividerProps extends SxProps<Omit<ComponentPropsWithRef<'div'>, 'children'>> {
  orientation?: 'horizontal' | 'vertical';
  inset?: DividerInset;
  /** Horizontal only: a subheader under the line ("Divider with subhead"). */
  subheader?: ReactNode;
}

export function Divider({ orientation = 'horizontal', inset = 'none', subheader, sx, ...rest }: DividerProps) {
  const horizontal = orientation === 'horizontal';
  const withSubheader = subheader != null && horizontal;
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      {...rest}
      {...stylex.props(
        horizontal ? s.horizontal : s.vertical,
        withSubheader
          ? s.withSub
          : inset === 'start'
            ? horizontal
              ? s.insetStartH
              : s.insetStartV
            : inset === 'middle'
              ? horizontal
                ? s.insetMiddleH
                : s.insetMiddleV
              : null,
        sx,
      )}
    >
      <span {...stylex.props(s.line, horizontal ? s.lineH : s.lineV)} />
      {withSubheader && <p {...stylex.props(typescale.titleSmall, s.sub)}>{subheader}</p>}
    </div>
  );
}
