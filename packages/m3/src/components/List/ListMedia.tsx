import { useContext, type ComponentPropsWithRef, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import type { SxProps } from '../../primitives/types.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import { ListContext, ListItemContext } from './context.ts';

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

/** `ref`, native props and `sx` go to the thumbnail's `<span>`. */
export interface ListItemImageProps extends SxProps<Omit<ComponentPropsWithRef<'span'>, 'children'>> {
  src?: string;
  alt?: string;
  /** Styles for the <img> itself (object-fit / position, blend modes…). */
  imageSx?: StyleXStyles;
}

/** The enclosing item's style (expressive: 4px corners + outline) and selection. */
function useMediaContext() {
  const item = useContext(ListItemContext);
  const list = useContext(ListContext);
  const forced = useForcedState();
  return {
    expressive: (item?.variant ?? list.variant) !== 'baseline',
    // A thumbnail drawn on its own (the kit's building blocks) takes its selection from ForceState.
    selected: forced.selected ?? item?.selected ?? false,
  };
}

/**
 * 56px image thumbnail. Follows the enclosing item: expressive items give it 4px corners and an
 * outline, and a selected expressive item overlays the check badge.
 */
export function ListItemImage({ src, alt = '', imageSx, sx, ...rest }: ListItemImageProps) {
  const { expressive, selected } = useMediaContext();
  return (
    <span {...rest} {...stylex.props(s.media, s.image, expressive && s.expressive, sx)}>
      {src && <img src={src} alt={alt} {...stylex.props(s.img, imageSx)} />}
      {expressive && <span aria-hidden {...stylex.props(s.stroke)} />}
      {selected && expressive && (
        <span aria-hidden {...stylex.props(s.check)}>
          <svg width={20} height={20} viewBox="0 0 20 20" fill="currentColor">
            <path d={CHECK} />
          </svg>
        </span>
      )}
    </span>
  );
}

/** As `ListItemImageProps`. */
export type ListItemVideoProps = ListItemImageProps;

/** 114×64 video thumbnail (expressive items: 4px corners and an outline). */
export function ListItemVideo({ src, alt = '', imageSx, sx, ...rest }: ListItemVideoProps) {
  const { expressive } = useMediaContext();
  return (
    <span data-media="video" {...rest} {...stylex.props(s.media, s.video, expressive && s.expressive, sx)}>
      {src && <img src={src} alt={alt} {...stylex.props(s.img, imageSx)} />}
      {expressive && <span aria-hidden {...stylex.props(s.stroke)} />}
    </span>
  );
}

/** `ref`, native props and `sx` go to the `<span>`. */
export interface ListItemMonogramProps extends SxProps<ComponentPropsWithRef<'span'>> {
  /** The initial(s). */
  children: ReactNode;
}

/** 40px monogram (initial on primary container). */
export function ListItemMonogram({ children, sx, ...rest }: ListItemMonogramProps) {
  return (
    <span {...rest} {...stylex.props(typescale.titleMedium, s.monogram, sx)}>
      {children}
    </span>
  );
}
