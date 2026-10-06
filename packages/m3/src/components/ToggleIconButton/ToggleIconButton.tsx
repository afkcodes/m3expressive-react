import { forwardRef, useContext, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { color } from '../../tokens/color.stylex';
import { stateLayerHost } from '../../primitives/StateLayer.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { ButtonGroupContext } from '../ButtonGroup/context.ts';
import type { ButtonShape, ButtonSize } from '../Button/buttonStyles.ts';
import { IconButtonFrame, base, disabled, strokeWidths, type IconButtonWidth } from '../IconButton/IconButtonFrame.tsx';
import type { IconButtonVariant } from '../IconButton/IconButton.tsx';

/*
 * Figma kit, Buttons page, sets "Icon button togglable" / "- tonal" / "- outline" / "- standard".
 * Geometry = IconButton. Selection swaps the shape (round ⇄ square, on the fast spatial spring)
 * and the colours:
 *              unselected                               selected
 *   filled     surface-container / on-surface-variant   primary / on-primary
 *   tonal      secondary-container / on-sec-container    secondary / on-secondary
 *   outlined   outline-variant stroke / on-surface-var   inverse-surface / inverse-on-surface
 *   standard   — / on-surface-variant                    — / primary
 * Disabled: a container that is filled in the current state becomes on-surface 10%; outlined
 * unselected keeps its stroke; content at 38%.
 */
const unselected = stylex.create({
  filled: { backgroundColor: color.surfaceContainer, color: color.onSurfaceVariant },
  tonal: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  outlined: { backgroundColor: 'transparent', color: color.onSurfaceVariant },
  standard: { backgroundColor: 'transparent', color: color.onSurfaceVariant },
});

const selected = stylex.create({
  filled: { backgroundColor: color.primary, color: color.onPrimary },
  tonal: { backgroundColor: color.secondary, color: color.onSecondary },
  outlined: { backgroundColor: color.inverseSurface, color: color.inverseOnSurface },
  standard: { backgroundColor: 'transparent', color: color.primary },
});

export interface ToggleIconButtonProps
  extends Omit<BaseToggle.Props, 'className' | 'style' | 'render' | 'children' | 'aria-label'> {
  /** Accessible name — required, the button has no visible text. */
  'aria-label': string;
  variant?: IconButtonVariant;
  size?: ButtonSize;
  width?: IconButtonWidth;
  /** Shape when unselected; selecting swaps to the other shape. */
  shape?: ButtonShape;
  /** The icon (use currentColor); sized by the button: 20/24/24/32/40px. */
  children: ReactNode;
  /** Icon when selected (e.g. the filled version). Defaults to `children`. */
  selectedIcon?: ReactNode;
  sx?: StyleXStyles;
}

export const ToggleIconButton = forwardRef<HTMLButtonElement, ToggleIconButtonProps>(function ToggleIconButton(
  {
    variant = 'standard',
    size = 'small',
    width = 'default',
    shape = 'round',
    pressed: pressedProp,
    defaultPressed = false,
    onPressedChange,
    disabled: isDisabled = false,
    children,
    selectedIcon,
    sx,
    ...rest
  },
  ref,
) {
  const [inner, setInner] = useState(defaultPressed);
  const isSelected = pressedProp ?? inner;
  const forced = useForcedState();
  const { inGroup } = useContext(ButtonGroupContext);
  const pressed = forced.state === 'pressed';
  const effectiveShape: ButtonShape = isSelected ? (shape === 'round' ? 'square' : 'round') : shape;
  const stroked = variant === 'outlined' && !isSelected;
  const clear = variant === 'standard' || stroked;

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
        (size === 'xsmall' || size === 'small') && (inGroup ? base.touch48Overlay : base.touch48),
        stateLayerHost.host,
        isDisabled && stateLayerHost.disabled,
        forced.state === 'hovered' && stateLayerHost.forceHover,
        forced.state === 'focused' && stateLayerHost.forceFocus,
        pressed && stateLayerHost.forceHover,
        stylex.defaultMarker(),
        sx,
      )}
    >
      <IconButtonFrame
        size={size}
        width={width}
        shape={effectiveShape}
        pressed={pressed}
        isDisabled={isDisabled}
        focusRing={!!forced.focusRing}
        container={[
          isSelected ? selected[variant] : unselected[variant],
          stroked && base.stroke,
          stroked && (size === 'large' || size === 'xlarge' ? strokeWidths.thick : strokeWidths.thin),
          isDisabled && (clear ? disabled.clearContainer : disabled.filledContainer),
        ]}
      >
        {isSelected ? (selectedIcon ?? children) : children}
      </IconButtonFrame>
    </BaseToggle>
  );
});
