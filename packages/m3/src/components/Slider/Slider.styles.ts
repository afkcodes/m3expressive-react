import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { state } from '../../tokens/state.stylex.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { sliderVars, thumb0, thumb1 } from './slider.stylex.ts';

/* Slider styles (Figma kit "Sliders" — see Slider.tsx for the spec). */
export const s = stylex.create({
  root: {
    position: 'relative',
    flexShrink: 0,
    boxSizing: 'border-box',
    touchAction: 'none',
    [sliderVars.hw0]: { default: '4px', [stylex.when.descendant(':is([data-dragging])', thumb0)]: '2px' },
    [sliderVars.hw1]: { default: '4px', [stylex.when.descendant(':is([data-dragging])', thumb1)]: '2px' },
  },
  forcePressed0: { [sliderVars.hw0]: '2px' },
  forcePressed1: { [sliderVars.hw1]: '2px' },
  horizontal: (h: number) => ({ width: '100%', height: h }),
  vertical: (h: number) => ({ width: h, height: '100%' }),
  control: { position: 'absolute', touchAction: 'none' },
  controlH: { top: 0, bottom: 0, insetInlineStart: 6, insetInlineEnd: 6 },
  controlV: { left: 0, right: 0, top: 6, bottom: 6 },
  track: { position: 'absolute', overflow: 'hidden', pointerEvents: 'none' },
  trackH: (offset: number, thickness: number) => ({ top: offset, height: thickness }),
  trackV: (offset: number, thickness: number) => ({ left: offset, width: thickness }),
  spanH: (start: string | null, end: string | null, size: string) => ({
    insetInlineStart: start ?? 'auto',
    insetInlineEnd: end ?? 'auto',
    width: `max(0px, ${size})`,
  }),
  spanV: (start: string | null, end: string | null, size: string) => ({
    bottom: start ?? 'auto',
    top: end ?? 'auto',
    height: `max(0px, ${size})`,
  }),
  // [start-start, start-end, end-end, end-start] in logical corners (horizontal) — mapped per axis.
  radiusH: (startSide: number, endSide: number) => ({
    borderStartStartRadius: startSide,
    borderEndStartRadius: startSide,
    borderStartEndRadius: endSide,
    borderEndEndRadius: endSide,
  }),
  radiusV: (bottom: number, top: number) => ({
    borderBottomLeftRadius: bottom,
    borderBottomRightRadius: bottom,
    borderTopLeftRadius: top,
    borderTopRightRadius: top,
  }),
  active: { backgroundColor: color.primary },
  activeDisabled: { backgroundColor: color.onSurface, opacity: 0.38 },
  inactive: { backgroundColor: color.secondaryContainer },
  inactiveDisabled: { backgroundColor: `color-mix(in srgb, ${color.onSurface} 10%, transparent)` },
  dot: { position: 'absolute', width: 4, height: 4, borderRadius: '50%', backgroundColor: color.onSecondaryContainer },
  dotDisabled: { backgroundColor: color.onSurface, opacity: 0.38 },
  dotH: { top: '50%', marginTop: -2 },
  dotV: { left: '50%', marginLeft: -2 },
  dotStartH: { insetInlineStart: 4 },
  dotEndH: { insetInlineEnd: 4 },
  dotStartV: { bottom: 4 },
  dotEndV: { top: 4 },
  tick: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: '50%',
    pointerEvents: 'none',
    transform: 'translate(-50%, -50%)',
  },
  tickAt: (main: string, cross: string) => ({ insetInlineStart: main, top: cross }),
  tickAtV: (main: string, cross: string) => ({ bottom: main, left: cross, transform: 'translate(-50%, 50%)' }),
  tickOnActive: { backgroundColor: color.secondaryContainer },
  tickOnInactive: { backgroundColor: color.onSecondaryContainer },
  thumb: {
    boxSizing: 'border-box',
    backgroundColor: color.primary,
    borderRadius: 2,
    isolation: 'isolate',
    [interaction.layerColor]: color.onPrimary,
    [interaction.layerOpacity]: {
      default: '0',
      ':hover': { default: '0', '@media (hover: hover)': state.hoverOpacity },
      ':is([data-dragging])': { default: state.pressedOpacity, '@media (hover: hover)': state.pressedOpacity },
    },
    // Compose StateLayer: a drag fades in over 45 ms (linear).
    [interaction.layerDuration]: {
      default: '15ms',
      ':is([data-dragging])': { default: '45ms', '@media (hover: hover)': '45ms' },
    },
    // 48px touch / hover target around the 4px bar.
    '::after': { content: '""', position: 'absolute', inset: '-4px -22px' },
  },
  thumbV: { '::after': { inset: '-22px -4px' } },
  thumbH0: { width: sliderVars.hw0, height: '100%' },
  thumbH1: { width: sliderVars.hw1, height: '100%' },
  thumbV0: { height: sliderVars.hw0, width: '100%' },
  thumbV1: { height: sliderVars.hw1, width: '100%' },
  thumbDisabled: { backgroundColor: color.onSurface, opacity: 0.38, [interaction.layerOpacity]: '0' },
  indicator: {
    position: 'absolute',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    height: 44,
    paddingInline: 11.5,
    borderRadius: 9999,
    backgroundColor: color.inverseSurface,
    color: color.inverseOnSurface,
    pointerEvents: 'none',
    // Compose's slider value indicator is a `Label` (internal Label.kt): a BasicTooltipBox popup
    // that appears and disappears with no transition. It shows while pressed / dragged (the kit's
    // Pressed variants) and, as our accessibility choice, while keyboard-focused. Compose's Label
    // also shows on hover; the kit's Hovered variants draw no indicator, so the kit wins there.
    opacity: {
      default: 0,
      [stylex.when.ancestor(':is([data-dragging])')]: 1,
      [stylex.when.ancestor(':has(:focus-visible)')]: 1,
    },
  },
  indicatorH: { bottom: 'calc(100% + 4px)', left: '50%', translate: '-50% 0' },
  indicatorV: { right: 'calc(100% + 4px)', top: '50%', translate: '0 -50%' },
  indicatorShown: { opacity: 1 },
});
