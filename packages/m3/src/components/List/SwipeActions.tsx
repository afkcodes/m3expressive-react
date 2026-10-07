import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { swipeLayout } from './swipeGeometry.ts';

export interface SwipeAction {
  icon: ReactNode;
  label: string;
  onAction?: () => void;
}

/** Icons fade in between these action widths (px), so a pill never shows a clipped glyph. */
const ICON_MIN_WIDTH = 24;
const ICON_FADE_WIDTH = 24;

/*
 * Kit "Reveal element": pills / buttons in Secondary Container, the primary (rightmost) in
 * Primary, fully rounded, 2px apart.
 */
const s = stylex.create({
  actions: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    display: 'flex',
    // swipeGeometry GAP (StyleX needs the literal here).
    columnGap: 2,
    alignItems: 'stretch',
  },
  action: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    padding: 0,
    margin: 0,
    overflow: 'hidden',
    borderWidth: 0,
    borderStyle: 'none',
    borderRadius: 9999,
    cursor: 'pointer',
    backgroundColor: color.secondaryContainer,
    color: color.onSecondaryContainer,
    transitionProperty: 'background-color',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  primary: { backgroundColor: color.primary, color: color.onPrimary },
  width: (px: number) => ({ width: px }),
  icon: { display: 'flex', flexShrink: 0 },
  iconOpacity: (value: number) => ({ opacity: value }),
});

export interface SwipeActionsProps {
  actions: SwipeAction[];
  /** The full-swipe action (defaults to the primary, i.e. the last action). */
  swipeAction?: SwipeAction;
  /** Item offset (px) the actions fill, and whether a full swipe is engaged. */
  offset: number;
  mode: 'drag' | 'action';
  /** Interactive (focusable) — true once revealed. */
  revealed?: boolean;
  /** `event.detail` is 0 when the action was run from the keyboard. */
  onAction?: (action: SwipeAction, event: ReactMouseEvent<HTMLButtonElement>) => void;
  sx?: StyleXStyles;
}

/** The reveal row behind a swiped item (kit "Reveal element"); a pure function of the offset. */
export function SwipeActions({
  actions,
  swipeAction,
  offset,
  mode,
  revealed = false,
  onAction,
  sx,
}: SwipeActionsProps) {
  const count = actions.length;
  const widths = swipeLayout(count, offset, mode);
  const shown = mode === 'action' && swipeAction ? [...actions.slice(0, -1), swipeAction] : actions;
  return (
    <div {...stylex.props(s.actions, sx)} aria-hidden={!revealed}>
      {shown.map((action, i) => {
        const width = widths[i] ?? 0;
        const iconOpacity = Math.max(0, Math.min(1, (width - ICON_MIN_WIDTH) / ICON_FADE_WIDTH));
        return (
          <button
            key={i}
            type="button"
            aria-label={action.label}
            tabIndex={revealed ? 0 : -1}
            data-swipe-action=""
            onClick={(e) => onAction?.(action, e)}
            {...stylex.props(s.action, i === count - 1 && s.primary, s.width(width))}
          >
            {width >= ICON_MIN_WIDTH && (
              <span {...stylex.props(s.icon, s.iconOpacity(iconOpacity))}>{action.icon}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
