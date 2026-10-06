import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex';
import { typescale } from '../../tokens/typescale.ts';

/*
 * Card layout parts, spaced like the kit's Stacked / Horizontal "Media & text" cards.
 *   Header   avatar ─16─ [headline (title-medium) / 4 / subhead (body-medium)] … action
 *            padding 12 4 12 16 with an action (icon button's 48px target), 16 without.
 *   Media    surface-container-high behind the image (188px tall in the stacked card).
 *   Content  padding 16, 32 between blocks:
 *              headline: title (body-large, on-surface) + subtitle (body-medium, on-surface-variant)
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
  media: { position: 'relative', isolation: 'isolate', flexShrink: 0, backgroundColor: color.surfaceContainerHigh, overflow: 'hidden' },
  mediaImg: { display: 'block', width: '100%', height: '100%' },
  content: { display: 'flex', flexDirection: 'column', rowGap: 32, padding: 16 },
  headline: { display: 'flex', flexDirection: 'column' },
  actions: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', columnGap: 8, height: 40 },
});

// The kit draws placeholder art with a luminosity blend over the surface tint.
const blends = stylex.create({
  normal: {},
  luminosity: { mixBlendMode: 'luminosity' },
});

const fit = stylex.create({
  cover: { objectFit: 'cover' },
  contain: { objectFit: 'contain' },
});

const dims = stylex.create({ box: (w: number | string, h: number | string) => ({ width: w, height: h }) });

type DivProps = Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> & { sx?: StyleXStyles };

export interface CardHeaderProps extends Omit<DivProps, 'children'> {
  avatar?: ReactNode;
  headline: ReactNode;
  subhead?: ReactNode;
  /** Trailing action, typically an IconButton. */
  action?: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { avatar, headline, subhead, action, sx, ...rest },
  ref,
) {
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
});

export interface CardMediaProps extends Omit<DivProps, 'children'> {
  src?: string;
  alt?: string;
  /** Default 'cover'; the kit's placeholder artwork uses 'contain'. */
  fit?: 'cover' | 'contain';
  /** 'luminosity' tints the image with the media surface colour (the kit's placeholder treatment). */
  blend?: 'normal' | 'luminosity';
  width?: number | string;
  height?: number | string;
  children?: ReactNode;
}

export const CardMedia = forwardRef<HTMLDivElement, CardMediaProps>(function CardMedia(
  { src, alt = '', fit: fitMode = 'cover', blend = 'normal', width = '100%', height = 188, children, sx, ...rest },
  ref,
) {
  return (
    <div ref={ref} {...rest} {...stylex.props(s.media, dims.box(width, height), sx)}>
      {src ? <img src={src} alt={alt} {...stylex.props(s.mediaImg, fit[fitMode], blends[blend])} /> : children}
    </div>
  );
});

export const CardContent = forwardRef<HTMLDivElement, DivProps>(function CardContent({ sx, ...rest }, ref) {
  return <div ref={ref} {...rest} {...stylex.props(s.content, sx)} />;
});

export interface CardHeadlineProps extends Omit<DivProps, 'children' | 'title'> {
  title: ReactNode;
  subtitle?: ReactNode;
}

export const CardHeadline = forwardRef<HTMLDivElement, CardHeadlineProps>(function CardHeadline(
  { title, subtitle, sx, ...rest },
  ref,
) {
  return (
    <div ref={ref} {...rest} {...stylex.props(s.headline, sx)}>
      <p {...stylex.props(typescale.bodyLarge, s.onSurface)}>{title}</p>
      {subtitle != null && <p {...stylex.props(typescale.bodyMedium, s.onSurfaceVariant)}>{subtitle}</p>}
    </div>
  );
});

export const CardText = forwardRef<HTMLParagraphElement, Omit<HTMLAttributes<HTMLParagraphElement>, 'className' | 'style'> & { sx?: StyleXStyles }>(
  function CardText({ sx, ...rest }, ref) {
    return <p ref={ref} {...rest} {...stylex.props(typescale.bodyMedium, s.onSurfaceVariant, sx)} />;
  },
);

export const CardActions = forwardRef<HTMLDivElement, DivProps>(function CardActions({ sx, ...rest }, ref) {
  return <div ref={ref} {...rest} {...stylex.props(s.actions, sx)} />;
});
