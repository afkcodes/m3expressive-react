import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { elevation } from '../../tokens/elevation.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { state } from '../../tokens/state.stylex.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { tween } from '../../primitives/tweens.stylex.ts';
import { elevationMotion } from '../../primitives/elevationMotion.ts';
import { focusRing } from '../../primitives/focusRing.ts';
import { forcedStateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import type { ForceStateValue } from '../../testing/ForceState.tsx';

export type ChipKind = 'assist' | 'filter' | 'input' | 'suggestion';
type Level = 0 | 1 | 2 | 3 | 4;
type StateKey = 'enabled' | 'hovered' | 'focused' | 'pressed' | 'dragged';

/*
 * Figma kit, "Chips" page: Assistive, Filter, Input and Suggestion chips (+ chip groups).
 *   32px tall, 8px corners (input chip with avatar: fully round), label-large, 18px icons, gap 8.
 *   Padding: 8 next to an icon / check / trailing icon (4 next to an avatar), 16 next to the label
 *   (input chips: 12).
 *   Outlined: 1px outline-variant inside stroke; the kit adds a surface fill while hovered,
 *   focused, pressed or dragged. Elevated: surface-container-low. Selected: secondary-container,
 *   no stroke. State layer on-surface-variant (selected: on-secondary-container) at 8 / 10 / 10%,
 *   dragged on-surface 16%; press is a flat layer (no ripple in the kit).
 *   Disabled: outlined keeps an on-surface 10% stroke; filled ones get on-surface-variant 10%;
 *   content on-surface at 38%.
 *   Elevation differs per chip type in the kit (tables below); focused variants don't clip, so
 *   their shadow has no spread and their outline sits under the state layer.
 *
 * Motion — Compose material3 Chip.kt:
 *   elevation: ChipElevation.animateElevation → internal/Elevation.kt tweens (`elevationMotion`),
 *   snapping when disabled; the container colour is not animated (Surface `color` changes as is).
 *   Filter chip without an icon (expressive SelectableChip → AnimatingChipContent): the leading
 *   check enters with expandHorizontally(from Start) on FastSpatial + fadeIn DefaultEffects and
 *   leaves with shrinkHorizontally(towards Start) FastSpatial + fadeOut DefaultEffects. Compose
 *   keeps the 8dp padding and 8dp spacing around an empty (0-wide) leading slot, so the label sits
 *   16 from the edge unselected and 34 selected — here the slot is always present and its width
 *   springs 0 ⇄ 18px (overshoot included, like the IntSize spring).
 */
const ELEVATION: Record<string, Record<StateKey, Level>> = {
  'assist-elevated': { enabled: 1, hovered: 1, focused: 1, pressed: 2, dragged: 2 },
  'assist-outlined': { enabled: 0, hovered: 0, focused: 0, pressed: 0, dragged: 0 },
  'suggestion-elevated': { enabled: 1, hovered: 1, focused: 1, pressed: 2, dragged: 3 },
  'suggestion-outlined': { enabled: 0, hovered: 0, focused: 0, pressed: 0, dragged: 3 },
  'suggestion-outlined-selected': { enabled: 0, hovered: 1, focused: 0, pressed: 2, dragged: 3 },
  'filter-elevated': { enabled: 1, hovered: 2, focused: 1, pressed: 1, dragged: 4 },
  'filter-outlined': { enabled: 0, hovered: 0, focused: 0, pressed: 0, dragged: 4 },
  'filter-outlined-selected': { enabled: 0, hovered: 1, focused: 0, pressed: 0, dragged: 4 },
  'input-outlined': { enabled: 0, hovered: 0, focused: 0, pressed: 0, dragged: 3 },
};
/** Inline padding (kit): 8 next to an icon / check / trailing icon, 4 next to an avatar, 16 next to
 * the label (input chips: 12). */
const PAD_BESIDE_ICON = 8;
const PAD_BESIDE_AVATAR = 4;
const PAD_BESIDE_LABEL = 16;
const PAD_BESIDE_INPUT_LABEL = 12;

const SHADOW = [elevation.level0, elevation.level1, elevation.level2, elevation.level3, elevation.level4] as const;
const SHADOW_NO_SPREAD = [
  elevation.level0,
  elevation.level1NoSpread,
  elevation.level2NoSpread,
  elevation.level3NoSpread,
  elevation.level4NoSpread,
] as const;

export const chipStyles = stylex.create({
  root: {
    appearance: 'none',
    borderWidth: 0,
    margin: 0,
    backgroundImage: 'none',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    textAlign: 'inherit',
    position: 'relative',
    isolation: 'isolate',
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    boxSizing: 'border-box',
    height: 32,
    columnGap: 8,
    borderRadius: 8,
    cursor: { default: 'pointer', ':disabled': 'default' },
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    verticalAlign: 'middle',
    // Focus indicator: focusRing.host, listed right after this style.
  },
  // Raised by the `dragged` prop: Compose enters a drag with the incoming elevation tween.
  draggedIn: { transitionDuration: tween.elevationInDuration, transitionTimingFunction: tween.elevationInEasing },
  pill: { borderRadius: 16 },
  stroke: {
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: 'inherit',
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: color.outlineVariant,
      pointerEvents: 'none',
    },
  },
  strokeDisabled: { '::after': { borderColor: `color-mix(in srgb, ${color.onSurface} 10%, transparent)` } },
  // Focused variants don't clip, and Figma paints a non-clipping frame's state layer over its
  // outline (as for cards): the stroke drops under the layer while focused.
  strokeFocus: { '::after': { zIndex: { default: 'auto', ':focus-visible': -2 } } },
  strokeUnder: { '::after': { zIndex: -2 } },
  // Outlined chips get a surface fill while interacted with (kit).
  outlined: {
    backgroundColor: {
      default: 'transparent',
      ':hover': { default: null, '@media (hover: hover)': color.surface },
      ':focus-visible': { default: color.surface, '@media (hover: hover)': color.surface },
      ':active': { default: color.surface, '@media (hover: hover)': color.surface },
    },
  },
  outlinedInteracting: { backgroundColor: color.surface },
  elevatedFill: { backgroundColor: color.surfaceContainerLow },
  selectedFill: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  disabledFill: { backgroundColor: `color-mix(in srgb, ${color.onSurfaceVariant} 10%, transparent)` },
  disabledClear: { backgroundColor: 'transparent' },
  layerUnselected: {
    [interaction.layerColor]: color.onSurfaceVariant,
  },
  layerSelected: { [interaction.layerColor]: color.onSecondaryContainer },
  layerDragged: { [interaction.layerColor]: color.onSurface },
  content: { position: 'relative', display: 'inline-flex', alignItems: 'center', columnGap: 8 },
  contentDisabled: { opacity: state.disabledContentOpacity, color: color.onSurface },
  icon: { width: 18, height: 18, flexShrink: 0, fill: 'currentColor', display: 'block' },
  // Leading check slot of an icon-less filter chip (kept mounted; clips the check from the start).
  checkSlot: {
    display: 'block',
    flexShrink: 0,
    height: 18,
    overflow: 'hidden',
    transitionProperty: 'width, opacity',
    transitionDuration: `${motion.fastSpatialDuration}, ${motion.defaultEffectsDuration}`,
    transitionTimingFunction: `${motion.fastSpatialEasing}, ${motion.defaultEffectsEasing}`,
  },
  checkSlotIn: { width: 18, opacity: 1 },
  checkSlotOut: { width: 0, opacity: 0 },
  label: { color: 'inherit' },
  avatar: { position: 'relative', width: 24, height: 24, borderRadius: 12, flexShrink: 0, overflow: 'hidden' },
  inputWrap: { position: 'relative', display: 'inline-flex', verticalAlign: 'middle', flexShrink: 0 },
  remove: {
    appearance: 'none',
    borderWidth: 0,
    padding: 0,
    margin: 0,
    position: 'absolute',
    insetInlineEnd: 8,
    top: 7,
    width: 18,
    height: 18,
    backgroundColor: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    borderRadius: 9,
    // Ring drawn on the glyph's edge (after focusRing.host).
    outlineOffset: 0,
    // 48px touch area without changing layout.
    '::before': { content: '""', position: 'absolute', inset: -15 },
  },
});

export const chipDyn = stylex.create({
  pad: (start: number, end: number) => ({ paddingInlineStart: start, paddingInlineEnd: end }),
  shadow: (rest: string, hover: string, focus: string, press: string) => ({
    boxShadow: {
      default: rest,
      ':hover': { default: null, '@media (hover: hover)': hover },
      ':focus-visible': { default: focus, '@media (hover: hover)': focus },
      ':active': { default: press, '@media (hover: hover)': press },
    },
  }),
  fixedShadow: (shadow: string) => ({ boxShadow: shadow }),
  color: (label: string) => ({ color: label }),
  fill: (tone: string) => ({ fill: tone }),
});

export interface FrameOptions {
  kind: ChipKind;
  elevated: boolean;
  selected: boolean;
  disabled: boolean;
  dragged: boolean;
  forced: Pick<ForceStateValue, 'state' | 'focusRing'>;
  /** `slot`: an icon-less filter chip's animated check slot (8 + slot + 8 before the label). */
  leading: 'none' | 'icon' | 'avatar' | 'slot';
  trailing: boolean;
  pill?: boolean;
}

export function frameStyles({
  kind,
  elevated,
  selected,
  disabled,
  dragged,
  forced,
  leading,
  trailing,
  pill,
}: FrameOptions) {
  const style = elevated ? 'elevated' : 'outlined';
  const table =
    ELEVATION[
      `${kind}-${style}${selected && !elevated && (kind === 'filter' || kind === 'suggestion') ? '-selected' : ''}`
    ] ?? ELEVATION['input-outlined']!;
  const forcedState = forced.state;
  // The `dragged` prop wins over a forced state; every forced state has its own elevation.
  const stateKey: StateKey | null = dragged ? 'dragged' : (forcedState ?? null);
  const level = (key: StateKey) => table[key];
  const shadow = disabled
    ? null
    : stateKey
      ? chipDyn.fixedShadow(stateKey === 'focused' ? SHADOW_NO_SPREAD[level('focused')] : SHADOW[level(stateKey)])
      : chipDyn.shadow(
          SHADOW[level('enabled')],
          SHADOW[level('hovered')],
          SHADOW_NO_SPREAD[level('focused')],
          SHADOW[level('pressed')],
        );
  const start =
    leading === 'avatar'
      ? PAD_BESIDE_AVATAR
      : leading === 'icon' || leading === 'slot'
        ? PAD_BESIDE_ICON
        : kind === 'input'
          ? PAD_BESIDE_INPUT_LABEL
          : PAD_BESIDE_LABEL;
  const end = trailing ? PAD_BESIDE_ICON : kind === 'input' ? PAD_BESIDE_INPUT_LABEL : PAD_BESIDE_LABEL;
  const outlinedUnselected = !elevated && !selected;
  return [
    chipStyles.root,
    focusRing.host,
    pill && chipStyles.pill,
    chipDyn.pad(start, end),
    stateLayerHost.hostPressLayer,
    disabled && stateLayerHost.disabled,
    forcedStateLayer(forcedState, 'pressed'),
    dragged && stateLayerHost.forceDragged,
    selected ? chipStyles.layerSelected : chipStyles.layerUnselected,
    stateKey === 'dragged' && !selected && chipStyles.layerDragged,
    // container
    disabled
      ? selected || elevated
        ? chipStyles.disabledFill
        : chipStyles.disabledClear
      : selected
        ? chipStyles.selectedFill
        : elevated
          ? chipStyles.elevatedFill
          : chipStyles.outlined,
    !disabled && outlinedUnselected && stateKey && chipStyles.outlinedInteracting,
    outlinedUnselected && chipStyles.stroke,
    outlinedUnselected && chipStyles.strokeFocus,
    outlinedUnselected && forcedState === 'focused' && chipStyles.strokeUnder,
    outlinedUnselected && disabled && chipStyles.strokeDisabled,
    shadow,
    disabled ? elevationMotion.none : elevationMotion.host,
    !disabled && dragged && chipStyles.draggedIn,
    forced.focusRing && focusRing.forced,
  ];
}
