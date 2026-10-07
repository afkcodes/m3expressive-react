import { useContext, type ReactNode, type Ref } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { color } from '../../tokens/color.stylex.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { forcedStateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import type { SxProps } from '../../primitives/types.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import { ButtonGroupContext } from '../ButtonGroup/context.ts';
import { needsTouchTarget, type ButtonShape, type ButtonSize } from '../Button/buttonStyles.ts';
import { IconButtonFrame } from '../IconButton/IconButtonFrame.tsx';
import {
  iconButtonBase,
  iconButtonDisabled,
  iconStrokeWidth,
  type IconButtonWidth,
} from '../IconButton/iconButtonStyles.ts';
import type { IconButtonVariant } from '../IconButton/IconButton.tsx';
import { ToolbarVariantContext } from '../Toolbar/context.ts';

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

/*
 * In a toolbar (Toolbars kit, "Building Blocks/{Standard,Vibrant}/Icon button toggleable"), the
 * standard toggle keeps its round shape when selected and takes the toolbar's colours:
 *              unselected                       selected
 *   standard   — / on-surface-variant           secondary-container / on-secondary-container
 *   vibrant    — / on-primary-container         surface-container / on-surface
 * Disabled: on-surface 10% container in both states, content 38%.
 */
const inToolbar = stylex.create({
  standard: { backgroundColor: 'transparent', color: color.onSurfaceVariant },
  standardSelected: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  vibrant: { backgroundColor: 'transparent', color: color.onPrimaryContainer },
  vibrantSelected: { backgroundColor: color.surfaceContainer, color: color.onSurface },
});

const selectedColors = stylex.create({
  filled: { backgroundColor: color.primary, color: color.onPrimary },
  tonal: { backgroundColor: color.secondary, color: color.onSecondary },
  outlined: { backgroundColor: color.inverseSurface, color: color.inverseOnSurface },
  standard: { backgroundColor: 'transparent', color: color.primary },
});

/**
 * Selection is Base UI Toggle's `pressed` / `defaultPressed` / `onPressedChange(pressed, details)`.
 */
export interface ToggleIconButtonProps extends SxProps<Omit<BaseToggle.Props, 'render' | 'children' | 'aria-label'>> {
  ref?: Ref<HTMLButtonElement>;
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
}

export function ToggleIconButton({
  variant = 'standard',
  size = 'small',
  width = 'default',
  shape = 'round',
  pressed,
  defaultPressed = false,
  onPressedChange,
  disabled = false,
  children,
  selectedIcon,
  sx,
  ...rest
}: ToggleIconButtonProps) {
  const [selected, setSelected] = useControllableState(pressed, defaultPressed, onPressedChange);
  const forced = useForcedState();
  const { inGroup } = useContext(ButtonGroupContext);
  const toolbar = useContext(ToolbarVariantContext);
  const tool = toolbar != null && variant === 'standard' ? toolbar : null;
  const effectiveShape: ButtonShape = selected && !tool ? (shape === 'round' ? 'square' : 'round') : shape;
  const stroked = variant === 'outlined' && !selected;
  const clear = (variant === 'standard' && !tool) || stroked;

  return (
    <BaseToggle
      pressed={selected}
      onPressedChange={setSelected}
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
        shape={effectiveShape}
        pressed={forced.state === 'pressed'}
        disabled={disabled}
        ringForced={!!forced.focusRing}
        container={[
          tool
            ? inToolbar[selected ? (`${tool}Selected` as const) : tool]
            : selected
              ? selectedColors[variant]
              : unselected[variant],
          stroked && iconButtonBase.stroke,
          stroked && iconStrokeWidth(size),
          disabled && (clear ? iconButtonDisabled.clearContainer : iconButtonDisabled.filledContainer),
        ]}
      >
        {selected ? (selectedIcon ?? children) : children}
      </IconButtonFrame>
    </BaseToggle>
  );
}
