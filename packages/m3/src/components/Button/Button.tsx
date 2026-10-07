import type { ReactNode, Ref } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button as BaseButton } from '@base-ui/react/button';
import { color } from '../../tokens/color.stylex.ts';
import { forcedStateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import type { SxProps } from '../../primitives/types.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import { ButtonFrame } from './ButtonFrame.tsx';
import {
  buttonBase,
  buttonStrokeWidths,
  containerMotion,
  elevatedShadow,
  sizes,
  type ButtonShape,
  type ButtonSize,
} from './buttonStyles.ts';

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'elevated' | 'text';
export type { ButtonShape, ButtonSize };

const variants = stylex.create({
  filled: { backgroundColor: color.primary, color: color.onPrimary },
  tonal: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  outlined: { backgroundColor: 'transparent', color: color.onSurfaceVariant },
  elevated: { backgroundColor: color.surfaceContainerLow, color: color.primary },
  text: { backgroundColor: 'transparent', color: color.primary },
});

export interface ButtonProps extends SxProps<Omit<BaseButton.Props, 'render' | 'children'>> {
  ref?: Ref<HTMLButtonElement>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  /** Leading icon, sized by the button (20/20/24/32/40px). Use currentColor. */
  icon?: ReactNode;
  children?: ReactNode;
}

export function Button({
  variant = 'filled',
  size = 'small',
  shape = 'round',
  icon,
  children,
  disabled = false,
  sx,
  ...rest
}: ButtonProps) {
  const forced = useForcedState();
  const elevated = variant === 'elevated' && !disabled;
  return (
    <BaseButton
      disabled={disabled}
      data-ripple-host=""
      {...rest}
      {...stylex.props(
        buttonBase.root,
        sizes[size],
        stateLayerHost.host,
        disabled && stateLayerHost.disabled,
        // Kit's Pressed variants keep the hover layer under the ripple.
        forcedStateLayer(forced.state, 'hover'),
        stylex.defaultMarker(),
        sx,
      )}
    >
      <ButtonFrame
        size={size}
        shape={shape}
        pressed={forced.state === 'pressed'}
        disabled={disabled}
        ringForced={!!forced.focusRing}
        icon={icon}
        container={[
          // Shape morph on DefaultEffects (Compose: no bounce); XL elevated also tweens its shadow.
          elevated && size === 'xlarge' ? containerMotion.effectsElevated : containerMotion.effects,
          variants[variant],
          elevated && elevatedShadow[size],
          elevated && size === 'xlarge' && !!forced.state && elevatedShadow.xlargeInteracting,
          variant === 'outlined' && buttonBase.stroke,
          variant === 'outlined' && buttonStrokeWidths[size],
        ]}
      >
        {children}
      </ButtonFrame>
    </BaseButton>
  );
}
