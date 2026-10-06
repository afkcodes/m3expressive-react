import { forwardRef, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { color } from '../../tokens/color.stylex';
import { stateLayerHost } from '../../primitives/StateLayer.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { ButtonFrame } from '../Button/ButtonFrame.tsx';
import { base, elevatedShadow, sizes, strokeWidths, type ButtonShape, type ButtonSize } from '../Button/buttonStyles.ts';

export type ToggleButtonVariant = 'filled' | 'tonal' | 'outlined' | 'elevated';

/*
 * Figma kit, Buttons page, sets "Toggle button" / "- elevated" / "- outline" / "- tonal".
 * Geometry = Button. Selection swaps the shape (round ⇄ square, animated on the fast spatial
 * spring) and the colours:
 *              unselected                              selected
 *   filled     surface-container / on-surface-variant  primary / on-primary
 *   elevated   surface-container-low / primary          primary / on-primary (shadow as Button)
 *   outlined   outline-variant stroke / on-surface-var  inverse-surface / inverse-on-surface
 *   tonal      secondary-container / on-sec-container   secondary / on-secondary
 * The kit swaps the icon to its filled version when selected ("Icon (selected)").
 */
const unselected = stylex.create({
  filled: { backgroundColor: color.surfaceContainer, color: color.onSurfaceVariant },
  elevated: { backgroundColor: color.surfaceContainerLow, color: color.primary },
  outlined: { backgroundColor: 'transparent', color: color.onSurfaceVariant },
  tonal: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
});

const selected = stylex.create({
  filled: { backgroundColor: color.primary, color: color.onPrimary },
  elevated: { backgroundColor: color.primary, color: color.onPrimary },
  outlined: { backgroundColor: color.inverseSurface, color: color.inverseOnSurface },
  tonal: { backgroundColor: color.secondary, color: color.onSecondary },
});

export interface ToggleButtonProps
  extends Omit<BaseToggle.Props, 'className' | 'style' | 'render' | 'children'> {
  variant?: ToggleButtonVariant;
  size?: ButtonSize;
  /** Shape when unselected; selecting swaps to the other shape. */
  shape?: ButtonShape;
  icon?: ReactNode;
  /** Icon when selected (the kit uses the filled version). Defaults to `icon`. */
  selectedIcon?: ReactNode;
  children?: ReactNode;
  sx?: StyleXStyles;
}

export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(function ToggleButton(
  {
    variant = 'filled',
    size = 'small',
    shape = 'round',
    icon,
    selectedIcon,
    pressed: pressedProp,
    defaultPressed = false,
    onPressedChange,
    disabled: isDisabled = false,
    children,
    sx,
    ...rest
  },
  ref,
) {
  const [inner, setInner] = useState(defaultPressed);
  const isSelected = pressedProp ?? inner;
  const forced = useForcedState();
  const pressed = forced.state === 'pressed';
  const effectiveShape: ButtonShape = isSelected ? (shape === 'round' ? 'square' : 'round') : shape;

  return (
    <BaseToggle
      ref={ref}
      pressed={isSelected}
      onPressedChange={(next, details) => {
        if (pressedProp === undefined) setInner(next);
        onPressedChange?.(next, details);
      }}
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
        pressed && stateLayerHost.forceHover,
        stylex.defaultMarker(),
        sx,
      )}
    >
      <ButtonFrame
        size={size}
        shape={effectiveShape}
        pressed={pressed}
        isDisabled={isDisabled}
        focusRing={!!forced.focusRing}
        icon={isSelected ? (selectedIcon ?? icon) : icon}
        container={[
          isSelected ? selected[variant] : unselected[variant],
          variant === 'elevated' && !isDisabled && elevatedShadow[size],
          variant === 'elevated' && !isDisabled && size === 'xlarge' && !!forced.state && elevatedShadow.xlargeInteracting,
          variant === 'outlined' && !isSelected && base.stroke,
          variant === 'outlined' && !isSelected && strokeWidths[size],
        ]}
      >
        {children}
      </ButtonFrame>
    </BaseToggle>
  );
});
