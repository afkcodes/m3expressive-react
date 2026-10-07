import { useContext, type ReactNode, type Ref } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import { color } from '../../tokens/color.stylex.ts';
import { elevation } from '../../tokens/elevation.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { forcedStateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import type { SxProps } from '../../primitives/types.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import { ButtonFrame } from '../Button/ButtonFrame.tsx';
import {
  buttonBase,
  buttonStrokeWidths,
  containerMotion,
  elevatedShadow,
  sizes,
  type ButtonShape,
  type ButtonSize,
} from '../Button/buttonStyles.ts';
import { ToolbarVariantContext } from '../Toolbar/context.ts';

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

/*
 * In a toolbar (Toolbars kit, "Building Blocks/{Standard,Vibrant}/Button toggleable"), the filled
 * toggle keeps its round shape when selected and takes the toolbar's colours:
 *              unselected                                selected
 *   standard   surface-container / on-surface-variant    secondary-container / on-secondary-container
 *   vibrant    primary-container / on-primary-container  surface-container / on-surface
 */
const inToolbar = stylex.create({
  standard: { backgroundColor: color.surfaceContainer, color: color.onSurfaceVariant },
  standardSelected: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  vibrant: { backgroundColor: color.primaryContainer, color: color.onPrimaryContainer },
  vibrantSelected: { backgroundColor: color.surfaceContainer, color: color.onSurface },
  // Hovered lifts to elevation 1 (the kit's Hovered variants; none while pressed).
  lift: {
    boxShadow: {
      default: null,
      [stylex.when.ancestor(':hover')]: { default: null, '@media (hover: hover)': elevation.level1 },
      [stylex.when.ancestor(':active')]: 'none',
    },
  },
  lifted: { boxShadow: elevation.level1 },
});

/*
 * Outlined: selecting animates the stroke away instead of dropping it — Compose
 * `animateBorderStrokeAsState` (ToggleButton.kt): width → 0 on FastSpatial, colour → transparent
 * on DefaultEffects (and back when unselected).
 */
const strokeMotion = stylex.create({
  outlined: {
    '::after': {
      transitionProperty: 'border-width, border-color',
      transitionDuration: `${motion.fastSpatialDuration}, ${motion.defaultEffectsDuration}`,
      transitionTimingFunction: `${motion.fastSpatialEasing}, ${motion.defaultEffectsEasing}`,
    },
  },
  selected: { '::after': { borderWidth: 0, borderColor: 'transparent' } },
});

const selectedColors = stylex.create({
  filled: { backgroundColor: color.primary, color: color.onPrimary },
  elevated: { backgroundColor: color.primary, color: color.onPrimary },
  outlined: { backgroundColor: color.inverseSurface, color: color.inverseOnSurface },
  tonal: { backgroundColor: color.secondary, color: color.onSecondary },
});

/**
 * Selection is Base UI Toggle's `pressed` / `defaultPressed` / `onPressedChange(pressed, details)`.
 */
export interface ToggleButtonProps extends SxProps<Omit<BaseToggle.Props, 'render' | 'children'>> {
  ref?: Ref<HTMLButtonElement>;
  variant?: ToggleButtonVariant;
  size?: ButtonSize;
  /** Shape when unselected; selecting swaps to the other shape. */
  shape?: ButtonShape;
  icon?: ReactNode;
  /** Icon when selected (the kit uses the filled version). Defaults to `icon`. */
  selectedIcon?: ReactNode;
  children?: ReactNode;
}

export function ToggleButton({
  variant = 'filled',
  size = 'small',
  shape = 'round',
  icon,
  selectedIcon,
  pressed,
  defaultPressed = false,
  onPressedChange,
  disabled = false,
  children,
  sx,
  ...rest
}: ToggleButtonProps) {
  const [selected, setSelected] = useControllableState(pressed, defaultPressed, onPressedChange);
  const forced = useForcedState();
  const toolbar = useContext(ToolbarVariantContext);
  const tool = toolbar != null && variant === 'filled' ? toolbar : null;
  const effectiveShape: ButtonShape = selected && !tool ? (shape === 'round' ? 'square' : 'round') : shape;
  const elevated = variant === 'elevated' && !disabled;

  return (
    <BaseToggle
      pressed={selected}
      onPressedChange={setSelected}
      disabled={disabled}
      data-ripple-host=""
      {...rest}
      {...stylex.props(
        buttonBase.root,
        sizes[size],
        stateLayerHost.host,
        disabled && stateLayerHost.disabled,
        forcedStateLayer(forced.state, 'hover'),
        stylex.defaultMarker(),
        sx,
      )}
    >
      <ButtonFrame
        size={size}
        shape={effectiveShape}
        pressed={forced.state === 'pressed'}
        disabled={disabled}
        ringForced={!!forced.focusRing}
        icon={selected ? (selectedIcon ?? icon) : icon}
        container={[
          // Selection / press morph on FastSpatial (Compose ToggleButton); a shadow that changes with
          // the interaction (toolbar lift, XL elevated) tweens like Compose animateElevation.
          !disabled && (tool || (variant === 'elevated' && size === 'xlarge'))
            ? containerMotion.spatialElevated
            : containerMotion.spatial,
          tool
            ? inToolbar[selected ? (`${tool}Selected` as const) : tool]
            : selected
              ? selectedColors[variant]
              : unselected[variant],
          tool && !disabled && inToolbar.lift,
          tool && !disabled && forced.state === 'hovered' && inToolbar.lifted,
          elevated && elevatedShadow[size],
          elevated && size === 'xlarge' && !!forced.state && elevatedShadow.xlargeInteracting,
          variant === 'outlined' && buttonBase.stroke,
          variant === 'outlined' && buttonStrokeWidths[size],
          variant === 'outlined' && strokeMotion.outlined,
          variant === 'outlined' && selected && strokeMotion.selected,
        ]}
      >
        {children}
      </ButtonFrame>
    </BaseToggle>
  );
}
