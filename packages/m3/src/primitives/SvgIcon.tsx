import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';

const s = stylex.create({
  icon: { display: 'block', flexShrink: 0, fill: 'currentColor' },
  size: (px: number) => ({ width: px, height: px }),
});

export interface SvgIconProps {
  /** SVG path data (Material Symbols / kit icon). */
  d: string;
  /** Rendered size in px (default 24). */
  size?: number;
  /** viewBox side (default 24, the Material Symbols grid). */
  viewBox?: number;
  sx?: StyleXStyles;
}

/** A single-path icon in currentColor — decorative (`aria-hidden`); name the control that holds it. */
export function SvgIcon({ d, size = 24, viewBox = 24, sx }: SvgIconProps) {
  return (
    <svg viewBox={`0 0 ${viewBox} ${viewBox}`} aria-hidden {...stylex.props(s.icon, s.size(size), sx)}>
      <path d={d} />
    </svg>
  );
}

/** Icon paths shared by several components (Material Symbols, 24 grid). */
export const ICON_PATHS = {
  close: 'M6.4 19L5 17.6L10.6 12L5 6.4L6.4 5L12 10.6L17.6 5L19 6.4L13.4 12L19 17.6L17.6 19L12 13.4L6.4 19Z',
} as const;
