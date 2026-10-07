import type { ComponentPropsWithRef, ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import type { SxProps } from '../../primitives/types.ts';

/*
 * Card layout parts, spaced like the kit's Stacked / Horizontal "Media & text" cards.
 *   Header   avatar ─16─ [headline (title-medium) / 4 / subhead (body-medium)] … action
 *            padding 12 4 12 16 with an action (icon button's 48px target), 16 without.
 *   Media    surface-container-high behind the image (188px tall in the stacked card).
 *   Content  padding 16, 32 between blocks:
 *              headline: headline (body-large, on-surface) + subhead (body-medium, on-surface-variant)
 *              text:     body-medium, on-surface-variant
 *              actions:  end-aligned, 8 apart, 40px row (buttons' 48px targets overhang it)
 */
const s = stylex.create({
  header: { display: 'flex', alignItems: 'center', boxSizing: 'border-box', flexShrink: 0 },
  headerWithAction: { paddingBlock: 12, paddingInlineStart: 16, paddingInlineEnd: 4 },
  headerPlain: { padding: 16 },
  headerContent: { display: 'flex', alignItems: 'center', columnGap: 16, flexGrow: 1, minWidth: 0 },
  headerText: { display: 'flex', flexDirection: 'column', rowGap: 4, flexGrow: 1, minWidth: 0 },
  onSurface: { color: color.onSurface, margin: 0 },
  onSurfaceVariant: { color: color.onSurfaceVariant, margin: 0 },
  media: {
    position: 'relative',
    isolation: 'isolate',
    flexShrink: 0,
    backgroundColor: color.surfaceContainerHigh,
    overflow: 'hidden',
  },
  mediaImg: { display: 'block', width: '100%', height: '100%' },
  content: { display: 'flex', flexDirection: 'column', rowGap: 32, padding: 16 },
  headline: { display: 'flex', flexDirection: 'column' },
  actions: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', columnGap: 8, height: 40 },
});

const fit = stylex.create({
  cover: { objectFit: 'cover' },
  contain: { objectFit: 'contain' },
});

const dims = stylex.create({ box: (w: number | string, h: number | string) => ({ width: w, height: h }) });

export interface CardHeaderProps extends SxProps<Omit<ComponentPropsWithRef<'div'>, 'children'>> {
  avatar?: ReactNode;
  headline: ReactNode;
  subhead?: ReactNode;
  /** Trailing action, typically an IconButton. */
  action?: ReactNode;
}

export function CardHeader({ ref, avatar, headline, subhead, action, sx, ...rest }: CardHeaderProps) {
  return (
    <div ref={ref} {...rest} {...stylex.props(s.header, action ? s.headerWithAction : s.headerPlain, sx)}>
      <div {...stylex.props(s.headerContent)}>
        {avatar}
        <div {...stylex.props(s.headerText)}>
          <p {...stylex.props(typescale.titleMedium, s.onSurface)}>{headline}</p>
          {subhead != null && <p {...stylex.props(typescale.bodyMedium, s.onSurface)}>{subhead}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export interface CardMediaProps extends SxProps<ComponentPropsWithRef<'div'>> {
  src?: string;
  alt?: string;
  /** Default 'cover'; the kit's placeholder artwork uses 'contain'. */
  fit?: 'cover' | 'contain';
  /** Styles for the `src` image (e.g. the kit placeholder's luminosity blend over the media surface). */
  imageSx?: StyleXStyles;
  width?: number | string;
  height?: number | string;
  /** Media content when there is no `src` (a video, a canvas…). */
  children?: ReactNode;
}

export function CardMedia({
  ref,
  src,
  alt = '',
  fit: fitMode = 'cover',
  imageSx,
  width = '100%',
  height = 188,
  children,
  sx,
  ...rest
}: CardMediaProps) {
  return (
    <div ref={ref} {...rest} {...stylex.props(s.media, dims.box(width, height), sx)}>
      {src ? <img src={src} alt={alt} {...stylex.props(s.mediaImg, fit[fitMode], imageSx)} /> : children}
    </div>
  );
}

export type CardContentProps = SxProps<ComponentPropsWithRef<'div'>>;

export function CardContent({ sx, ...rest }: CardContentProps) {
  return <div {...rest} {...stylex.props(s.content, sx)} />;
}

export interface CardHeadlineProps extends SxProps<Omit<ComponentPropsWithRef<'div'>, 'children'>> {
  headline: ReactNode;
  subhead?: ReactNode;
}

export function CardHeadline({ ref, headline, subhead, sx, ...rest }: CardHeadlineProps) {
  return (
    <div ref={ref} {...rest} {...stylex.props(s.headline, sx)}>
      <p {...stylex.props(typescale.bodyLarge, s.onSurface)}>{headline}</p>
      {subhead != null && <p {...stylex.props(typescale.bodyMedium, s.onSurfaceVariant)}>{subhead}</p>}
    </div>
  );
}

export type CardTextProps = SxProps<ComponentPropsWithRef<'p'>>;

export function CardText({ sx, ...rest }: CardTextProps) {
  return <p {...rest} {...stylex.props(typescale.bodyMedium, s.onSurfaceVariant, sx)} />;
}

export type CardActionsProps = SxProps<ComponentPropsWithRef<'div'>>;

export function CardActions({ sx, ...rest }: CardActionsProps) {
  return <div {...rest} {...stylex.props(s.actions, sx)} />;
}
