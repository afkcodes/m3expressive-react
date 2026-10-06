import { forwardRef, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Button as BaseButton } from '@base-ui/react/button';
import { color } from '../../tokens/color.stylex';
import { elevation } from '../../tokens/elevation.stylex';
import { motion } from '../../tokens/motion.stylex';
import { state } from '../../tokens/state.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { textBox } from '../../primitives/textBox.ts';
import { useForcedState } from '../../testing/ForceState.tsx';

export type FabColor = 'primary' | 'secondary' | 'tertiary' | 'primary-container' | 'secondary-container' | 'tertiary-container';
export type FabSize = 'default' | 'medium' | 'large';
export type ExtendedFabSize = 'small' | 'medium' | 'large';

/*
 * Figma kit, Buttons page, sets "FAB" and "Extended FAB" (3 sizes × 6 colours × 4 states).
 *            FAB    radius  icon   extended: height  padding (block/inline)  gap  label
 *   default  56     16      24     small     56      16 / 16                 8    title-medium
 *   medium   80     20      28     medium    80      26 / 26                 12   title-large
 *   large    96     28      36     large     96      30 / 28                 16   headline-small
 * Elevation 3 at rest and pressed; 4 while hovered. Focused: level 3 without spread (the kit's
 * Focused variants don't clip, so their focus indicator can overflow, and Figma drops shadow
 * spread on non-clipping frames). The pressed ripple is drawn above the icon (kit layer order).
 * No disabled state in the kit.
 */
const FAB: Record<FabSize, { box: number; r: number; icon: number }> = {
  default: { box: 56, r: 16, icon: 24 },
  medium: { box: 80, r: 20, icon: 28 },
  large: { box: 96, r: 28, icon: 36 },
};
const EXT: Record<ExtendedFabSize, { h: number; r: number; icon: number; padBlock: number; padInline: number; gap: number }> = {
  small: { h: 56, r: 16, icon: 24, padBlock: 16, padInline: 16, gap: 8 },
  medium: { h: 80, r: 20, icon: 28, padBlock: 26, padInline: 26, gap: 12 },
  large: { h: 96, r: 28, icon: 36, padBlock: 30, padInline: 28, gap: 16 },
};
const LABEL = { small: typescale.titleMedium, medium: typescale.titleLarge, large: typescale.headlineSmall } as const;

const s = stylex.create({
  root: {
    appearance: 'none',
    borderWidth: 0,
    margin: 0,
    padding: 0,
    backgroundImage: 'none',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    // UA buttons centre text; the label box is rounded up to whole px (textBox.hug), so centring
    // would shift the glyphs by the rounding remainder. Figma left-aligns inside the hug box.
    textAlign: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    verticalAlign: 'middle',
    flexShrink: 0,
    cursor: 'pointer',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    outlineOffset: state.focusIndicatorOuterOffset,
    boxShadow: {
      default: elevation.level3,
      ':hover': { default: null, '@media (hover: hover)': elevation.level4 },
      ':focus-visible': { default: elevation.level3NoSpread, '@media (hover: hover)': elevation.level3NoSpread },
      ':active': { default: elevation.level3, '@media (hover: hover)': elevation.level3 },
    },
    transitionProperty: 'box-shadow',
    transitionDuration: motion.fastEffectsDuration,
    transitionTimingFunction: motion.fastEffectsEasing,
  },
  hovered: { boxShadow: elevation.level4 },
  focused: { boxShadow: elevation.level3NoSpread },
  ringForced: { outlineStyle: 'solid' },
  icon: { position: 'relative', display: 'inline-flex', flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  label: { position: 'relative', color: 'inherit' },
});

const dyn = stylex.create({
  box: (w: number | null, h: number, r: number) => ({ width: w, height: h, borderRadius: r }),
  pad: (block: number, inline: number, gap: number) => ({ paddingBlock: block, paddingInline: inline, columnGap: gap }),
  icon: (px: number) => ({ width: px, height: px }),
});

const colors = stylex.create({
  primary: { backgroundColor: color.primary, color: color.onPrimary },
  secondary: { backgroundColor: color.secondary, color: color.onSecondary },
  tertiary: { backgroundColor: color.tertiary, color: color.onTertiary },
  'primary-container': { backgroundColor: color.primaryContainer, color: color.onPrimaryContainer },
  'secondary-container': { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  'tertiary-container': { backgroundColor: color.tertiaryContainer, color: color.onTertiaryContainer },
});

type BaseProps = Omit<BaseButton.Props, 'className' | 'style' | 'render' | 'children'>;

function useFabRoot(fabColor: FabColor, sx?: StyleXStyles) {
  const forced = useForcedState();
  return [
    s.root,
    colors[fabColor],
    stateLayerHost.host,
    forced.state === 'hovered' && stateLayerHost.forceHover,
    forced.state === 'hovered' && s.hovered,
    forced.state === 'focused' && stateLayerHost.forceFocus,
    forced.state === 'focused' && s.focused,
    forced.state === 'pressed' && stateLayerHost.forceHover,
    forced.focusRing && s.ringForced,
    sx,
  ];
}

export interface FabProps extends Omit<BaseProps, 'aria-label'> {
  /** Accessible name — required, the FAB has no visible text. */
  'aria-label': string;
  size?: FabSize;
  color?: FabColor;
  /** The icon (use currentColor); sized 24/28/36px. */
  children: ReactNode;
  sx?: StyleXStyles;
}

export const Fab = forwardRef<HTMLButtonElement, FabProps>(function Fab(
  { size = 'default', color: fabColor = 'primary-container', children, sx, ...rest },
  ref,
) {
  const { box, r, icon } = FAB[size];
  return (
    <BaseButton ref={ref} data-ripple-host="" {...rest} {...stylex.props(...useFabRoot(fabColor, sx), dyn.box(box, box, r))}>
      <StateLayer />
      <span {...stylex.props(s.icon, dyn.icon(icon))}>{children}</span>
      <Ripple above />
    </BaseButton>
  );
});

export interface ExtendedFabProps extends BaseProps {
  size?: ExtendedFabSize;
  color?: FabColor;
  /** Leading icon (use currentColor); sized 24/28/36px. */
  icon?: ReactNode;
  /** The label. */
  children: ReactNode;
  sx?: StyleXStyles;
}

export const ExtendedFab = forwardRef<HTMLButtonElement, ExtendedFabProps>(function ExtendedFab(
  { size = 'small', color: fabColor = 'primary-container', icon, children, sx, ...rest },
  ref,
) {
  const e = EXT[size];
  return (
    <BaseButton
      ref={ref}
      data-ripple-host=""
      {...rest}
      {...stylex.props(...useFabRoot(fabColor, sx), dyn.box(null, e.h, e.r), dyn.pad(e.padBlock, e.padInline, e.gap))}
    >
      <StateLayer />
      {icon != null && <span {...stylex.props(s.icon, dyn.icon(e.icon))}>{icon}</span>}
      <span {...stylex.props(LABEL[size], textBox.hug, s.label)}>{children}</span>
      <Ripple above />
    </BaseButton>
  );
});
