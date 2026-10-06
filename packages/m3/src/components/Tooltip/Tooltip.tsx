import type { ReactElement, ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { color } from '../../tokens/color.stylex';
import { elevation } from '../../tokens/elevation.stylex';
import { motion } from '../../tokens/motion.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import { usePortalContainer } from '../../theme/portal.tsx';

/*
 * Figma kit, "Tooltips" page: "Plain Tooltip" and "Rich Tooltip".
 *   Plain: inverse-surface, 4px corners, padding 4/8, body-small inverse-on-surface; hugs one line
 *   (the kit's multi-line variant is hidden; long text wraps at 200px per M3).
 *   Rich: 312px, surface-container, 12px corners, level 2; content padding 12/16/4/16, title-small
 *   subhead + body-medium text (on-surface-variant), 4px apart; a 40px actions row (padding 0 4,
 *   gap 8) 8px below, 8px bottom padding.
 *   Both fade and scale in on the fast effects / spatial springs.
 */
const s = stylex.create({
  plain: {
    boxSizing: 'border-box',
    display: 'inline-block',
    maxWidth: 200,
    paddingBlock: 4,
    paddingInline: 8,
    borderRadius: 4,
    backgroundColor: color.inverseSurface,
    color: color.inverseOnSurface,
  },
  rich: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    rowGap: 8,
    width: 312,
    maxWidth: '100%',
    paddingBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: color.surfaceContainer,
    boxShadow: elevation.level2,
  },
  plainText: { display: 'block' },
  richContent: { display: 'flex', flexDirection: 'column', rowGap: 4, paddingTop: 12, paddingInline: 16, paddingBottom: 4 },
  text: { margin: 0, color: color.onSurfaceVariant },
  actions: { display: 'flex', alignItems: 'center', columnGap: 8, height: 40, paddingInline: 4 },
  popup: {
    transformOrigin: 'var(--transform-origin)',
    opacity: { default: 1, ':is([data-starting-style], [data-ending-style])': 0 },
    scale: { default: '1', ':is([data-starting-style], [data-ending-style])': '0.8' },
    transitionProperty: 'opacity, scale',
    transitionDuration: `${motion.fastEffectsDuration}, ${motion.fastSpatialDuration}`,
    transitionTimingFunction: `${motion.fastEffectsEasing}, ${motion.fastSpatialEasing}`,
  },
});

export interface PlainTooltipSurfaceProps {
  children: ReactNode;
  sx?: StyleXStyles;
}

/** The plain tooltip container on its own (static rendering, custom positioning). */
export function PlainTooltipSurface({ children, sx }: PlainTooltipSurfaceProps) {
  return (
    <span {...stylex.props(typescale.bodySmall, s.plain, sx)}>
      <span {...stylex.props(textBox.hug, s.plainText)}>{children}</span>
    </span>
  );
}

export interface RichTooltipSurfaceProps {
  subhead?: ReactNode;
  children: ReactNode;
  /** Text buttons (size small). */
  actions?: ReactNode;
  sx?: StyleXStyles;
}

/** The rich tooltip container on its own (static rendering, custom positioning). */
export function RichTooltipSurface({ subhead, children, actions, sx }: RichTooltipSurfaceProps) {
  return (
    <div {...stylex.props(s.rich, sx)}>
      <div {...stylex.props(s.richContent)}>
        {subhead != null && <p {...stylex.props(typescale.titleSmall, s.text)}>{subhead}</p>}
        <p {...stylex.props(typescale.bodyMedium, s.text)}>{children}</p>
      </div>
      {actions != null && <div {...stylex.props(s.actions)}>{actions}</div>}
    </div>
  );
}

export interface TooltipProps {
  /** Tooltip text. */
  content: ReactNode;
  /** The trigger (must forward its ref, e.g. an IconButton). */
  children: ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

/** Plain tooltip: shows on hover / focus after a short delay. */
export function Tooltip({ content, children, side = 'top', delay = 500 }: TooltipProps) {
  const portalContainer = usePortalContainer();
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger delay={delay} render={children} />
      <BaseTooltip.Portal container={portalContainer}>
        <BaseTooltip.Positioner side={side} sideOffset={4}>
          <BaseTooltip.Popup {...stylex.props(s.popup)}>
            <PlainTooltipSurface>{content}</PlainTooltipSurface>
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

export interface RichTooltipProps extends Omit<RichTooltipSurfaceProps, 'sx'> {
  /** The trigger (must forward its ref). */
  trigger: ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

/** Rich tooltip: persistent, can hold actions; opens on hover or click. */
export function RichTooltip({ trigger, side = 'bottom', ...surface }: RichTooltipProps) {
  const portalContainer = usePortalContainer();
  return (
    <BasePopover.Root>
      <BasePopover.Trigger openOnHover delay={500} render={trigger} />
      <BasePopover.Portal container={portalContainer}>
        <BasePopover.Positioner side={side} sideOffset={4}>
          <BasePopover.Popup {...stylex.props(s.popup)}>
            <RichTooltipSurface {...surface} />
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
