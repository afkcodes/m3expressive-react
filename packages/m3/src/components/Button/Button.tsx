import { forwardRef, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Button as BaseButton } from '@base-ui/react/button';
import { color } from '../../tokens/color.stylex';
import { stateLayerHost } from '../../primitives/StateLayer.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { ButtonFrame } from './ButtonFrame.tsx';
import { base, containerMotion, elevatedShadow, sizes, strokeWidths, type ButtonShape, type ButtonSize } from './buttonStyles.ts';

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'elevated' | 'text';
export type { ButtonShape, ButtonSize };

const variants = stylex.create({
  filled: { backgroundColor: color.primary, color: color.onPrimary },
  tonal: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  outlined: { backgroundColor: 'transparent', color: color.onSurfaceVariant },
  elevated: { backgroundColor: color.surfaceContainerLow, color: color.primary },
  text: { backgroundColor: 'transparent', color: color.primary },
});

export interface ButtonProps
  extends Omit<BaseButton.Props, 'className' | 'style' | 'render' | 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  /** Leading icon, sized by the button (20/20/24/32/40px). Use currentColor. */
  icon?: ReactNode;
  children?: ReactNode;
  sx?: StyleXStyles;
}

export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(
  { variant = 'filled', size = 'small', shape = 'round', icon, children, disabled: isDisabled = false, sx, ...rest },
  ref,
) {
  const forced = useForcedState();
  const pressed = forced.state === 'pressed';
  return (
    <BaseButton
      ref={ref}
      disabled={isDisabled}
      data-ripple-host=""
      {...rest}
      {...stylex.props(
        base.root,
        sizes[size],
        stateLayerHost.host,
        isDisabled && stateLayerHost.disabled,
        forced.state === 'hovered' && stateLayerHost.forceHover,
        forced.state === 'focused' && stateLayerHost.forceFocus,
        // Kit's Pressed variants keep the hover layer under the ripple.
        pressed && stateLayerHost.forceHover,
        stylex.defaultMarker(),
        sx,
      )}
    >
      <ButtonFrame
        size={size}
        shape={shape}
        pressed={pressed}
        isDisabled={isDisabled}
        focusRing={!!forced.focusRing}
        icon={icon}
        container={[
          // Shape morph on DefaultEffects (Compose: no bounce); XL elevated also tweens its shadow.
          variant === 'elevated' && !isDisabled && size === 'xlarge' ? containerMotion.effectsElevated : containerMotion.effects,
          variants[variant],
          variant === 'elevated' && !isDisabled && elevatedShadow[size],
          variant === 'elevated' && !isDisabled && size === 'xlarge' && !!forced.state && elevatedShadow.xlargeInteracting,
          variant === 'outlined' && base.stroke,
          variant === 'outlined' && strokeWidths[size],
        ]}
      >
        {children}
      </ButtonFrame>
    </BaseButton>
  );
});

