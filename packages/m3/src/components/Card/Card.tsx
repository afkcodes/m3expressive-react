import { forwardRef, type HTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { elevation } from '../../tokens/elevation.stylex.ts';
import { shape } from '../../tokens/shape.stylex.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { elevationMotion } from '../../primitives/elevationMotion.ts';
import { focusRing } from '../../primitives/focusRing.ts';
import { forcedStateLayer, StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
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
  // Focus indicator: focusRing.host, listed right after this style.
  interactive: { cursor: 'pointer', WebkitTapHighlightColor: 'transparent' },
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
const staticShadows = stylex.create({
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
  {
    variant = 'filled',
    orientation = 'vertical',
    interactive,
    dragged = false,
    onClick,
    onKeyDown,
    children,
    sx,
    ...rest
  },
  ref,
) {
  const forced = useForcedState();
  const isInteractive = interactive ?? onClick !== undefined;
  const visualState = dragged ? 'dragged' : forced.state;
  const shadowKey = visualState
    ? (`${variant}${visualState[0]!.toUpperCase()}${visualState.slice(1)}` as keyof typeof staticShadows)
    : null;

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
        isInteractive && focusRing.host,
        isInteractive && live[variant],
        isInteractive && elevationMotion.host,
        // Static states always show their layer, interactive or not (Figma building blocks).
        (isInteractive || visualState) && stateLayerHost.hostPressExclusive,
        forcedStateLayer(visualState, 'pressed'),
        shadowKey && staticShadows[shadowKey],
        forced.focusRing && focusRing.forced,
        sx,
      )}
    >
      {(isInteractive || visualState) && <StateLayer />}
      {isInteractive && <Ripple />}
      {children}
    </div>
  );
});
