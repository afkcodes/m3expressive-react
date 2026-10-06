import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex';
import { motion } from '../../tokens/motion.stylex';
import { useReducedMotion, useSpringToken } from '../../motion/context.tsx';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';
import { ListContext, ListItem, type ListItemProps } from './ListItem.tsx';

export type SwipeRevealState = 'closed' | 'peek' | 'revealed' | 'action';

export interface SwipeAction {
  icon: ReactNode;
  label: string;
  onAction?: () => void;
}

/*
 * Kit "List Item - Swipe" + "Reveal element" (59106:13321 / 13386). Swiping left slides the item
 * (Surface, 4px corners) and reveals the actions 2px to its right, rightmost = primary:
 *   peek     — 8px pills (2px apart): Secondary Container, primary pill Primary — as the drag
 *              opens, the pills widen evenly into…
 *   revealed — 48px icon buttons (52px when there's a single action), fully rounded;
 *   action   — a full swipe: the primary grows to 120px, the others shrink back to pills.
 * The reveal is a pure function of the offset, so the drag tracks the finger and releases settle
 * on the default spatial spring.
 */
const GAP = 2;
const PILL = 8;
const BUTTON = 48;
const ACTION = 120;

const s = stylex.create({
  // No text selection: a horizontal drag swipes rather than selecting the label.
  root: { position: 'relative', overflow: 'hidden', touchAction: 'pan-y', userSelect: 'none', listStyle: 'none', margin: 0, padding: 0 },
  item: { position: 'relative', willChange: 'transform' },
  itemSurface: { backgroundColor: color.surface },
  actions: { position: 'absolute', top: 0, bottom: 0, right: 0, display: 'flex', columnGap: GAP, alignItems: 'stretch' },
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
  w: (px: number) => ({ width: px }),
  icon: { display: 'flex', flexShrink: 0 },
  iconOpacity: (o: number) => ({ opacity: o }),
});

/** Action widths (left → right) for an offset `d` (px the item has moved left). */
export function swipeLayout(n: number, d: number, mode: 'drag' | 'action') {
  const avail = Math.max(0, d - GAP);
  if (n === 0) return [];
  if (mode === 'action') {
    const others = (n - 1) * (PILL + GAP);
    return [...Array(n - 1).fill(PILL), Math.max(PILL, avail - others)] as number[];
  }
  const full = n === 1 ? 52 : BUTTON;
  const w = Math.min(full, Math.max(0, (avail - (n - 1) * GAP) / n));
  return Array(n).fill(w) as number[];
}

/** Item offset for each settled state. */
export function swipeOffset(n: number, state: SwipeRevealState) {
  if (state === 'peek') return n * PILL + (n - 1) * GAP + GAP;
  if (state === 'revealed') return (n === 1 ? 52 : n * BUTTON + (n - 1) * GAP) + GAP;
  if (state === 'action') return ACTION + (n - 1) * (PILL + GAP) + GAP;
  return 0;
}

export interface SwipeActionsProps {
  actions: SwipeAction[];
  /** The full-swipe action (defaults to the primary, i.e. the last action). */
  swipeAction?: SwipeAction;
  /** Item offset (px) the actions fill, and whether a full swipe is engaged. */
  offset: number;
  mode: 'drag' | 'action';
  /** Interactive (focusable) — true once revealed. */
  revealed?: boolean;
  onAction?: (action: SwipeAction) => void;
  sx?: StyleXStyles;
}

/** The reveal row behind a swiped item (kit "Reveal element"); a pure function of the offset. */
export function SwipeActions({ actions, swipeAction, offset, mode, revealed = false, onAction, sx }: SwipeActionsProps) {
  const n = actions.length;
  const widths = swipeLayout(n, offset, mode);
  const shown = mode === 'action' && swipeAction ? [...actions.slice(0, -1), swipeAction] : actions;
  return (
    <div {...stylex.props(s.actions, sx)} aria-hidden={!revealed}>
      {shown.map((a, i) => {
        const w = widths[i] ?? 0;
        const iconOpacity = Math.max(0, Math.min(1, (w - 24) / 24));
        return (
          <button
            key={i}
            type="button"
            aria-label={a.label}
            tabIndex={revealed ? 0 : -1}
            onClick={() => onAction?.(a)}
            {...stylex.props(s.action, i === n - 1 && s.primary, s.w(w))}
          >
            {w >= 24 && <span {...stylex.props(s.icon, s.iconOpacity(iconOpacity))}>{a.icon}</span>}
          </button>
        );
      })}
    </div>
  );
}

export interface SwipeableListItemProps extends ListItemProps {
  /** Revealed actions, left → right; the last is the primary. */
  actions: SwipeAction[];
  /** Run by a full swipe (defaults to the primary action). */
  swipeAction?: SwipeAction;
  revealState?: SwipeRevealState;
  onRevealStateChange?: (state: SwipeRevealState) => void;
  sx?: StyleXStyles;
}

export function SwipeableListItem({ actions, swipeAction, revealState, onRevealStateChange, sx, ...item }: SwipeableListItemProps) {
  const list = useContext(ListContext);
  const reduced = useReducedMotion();
  const spring = useSpringToken('default-spatial');
  const n = actions.length;
  const [inner, setInner] = useState<SwipeRevealState>('closed');
  const state = revealState ?? inner;
  const setState = (v: SwipeRevealState) => {
    if (revealState === undefined) setInner(v);
    onRevealStateChange?.(v);
  };
  const [offset, setOffset] = useState(() => swipeOffset(n, state));
  const [mode, setMode] = useState<'drag' | 'action'>(state === 'action' ? 'action' : 'drag');
  const anim = useRef<SpringAnimation | null>(null);
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  const width = useRef(280);
  const root = useRef<HTMLElement | null>(null);

  // Settle on the state's offset with the spatial spring (instant under reduced motion).
  useEffect(() => {
    const target = swipeOffset(n, state);
    setMode(state === 'action' ? 'action' : 'drag');
    if (!spring || reduced) {
      anim.current?.stop();
      setOffset(target);
      return;
    }
    if (anim.current) anim.current.retarget(target, spring);
    else
      anim.current = animateSpring({
        spring,
        from: offset,
        to: target,
        precision: 0.5,
        onUpdate: setOffset,
        onComplete: () => (anim.current = null),
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, n]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    width.current = root.current?.getBoundingClientRect().width ?? 280;
    drag.current = { x: e.clientX, start: offset, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = d.x - e.clientX;
    if (!d.moved && Math.abs(dx) < 6) return;
    if (!d.moved) {
      d.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      anim.current?.stop();
      anim.current = null;
    }
    const next = Math.max(0, Math.min(width.current * 0.8, d.start + dx));
    setOffset(next);
    setMode(next > swipeOffset(n, 'revealed') + 24 ? 'action' : 'drag');
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    const revealed = swipeOffset(n, 'revealed');
    if (offset > revealed + 24 && n > 0) {
      setState('action');
      (swipeAction ?? actions[n - 1])?.onAction?.();
    } else if (offset > revealed / 2) setState('revealed');
    else setState('closed');
    // Re-run the settle effect even if the state didn't change.
    setOffset((o) => o);
  };

  return (
    <div
      ref={(el) => {
        root.current = el;
      }}
      role={list.inList ? 'listitem' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      {...stylex.props(s.root, sx)}
    >
      <SwipeActions
        actions={actions}
        swipeAction={swipeAction}
        offset={offset}
        mode={mode}
        revealed={state === 'revealed'}
        onAction={(a) => {
          a.onAction?.();
          setState('closed');
          // Closed actions leave the tab order and the accessibility tree: don't strand focus there.
          const active = document.activeElement;
          if (active instanceof HTMLElement && root.current?.contains(active)) active.blur();
        }}
      />
      <div {...stylex.props(s.item)} style={{ transform: `translateX(${-offset}px)` }}>
        <ListContext value={{ ...list, inList: false }}>
          <ListItem {...item} sx={s.itemSurface} />
        </ListContext>
      </div>
    </div>
  );
}
