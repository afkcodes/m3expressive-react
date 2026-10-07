import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';

const CHECK =
  'M7.95831 15.0001L3.20831 10.2501L4.39581 9.06258L7.95831 12.6251L15.6041 4.97925L16.7916 6.16675L7.95831 15.0001Z';

const s = stylex.create({
  media: {
    position: 'relative',
    display: 'block',
    flexShrink: 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
    backgroundColor: color.surfaceContainerHigh,
  },
  // Expressive thumbnails: 4px corners and a 1px outline-variant stroke (inside).
  expressive: { borderRadius: 4 },
  stroke: {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: color.outlineVariant,
    pointerEvents: 'none',
  },
  image: { width: 56, height: 56 },
  video: { width: 114, height: 64 },
  img: { display: 'block', width: '100%', height: '100%', objectFit: 'contain' },
  check: {
    position: 'absolute',
    left: 18,
    top: 18,
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: color.primary,
    color: color.onPrimary,
  },
  monogram: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: color.primaryContainer,
    color: color.onPrimaryContainer,
  },
});

interface MediaProps {
  src?: string;
  alt?: string;
  /** Expressive style (4px corners + outline) — false for the baseline list. */
  expressive?: boolean;
  /** Styles for the <img> itself (object-fit / position, blend modes…). */
  imageSx?: StyleXStyles;
  sx?: StyleXStyles;
}

/** 56px image thumbnail. `selected` overlays the expressive check badge. */
export function ListItemImage({
  src,
  alt = '',
  expressive = true,
  selected = false,
  imageSx,
  sx,
}: MediaProps & { selected?: boolean }) {
  return (
    <span {...stylex.props(s.media, s.image, expressive && s.expressive, sx)}>
      {src && <img src={src} alt={alt} {...stylex.props(s.img, imageSx)} />}
      {expressive && <span aria-hidden {...stylex.props(s.stroke)} />}
      {selected && (
        <span aria-hidden {...stylex.props(s.check)}>
          <svg width={20} height={20} viewBox="0 0 20 20" fill="currentColor">
            <path d={CHECK} />
          </svg>
        </span>
      )}
    </span>
  );
}

/** 114×64 video thumbnail. */
export function ListItemVideo({ src, alt = '', expressive = true, imageSx, sx }: MediaProps) {
  return (
    <span data-media="video" {...stylex.props(s.media, s.video, expressive && s.expressive, sx)}>
      {src && <img src={src} alt={alt} {...stylex.props(s.img, imageSx)} />}
      {expressive && <span aria-hidden {...stylex.props(s.stroke)} />}
    </span>
  );
}

/** 40px monogram (initial on primary container). */
export function ListItemMonogram({ children, sx }: { children: ReactNode; sx?: StyleXStyles }) {
  return <span {...stylex.props(typescale.titleMedium, s.monogram, sx)}>{children}</span>;
}
