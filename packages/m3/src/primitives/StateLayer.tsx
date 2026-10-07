import * as stylex from '@stylexjs/stylex';
import { interaction } from './state.stylex.ts';
import { state } from '../tokens/state.stylex.ts';

/**
 * Hover / focus / drag overlay. Pressed is drawn by <Ripple/>, exactly as
 * Compose layers them (StateLayer ignores PressInteraction).
 *
 * Apply `stateLayerHost.host` to the interactive root (position: relative is
 * included) and render <StateLayer/> as its first child.
 */
export const stateLayerHost = stylex.create({
  host: {
    position: 'relative',
    isolation: 'isolate',
    [interaction.layerOpacity]: {
      default: '0',
      ':hover': { default: '0', '@media (hover: hover)': state.hoverOpacity },
      // Same media wrapper as :hover so pseudo-class order (hover < focus-visible) decides.
      ':focus-visible': { default: state.focusOpacity, '@media (hover: hover)': state.focusOpacity },
    },
    [interaction.layerDuration]: {
      default: '15ms',
      ':focus-visible': { default: '45ms', '@media (hover: hover)': '45ms' },
    },
  },
  /**
   * Press replaces hover instead of stacking on it: once the ripple has spread the surface shows
   * exactly the pressed opacity (the kit's Pressed card variants: a flat 10% layer).
   */
  hostPressExclusive: {
    position: 'relative',
    isolation: 'isolate',
    [interaction.layerOpacity]: {
      default: '0',
      ':hover': { default: '0', '@media (hover: hover)': state.hoverOpacity },
      ':focus-visible': { default: state.focusOpacity, '@media (hover: hover)': state.focusOpacity },
      ':active': { default: '0', '@media (hover: hover)': '0' },
    },
    [interaction.layerDuration]: {
      default: '15ms',
      ':focus-visible': { default: '45ms', '@media (hover: hover)': '45ms' },
    },
  },
  /** Press shows the pressed layer (10%) instead of hover (kit checkbox/radio Pressed variants). */
  hostPressLayer: {
    position: 'relative',
    isolation: 'isolate',
    [interaction.layerOpacity]: {
      default: '0',
      ':hover': { default: '0', '@media (hover: hover)': state.hoverOpacity },
      ':focus-visible': { default: state.focusOpacity, '@media (hover: hover)': state.focusOpacity },
      ':active': { default: state.pressedOpacity, '@media (hover: hover)': state.pressedOpacity },
    },
    [interaction.layerDuration]: {
      default: '15ms',
      ':focus-visible': { default: '45ms', '@media (hover: hover)': '45ms' },
    },
  },
  disabled: {
    [interaction.layerOpacity]: '0',
  },
  /** Visual-test hooks: force a static state regardless of pointer/focus. */
  forceHover: { [interaction.layerOpacity]: state.hoverOpacity },
  forceFocus: { [interaction.layerOpacity]: state.focusOpacity },
  forcePressed: { [interaction.layerOpacity]: state.pressedOpacity },
  forceDragged: { [interaction.layerOpacity]: state.draggedOpacity, [interaction.layerDuration]: '45ms' },
});

const styles = stylex.create({
  layer: {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    pointerEvents: 'none',
    zIndex: -1,
    backgroundColor: interaction.layerColor,
    opacity: interaction.layerOpacity,
    transitionProperty: 'opacity',
    // Compose material-ripple StateLayer: tweens with LinearEasing, not the motion scheme.
    transitionDuration: interaction.layerDuration,
    transitionTimingFunction: 'linear',
  },
});

export function StateLayer() {
  return <span aria-hidden {...stylex.props(styles.layer)} />;
}
