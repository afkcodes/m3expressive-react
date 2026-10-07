import { useContext, useRef, type ReactNode, type Ref } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Button as BaseButton } from '@base-ui/react/button';
import { color } from '../../tokens/color.stylex.ts';
import { elevation } from '../../tokens/elevation.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { useMergedRefs } from '../../hooks/useMergedRefs.ts';
import { elevationMotion } from '../../primitives/elevationMotion.ts';
import { focusRing } from '../../primitives/focusRing.ts';
import { tween } from '../../primitives/tweens.stylex.ts';
import { forcedStateLayer, StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { textBox } from '../../primitives/textBox.ts';
import type { SxProps } from '../../primitives/types.ts';
import { visuallyHidden } from '../../primitives/visuallyHidden.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import { ToolbarFabContext } from '../Toolbar/context.ts';
import { useExpandMotion } from './useExpandMotion.ts';

export type FabColor =
  'primary' | 'secondary' | 'tertiary' | 'primaryContainer' | 'secondaryContainer' | 'tertiaryContainer';
/** 56 / 80 / 96px (the kit's "default" FAB is `small`; the deprecated 40dp small FAB isn't in the kit). */
export type FabSize = 'small' | 'medium' | 'large';
export type ExtendedFabSize = 'small' | 'medium' | 'large';

/*
 * Figma kit, Buttons page, sets "FAB" and "Extended FAB" (3 sizes × 6 colours × 4 states).
 *            FAB    radius  icon   extended: height  padding (block/inline)  gap  label
 *   small    56     16      24     small     56      16 / 16                 8    title-medium
 *   medium   80     20      28     medium    80      26 / 26                 12   title-large
 *   large    96     28      36     large     96      30 / 28                 16   headline-small
 * Elevation 3 at rest and pressed; 4 while hovered. Focused: level 3 without spread (the kit's
 * Focused variants don't clip, so their focus indicator can overflow, and Figma drops shadow
 * spread on non-clipping frames). The pressed ripple is drawn above the icon (kit layer order).
 * No disabled state in the kit.
 */
const FAB: Record<FabSize, { box: number; radius: number; icon: number }> = {
  small: { box: 56, radius: 16, icon: 24 },
  medium: { box: 80, radius: 20, icon: 28 },
  large: { box: 96, radius: 28, icon: 36 },
};
const EXTENDED: Record<
  ExtendedFabSize,
  { height: number; radius: number; icon: number; padBlock: number; padInline: number; gap: number }
> = {
  small: { height: 56, radius: 16, icon: 24, padBlock: 16, padInline: 16, gap: 8 },
  medium: { height: 80, radius: 20, icon: 28, padBlock: 26, padInline: 26, gap: 12 },
  large: { height: 96, radius: 28, icon: 36, padBlock: 30, padInline: 28, gap: 16 },
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
    // Focus indicator: focusRing.host, listed right after this style.
    boxShadow: {
      default: elevation.level3,
      ':hover': { default: null, '@media (hover: hover)': elevation.level4 },
      ':focus-visible': { default: elevation.level3NoSpread, '@media (hover: hover)': elevation.level3NoSpread },
      ':active': { default: elevation.level3, '@media (hover: hover)': elevation.level3 },
    },
    // Shadow motion: elevationMotion.host (Compose FloatingActionButtonElevation tweens).
  },
  hovered: { boxShadow: elevation.level4 },
  focused: { boxShadow: elevation.level3NoSpread },
  // Flat FAB (Compose bottomAppBarFabElevation: 0 in every state) — e.g. in a navigation rail.
  flat: { boxShadow: 'none' },
  // Next to a floating toolbar: the size follows the toolbar's collapse (FastSpatial); the shadow
  // keeps the elevation tweens of elevationMotion.host (repeated: one transition list).
  inToolbar: {
    transitionProperty: 'box-shadow, width, height',
    transitionDuration: {
      default: `${tween.elevationOutDuration}, ${motion.fastSpatialDuration}, ${motion.fastSpatialDuration}`,
      ':hover': {
        default: null,
        '@media (hover: hover)': `${tween.elevationInDuration}, ${motion.fastSpatialDuration}, ${motion.fastSpatialDuration}`,
      },
      ':focus-visible': {
        default: `${tween.elevationInDuration}, ${motion.fastSpatialDuration}, ${motion.fastSpatialDuration}`,
        '@media (hover: hover)': `${tween.elevationInDuration}, ${motion.fastSpatialDuration}, ${motion.fastSpatialDuration}`,
      },
      ':active': {
        default: `${tween.elevationInDuration}, ${motion.fastSpatialDuration}, ${motion.fastSpatialDuration}`,
        '@media (hover: hover)': `${tween.elevationInDuration}, ${motion.fastSpatialDuration}, ${motion.fastSpatialDuration}`,
      },
    },
    transitionTimingFunction: {
      default: `${tween.elevationOutEasing}, ${motion.fastSpatialEasing}, ${motion.fastSpatialEasing}`,
      ':hover': {
        default: null,
        '@media (hover: hover)': `${tween.elevationInEasing}, ${motion.fastSpatialEasing}, ${motion.fastSpatialEasing}`,
      },
      ':focus-visible': {
        default: `${tween.elevationInEasing}, ${motion.fastSpatialEasing}, ${motion.fastSpatialEasing}`,
        '@media (hover: hover)': `${tween.elevationInEasing}, ${motion.fastSpatialEasing}, ${motion.fastSpatialEasing}`,
      },
      ':active': {
        default: `${tween.elevationInEasing}, ${motion.fastSpatialEasing}, ${motion.fastSpatialEasing}`,
        '@media (hover: hover)': `${tween.elevationInEasing}, ${motion.fastSpatialEasing}, ${motion.fastSpatialEasing}`,
      },
    },
  },
  icon: { position: 'relative', display: 'inline-flex', flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  // flexShrink 0: the label keeps its width (clipped) while the extended FAB collapses.
  label: { position: 'relative', color: 'inherit', flexShrink: 0 },
});

const dyn = stylex.create({
  box: (boxWidth: number | null, boxHeight: number, radius: number) => ({
    width: boxWidth,
    height: boxHeight,
    borderRadius: radius,
  }),
  pad: (block: number, inline: number, gap: number) => ({ paddingBlock: block, paddingInline: inline, columnGap: gap }),
  icon: (px: number) => ({ width: px, height: px }),
});

const colors = stylex.create({
  primary: { backgroundColor: color.primary, color: color.onPrimary },
  secondary: { backgroundColor: color.secondary, color: color.onSecondary },
  tertiary: { backgroundColor: color.tertiary, color: color.onTertiary },
  primaryContainer: { backgroundColor: color.primaryContainer, color: color.onPrimaryContainer },
  secondaryContainer: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  tertiaryContainer: { backgroundColor: color.tertiaryContainer, color: color.onTertiaryContainer },
});

type BaseProps = SxProps<Omit<BaseButton.Props, 'render' | 'children' | 'color'>> & { ref?: Ref<HTMLButtonElement> };

function useFabRoot(fabColor: FabColor, elevated: boolean, sx?: StyleXStyles) {
  const forced = useForcedState();
  return [
    s.root,
    focusRing.host,
    elevated && elevationMotion.host,
    colors[fabColor],
    stateLayerHost.host,
    // The kit's Pressed variants keep the hover layer under the ripple.
    forcedStateLayer(forced.state, 'hover'),
    forced.state === 'hovered' && s.hovered,
    forced.state === 'focused' && s.focused,
    forced.focusRing && focusRing.forced,
    !elevated && s.flat,
    sx,
  ];
}

export interface FabProps extends Omit<BaseProps, 'aria-label'> {
  /** Accessible name — required, the FAB has no visible text. */
  'aria-label': string;
  size?: FabSize;
  /** Container colour role (content: the matching on-colour). */
  color?: FabColor;
  /** The icon (use currentColor); sized 24/28/36px. */
  children: ReactNode;
  /** Shadow (level 3; default true). Flat FABs sit in containers such as a navigation rail. */
  elevated?: boolean;
}

export function Fab({
  size = 'small',
  color: fabColor = 'primaryContainer',
  elevated = true,
  children,
  sx,
  ...rest
}: FabProps) {
  const { box: restBox, radius, icon } = FAB[size];
  const toolbar = useContext(ToolbarFabContext);
  // Compose FabSizeRange: the 56px FAB grows to the medium FAB's 80px while its toolbar is collapsed.
  const box = toolbar?.collapsed && size === 'small' ? FAB.medium.box : restBox;
  return (
    <BaseButton
      data-ripple-host=""
      {...rest}
      {...stylex.props(...useFabRoot(fabColor, elevated, sx), toolbar && s.inToolbar, dyn.box(box, box, radius))}
    >
      <StateLayer />
      <span {...stylex.props(s.icon, dyn.icon(icon))}>{children}</span>
      <Ripple above />
    </BaseButton>
  );
}

export interface ExtendedFabProps extends BaseProps {
  size?: ExtendedFabSize;
  /** Container colour role (content: the matching on-colour). */
  color?: FabColor;
  /** Leading icon (use currentColor); sized 24/28/36px. */
  icon?: ReactNode;
  /** The label. */
  children: ReactNode;
  /**
   * Show the label (default true). Collapsing shrinks the FAB to its icon (a square of the FAB's
   * height) and fades the label out; the label stays the accessible name. Needs an icon.
   * Controlled only: layout state the FAB never changes itself (a scroll or the app collapses it).
   */
  expanded?: boolean;
  /** Shadow (level 3; default true). */
  elevated?: boolean;
}

export function ExtendedFab({
  size = 'small',
  color: fabColor = 'primaryContainer',
  elevated = true,
  expanded = true,
  icon,
  children,
  sx,
  ref,
  ...rest
}: ExtendedFabProps) {
  const metrics = EXTENDED[size];
  const root = useRef<HTMLButtonElement | null>(null);
  const label = useRef<HTMLSpanElement | null>(null);
  const setRoot = useMergedRefs(root, ref);
  const labelShown = useExpandMotion(root, label, expanded, metrics.height);
  return (
    <BaseButton
      ref={setRoot}
      data-ripple-host=""
      {...rest}
      {...stylex.props(
        ...useFabRoot(fabColor, elevated, sx),
        dyn.box(null, metrics.height, metrics.radius),
        dyn.pad(metrics.padBlock, metrics.padInline, metrics.gap),
      )}
    >
      <StateLayer />
      {icon != null && <span {...stylex.props(s.icon, dyn.icon(metrics.icon))}>{icon}</span>}
      {labelShown ? (
        <span ref={label} {...stylex.props(LABEL[size], textBox.hug, s.label)}>
          {children}
        </span>
      ) : (
        // Collapsed: the label stays the accessible name (Compose takes it from the icon).
        <span {...stylex.props(visuallyHidden.root)}>{children}</span>
      )}
      <Ripple above />
    </BaseButton>
  );
}
