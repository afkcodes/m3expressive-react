import { forwardRef, useContext, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Button as BaseButton } from '@base-ui/react/button';
import { color } from '../../tokens/color.stylex.ts';
import { forcedStateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { ButtonGroupContext } from '../ButtonGroup/context.ts';
import { StandardIconTintContext } from './context.ts';
import { ToolbarVariantContext } from '../Toolbar/context.ts';
import { needsTouchTarget, type ButtonShape, type ButtonSize } from '../Button/buttonStyles.ts';
import { IconButtonFrame } from './IconButtonFrame.tsx';
import { iconButtonBase, iconButtonDisabled, iconStrokeWidth, type IconButtonWidth } from './iconButtonStyles.ts';

export type IconButtonVariant = 'filled' | 'tonal' | 'outlined' | 'standard';
export type { IconButtonWidth };

const variants = stylex.create({
  filled: { backgroundColor: color.primary, color: color.onPrimary },
  tonal: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  outlined: { backgroundColor: 'transparent', color: color.onSurfaceVariant },
  standard: { backgroundColor: 'transparent', color: color.onSurfaceVariant },
  standardOnSurface: { color: color.onSurface },
  // Toolbar kit, "Building Blocks/Vibrant/Icon button": On Primary Container content.
  standardVibrant: { color: color.onPrimaryContainer },
});

export interface IconButtonProps extends Omit<
  BaseButton.Props,
  'className' | 'style' | 'render' | 'children' | 'aria-label'
> {
  /** Accessible name — required, the button has no visible text. */
  'aria-label': string;
  variant?: IconButtonVariant;
  size?: ButtonSize;
  width?: IconButtonWidth;
  shape?: ButtonShape;
  /** The icon (use currentColor); sized by the button: 20/24/24/32/40px. */
  children: ReactNode;
  sx?: StyleXStyles;
}

export const IconButton = forwardRef<HTMLElement, IconButtonProps>(function IconButton(
  { variant = 'standard', size = 'small', width = 'default', shape = 'round', disabled = false, children, sx, ...rest },
  ref,
) {
  const forced = useForcedState();
  const { inGroup } = useContext(ButtonGroupContext);
  const tint = useContext(StandardIconTintContext);
  const toolbar = useContext(ToolbarVariantContext);
  const clear = variant === 'standard' || variant === 'outlined';

  return (
    <BaseButton
      ref={ref}
      disabled={disabled}
      data-ripple-host=""
      {...rest}
      {...stylex.props(
        iconButtonBase.root,
        needsTouchTarget(size) && (inGroup ? iconButtonBase.touch48Overlay : iconButtonBase.touch48),
        stateLayerHost.host,
        disabled && stateLayerHost.disabled,
        forcedStateLayer(forced.state, 'hover'),
        stylex.defaultMarker(),
        sx,
      )}
    >
      <IconButtonFrame
        size={size}
        width={width}
        shape={shape}
        pressed={forced.state === 'pressed'}
        disabled={disabled}
        ringForced={!!forced.focusRing}
        container={[
          variants[variant],
          variant === 'standard' && tint === 'on-surface' && variants.standardOnSurface,
          variant === 'standard' && toolbar === 'vibrant' && variants.standardVibrant,
          variant === 'outlined' && iconButtonBase.stroke,
          variant === 'outlined' && iconStrokeWidth(size),
          disabled && (clear ? iconButtonDisabled.clearContainer : iconButtonDisabled.filledContainer),
        ]}
      >
        {children}
      </IconButtonFrame>
    </BaseButton>
  );
});
