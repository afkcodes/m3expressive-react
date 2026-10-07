import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { useReducedMotion } from '../../motion/context.tsx';
import { ListContext, ListItem, type ListItemProps } from './ListItem.tsx';
import { fastOutSlowIn, VelocityTracker1D } from './gesture.ts';

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
 * The reveal is a pure function of the offset, so the drag tracks the finger. Release follows
 * Compose SwipeToDismissBox (AnchoredDraggable fling behaviour): the pointer's velocity (Compose
 * VelocityTracker, 100ms horizon) at or above 125dp/s picks the next anchor in the fling direction,
 * slower releases go on once 56dp past the anchor they left; it then settles with
 * AnchoredDraggableDefaults.SnapAnimationSpec — tween(300ms, FastOutSlowIn). A full swipe (the
 * kit's swipe action, engaged 24px past the revealed width) runs the action unless flung back.
 */
const GAP = 2;
const PILL = 8;
const BUTTON = 48;
const ACTION = 120;
/** SwipeToDismissBox.kt: DismissVelocityThreshold (125.dp) and positionalThreshold (56.dp). */
const VELOCITY_THRESHOLD = 125;
const POSITIONAL_THRESHOLD = 56;
/** AnchoredDraggableDefaults.SnapAnimationSpec = tween() — 300ms, FastOutSlowInEasing. */
const SETTLE_MS = 300;

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

/**
 * Release target: AnchoredDraggable `computeTarget` over the closed (0) and revealed anchors.
 * `velocity` is in px/s along the offset (positive = opening).
 */
export function swipeTarget(n: number, offset: number, velocity: number, mode: 'drag' | 'action'): SwipeRevealState {
  if (n === 0) return 'closed';
  if (mode === 'action') return velocity <= -VELOCITY_THRESHOLD ? 'revealed' : 'action';
  const anchors: [SwipeRevealState, number][] = [
    ['closed', 0],
    ['revealed', swipeOffset(n, 'revealed')],
  ];
  // DefaultDraggableAnchors.closestAnchor (ties and "nothing in that direction" pick the later anchor).
  const closest = (pos: number, upwards?: boolean) => {
    let best = anchors[0]!;
    let min = Infinity;
    for (const a of anchors) {
      const delta = upwards === undefined ? Math.abs(pos - a[1]) : upwards ? a[1] - pos : pos - a[1];
      const dist = delta < 0 ? Infinity : delta;
      if (dist <= min) {
        best = a;
        min = dist;
      }
    }
    return best;
  };
  if (velocity === 0 || Number.isNaN(velocity)) return closest(offset)[0];
  const forward = velocity > 0;
  if (Math.abs(velocity) >= VELOCITY_THRESHOLD) return closest(offset, forward)[0];
  const left = closest(offset, false);
  const right = closest(offset, true);
  const fromStart = forward ? left[1] : right[1];
  const crossed = Math.abs(fromStart - offset) >= POSITIONAL_THRESHOLD;
  return (crossed ? (forward ? right : left) : forward ? left : right)[0];
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
  const n = actions.length;
  const [inner, setInner] = useState<SwipeRevealState>('closed');
  const state = revealState ?? inner;
  const setState = (v: SwipeRevealState) => {
    if (revealState === undefined) setInner(v);
    onRevealStateChange?.(v);
  };
  const [offset, setOffsetState] = useState(() => swipeOffset(n, state));
  const offsetRef = useRef(offset);
  const setOffset = (v: number) => {
    offsetRef.current = v;
    setOffsetState(v);
  };
  const [mode, setMode] = useState<'drag' | 'action'>(state === 'action' ? 'action' : 'drag');
  const anim = useRef<{ target: number; stop: () => void } | null>(null);
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  const tracker = useRef(new VelocityTracker1D());
  const width = useRef(280);
  const root = useRef<HTMLElement | null>(null);

  // Settle on a state's offset: tween(300ms, FastOutSlowIn), instant under reduced motion.
  const settle = (next: SwipeRevealState) => {
    const target = swipeOffset(n, next);
    setMode(next === 'action' ? 'action' : 'drag');
    if (anim.current?.target === target) return;
    anim.current?.stop();
    anim.current = null;
    const from = offsetRef.current;
    if (reduced || from === target) {
      setOffset(target);
      return;
    }
    let frame = 0;
    let begin: number | undefined;
    const tick = (now: number) => {
      begin ??= now;
      const p = Math.min(1, (now - begin) / SETTLE_MS);
      setOffset(from + (target - from) * fastOutSlowIn(p));
      if (p < 1) frame = requestAnimationFrame(tick);
      else anim.current = null;
    };
    frame = requestAnimationFrame(tick);
    anim.current = { target, stop: () => cancelAnimationFrame(frame) };
  };
  useEffect(() => {
    settle(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, n]);
  useEffect(() => () => anim.current?.stop(), []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    width.current = root.current?.getBoundingClientRect().width ?? 280;
    drag.current = { x: e.clientX, start: offsetRef.current, moved: false };
    tracker.current.reset();
    tracker.current.add(e.timeStamp, e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    // Compose Lsq2VelocityTracker: every MOVE, with its historical (coalesced) samples.
    const samples = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const c of samples.length > 0 ? samples : [e.nativeEvent]) tracker.current.add(c.timeStamp, c.clientX);
    const dx = d.x - e.clientX;
    if (!d.moved && Math.abs(dx) < 6) return;
    if (!d.moved) {
      d.moved = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // The pointer is already gone (or synthetic): keep tracking without capture.
      }
      anim.current?.stop();
      anim.current = null;
    }
    const next = Math.max(0, Math.min(width.current * 0.8, d.start + dx));
    setOffset(next);
    setMode(next > swipeOffset(n, 'revealed') + 24 ? 'action' : 'drag');
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    // The UP isn't a sample; released over 40ms after the last MOVE, the pointer had stopped
    // (Lsq2VelocityTracker, b/238654963). The item moves left as the pointer does: opening
    // velocity is the pointer's, negated.
    const stopped = e.type === 'pointercancel' || e.timeStamp - tracker.current.lastTime() > 40;
    const velocity = stopped ? 0 : -tracker.current.velocity();
    const target = swipeTarget(n, offsetRef.current, velocity, mode);
    if (target === 'action') (swipeAction ?? actions[n - 1])?.onAction?.();
    setState(target);
    // Settle even when the state doesn't change (released back where it started).
    settle(target);
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
