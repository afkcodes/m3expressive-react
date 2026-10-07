import { forwardRef, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { elevation } from '../../tokens/elevation.stylex.ts';
import { shape } from '../../tokens/shape.stylex.ts';
import { state } from '../../tokens/state.stylex.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { elevationMotion } from '../../primitives/elevationMotion.ts';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { cardVars } from './card.stylex.ts';

export type CardVariant = 'outlined' | 'elevated' | 'filled';

/*
 * Figma kit, Cards page, ".Building Blocks/Card states/{Outlined,Elevated,Filled}".
 * The kit's Focused variant turns off "clip content", which in Figma (a) paints the state layer
 * over the outline and (b) drops shadow spread. We reproduce both for the focused state (measured
 * 0–1 px against Figma); every other state keeps the outline on top and full shadows.
 *              enabled         hovered   focused   pressed   dragged
 *   outlined   surface + 1px   +lvl1     —         —         lvl3
 *   elevated   s-c-low lvl1    lvl2      lvl1      lvl1      lvl4
 *   filled     s-c-highest     lvl1      lvl1      lvl1      lvl3
 * State layer on-surface at 8 / 10 / 10 / 16 %. Corner medium (12px).
 */
const styles = stylex.create({
  root: {
    position: 'relative',
    isolation: 'isolate',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    borderRadius: shape.cornerMedium,
    overflow: 'hidden',
    color: color.onSurface,
    [interaction.layerColor]: color.onSurface,
  },
  interactive: {
    cursor: 'pointer',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineColor: color.secondary,
    outlineWidth: state.focusIndicatorThickness,
    outlineOffset: state.focusIndicatorOuterOffset,
    WebkitTapHighlightColor: 'transparent',
  },
  ringForced: { outlineStyle: 'solid' },
  horizontal: { flexDirection: 'row', alignItems: 'center' },
  // Figma strokeAlign INSIDE. Like the kit, the outline belongs to the card's background layer:
  // above the fill and state layer, beneath content (full-bleed media covers it).
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
      zIndex: cardVars.strokeZ,
    },
  },
  // Focused: outline beneath the state layer (z -1).
  strokeUnderLayer: { [cardVars.strokeZ]: '-2' },
  strokeUnderLayerOnFocus: { [cardVars.strokeZ]: { default: '-1', ':focus-visible': '-2' } },
});

const variants = stylex.create({
  outlined: { backgroundColor: color.surface, boxShadow: 'none' },
  elevated: { backgroundColor: color.surfaceContainerLow, boxShadow: elevation.level1 },
  filled: { backgroundColor: color.surfaceContainerHighest, boxShadow: 'none' },
});

// Interactive elevation changes (pseudo-class driven at runtime).
const live = stylex.create({
  outlined: {
    boxShadow: {
      default: 'none',
      ':hover': { default: null, '@media (hover: hover)': elevation.level1 },
      ':focus-visible': { default: 'none', '@media (hover: hover)': 'none' },
      ':active': { default: 'none', '@media (hover: hover)': 'none' },
    },
  },
  elevated: {
    boxShadow: {
      default: elevation.level1,
      ':hover': { default: null, '@media (hover: hover)': elevation.level2 },
      ':focus-visible': { default: elevation.level1NoSpread, '@media (hover: hover)': elevation.level1NoSpread },
      ':active': { default: elevation.level1, '@media (hover: hover)': elevation.level1 },
    },
  },
  filled: {
    boxShadow: {
      default: 'none',
      ':hover': { default: null, '@media (hover: hover)': elevation.level1 },
      ':focus-visible': { default: elevation.level1NoSpread, '@media (hover: hover)': elevation.level1NoSpread },
      ':active': { default: elevation.level1, '@media (hover: hover)': elevation.level1 },
    },
  },
});

// Static states (visual tests / controlled `dragged`).
const forced = stylex.create({
  outlinedHovered: { boxShadow: elevation.level1 },
  outlinedFocused: { boxShadow: 'none' },
  outlinedPressed: { boxShadow: 'none' },
  outlinedDragged: { boxShadow: elevation.level3 },
  elevatedHovered: { boxShadow: elevation.level2 },
  elevatedFocused: { boxShadow: elevation.level1NoSpread },
  elevatedPressed: { boxShadow: elevation.level1 },
  elevatedDragged: { boxShadow: elevation.level4 },
  filledHovered: { boxShadow: elevation.level1 },
  filledFocused: { boxShadow: elevation.level1NoSpread },
  filledPressed: { boxShadow: elevation.level1 },
  filledDragged: { boxShadow: elevation.level3 },
});

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> {
  variant?: CardVariant;
  /** 'horizontal' lays parts out in a row (kit "Horizontal card"). */
  orientation?: 'vertical' | 'horizontal';
  /**
   * Make the whole card one action (state layer, ripple, focus ring, Enter/Space).
   * Implied by `onClick`. Don't put other interactive elements inside an interactive card.
   */
  interactive?: boolean;
  /** Being dragged (controlled): raises the card and applies the 16% drag layer. */
  dragged?: boolean;
  children?: ReactNode;
  sx?: StyleXStyles;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'filled', orientation = 'vertical', interactive, dragged = false, onClick, onKeyDown, children, sx, ...rest },
  ref,
) {
  const force = useForcedState();
  const isInteractive = interactive ?? onClick !== undefined;
  const visualState = dragged ? 'dragged' : force.state;
  const key = visualState ? (`${variant}${visualState[0]!.toUpperCase()}${visualState.slice(1)}` as keyof typeof forced) : null;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || !isInteractive || e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.currentTarget.click();
    }
  };

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- role is "button" whenever the handlers act (isInteractive)
    <div
      ref={ref}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      data-ripple-host={isInteractive ? '' : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      {...rest}
      {...stylex.props(
        styles.root,
        orientation === 'horizontal' && styles.horizontal,
        variants[variant],
        variant === 'outlined' && styles.stroke,
        variant === 'outlined' && isInteractive && styles.strokeUnderLayerOnFocus,
        variant === 'outlined' && visualState === 'focused' && styles.strokeUnderLayer,
        isInteractive && styles.interactive,
        isInteractive && live[variant],
        isInteractive && elevationMotion.host,
        // Static states always show their layer, interactive or not (Figma building blocks).
        (isInteractive || visualState) && stateLayerHost.hostPressExclusive,
        visualState === 'hovered' && stateLayerHost.forceHover,
        visualState === 'focused' && stateLayerHost.forceFocus,
        visualState === 'pressed' && stateLayerHost.forcePressed,
        visualState === 'dragged' && stateLayerHost.forceDragged,
        key && forced[key],
        force.focusRing && styles.ringForced,
        sx,
      )}
    >
      {(isInteractive || visualState) && <StateLayer />}
      {isInteractive && <Ripple />}
      {children}
    </div>
  );
});
