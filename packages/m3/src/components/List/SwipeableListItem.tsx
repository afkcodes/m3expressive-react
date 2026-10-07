import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { useReducedMotion } from '../../motion/context.tsx';
import { isNoDragTarget } from '../../motion/dragGuard.ts';
import { pointerSlop } from '../../motion/gesture.ts';
import { focusRing } from '../../primitives/focusRing.ts';
import { state as stateTokens } from '../../tokens/state.stylex.ts';
import { ListContext } from './context.ts';
import { ListItem, type ListItemProps } from './ListItem.tsx';
import { fastOutSlowIn, VelocityTracker1D } from './gesture.ts';
import { SwipeActions, type SwipeAction, type SwipeActionsProps } from './SwipeActions.tsx';
import { SETTLE_MS, swipeMode, swipeOffset, swipeTarget, type SwipeRevealState } from './swipeGeometry.ts';
import { swipeKey, type SwipeKeyTarget } from './swipeKeys.ts';

export type { SwipeRevealState };

/*
 * Kit "List Item - Swipe" (59106:13321): swiping left slides the item (Surface, 4px corners) and
 * reveals the actions (SwipeActions; geometry and release physics in swipeGeometry.ts). Release
 * follows Compose SwipeToDismissBox: the pointer's velocity (Compose VelocityTracker, 100ms
 * horizon) at or above 125dp/s picks the next anchor in the fling direction, slower releases go on
 * once 56dp past the anchor they left; it then settles with AnchoredDraggableDefaults
 * .SnapAnimationSpec — tween(300ms, FastOutSlowIn). A full swipe (the kit's swipe action, engaged
 * 24px past the revealed width) runs the action unless flung back.
 * A press becomes a swipe after the shared 8px slop (motion/gesture.ts); presses on text entry,
 * sliders or `[data-m3-no-drag]` content never do (motion/dragGuard.ts).
 * Keyboard (swipeKeys.ts): with the item focused ArrowLeft reveals the actions and moves into them,
 * ArrowRight / Escape hide them; a row without its own click target takes focus itself.
 *
 * The offset changes on every pointer move and tween frame: it is written to the item's transform
 * directly and published to the actions row only (an external store), so the row and its list
 * item don't re-render per frame.
 */
/** The item travels at most this fraction of the row's width. */
const MAX_SWIPE_FRACTION = 0.8;
/** Row width assumed before the first measurement (px). */
const DEFAULT_ROW_WIDTH = 280;
/** Released this long after the last move, the pointer had stopped (Lsq2VelocityTracker, b/238654963). */
const ASSUME_STOPPED_MS = 40;

const s = stylex.create({
  // No text selection: a horizontal drag swipes rather than selecting the label.
  root: {
    position: 'relative',
    overflow: 'hidden',
    touchAction: 'pan-y',
    userSelect: 'none',
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  // A row that isn't itself a button / link is the keyboard focus target: ring drawn inside it
  // (after focusRing.host).
  ringInside: { outlineOffset: `calc(-1 * ${stateTokens.focusIndicatorThickness})` },
  item: { position: 'relative', willChange: 'transform' },
  itemSurface: { backgroundColor: color.surface },
});

const translate = (offset: number) => `translateX(${-offset}px)`;

/** The swipe offset (px the item has moved left), outside React state. */
interface OffsetStore {
  get: () => number;
  set: (offset: number) => void;
  subscribe: (listener: () => void) => () => void;
}

function createOffsetStore(initial: number): OffsetStore {
  let offset = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => offset,
    set: (next) => {
      if (next === offset) return;
      offset = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** The actions row, re-rendered by offset changes on its own. */
function LiveSwipeActions({ store, ...props }: Omit<SwipeActionsProps, 'offset'> & { store: OffsetStore }) {
  const offset = useSyncExternalStore(store.subscribe, store.get, store.get);
  return <SwipeActions offset={offset} {...props} />;
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

export function SwipeableListItem({
  actions,
  swipeAction,
  revealState,
  onRevealStateChange,
  sx,
  ...item
}: SwipeableListItemProps) {
  const list = useContext(ListContext);
  const reduced = useReducedMotion();
  const actionCount = actions.length;
  const [state, setState] = useControllableState(revealState, 'closed', onRevealStateChange);
  const [offsetStore] = useState(() => createOffsetStore(swipeOffset(actionCount, state)));
  // The item's transform at mount (also the server render); later offsets are written to the DOM.
  const [initialTransform] = useState(() => translate(swipeOffset(actionCount, state)));
  const [mode, setMode] = useState<'drag' | 'action'>(state === 'action' ? 'action' : 'drag');
  // The latest mode, for the gesture handlers (moves only re-render when the mode flips).
  const modeNow = useRef(mode);
  const anim = useRef<{ target: number; stop: () => void } | null>(null);
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  const tracker = useRef(new VelocityTracker1D());
  const rowWidth = useRef(DEFAULT_ROW_WIDTH);
  const root = useRef<HTMLDivElement | null>(null);
  const itemBox = useRef<HTMLDivElement | null>(null);
  const itemRef = useRef<HTMLElement | null>(null);
  const itemList = useMemo(() => ({ ...list, inList: false }), [list]);
  // The keyboard focus target: the item when it is a button / link, otherwise this row.
  const ownTarget = (item.onClick != null || item.href != null) && !item.disabled;
  const focusTarget = () => (ownTarget ? itemRef.current : root.current);
  const actionButtons = () =>
    Array.from(root.current?.querySelectorAll<HTMLElement>(':scope > div > [data-swipe-action]') ?? []);
  // Keyboard reveal: the action to focus once the actions are interactive (state "revealed").
  const pendingFocus = useRef<number | null>(null);

  const setOffset = (offset: number) => {
    offsetStore.set(offset);
    if (itemBox.current) itemBox.current.style.transform = translate(offset);
  };
  const updateMode = (next: 'drag' | 'action') => {
    if (modeNow.current === next) return;
    modeNow.current = next;
    setMode(next);
  };

  // Settle on a state's offset: tween(300ms, FastOutSlowIn), instant under reduced motion.
  const settle = (next: SwipeRevealState) => {
    const target = swipeOffset(actionCount, next);
    updateMode(next === 'action' ? 'action' : 'drag');
    if (anim.current?.target === target) return;
    anim.current?.stop();
    anim.current = null;
    const from = offsetStore.get();
    if (reduced || from === target) {
      setOffset(target);
      return;
    }
    let frame = 0;
    let begin: number | undefined;
    const tick = (now: number) => {
      begin ??= now;
      const progress = Math.min(1, (now - begin) / SETTLE_MS);
      setOffset(from + (target - from) * fastOutSlowIn(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else anim.current = null;
    };
    frame = requestAnimationFrame(tick);
    anim.current = { target, stop: () => cancelAnimationFrame(frame) };
  };
  useEffect(() => {
    settle(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, actionCount]);
  useEffect(() => () => anim.current?.stop(), []);
  useEffect(() => {
    if (state !== 'revealed' || pendingFocus.current == null) return;
    actionButtons()[pendingFocus.current]?.focus();
    pendingFocus.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.defaultPrevented) return;
    const target = e.target as HTMLElement;
    const index = actionButtons().indexOf(target);
    let at: SwipeKeyTarget;
    if (index >= 0) at = { kind: 'action', index };
    else if (target === focusTarget()) at = { kind: 'item' };
    else return; // a control inside the item keeps its own keys
    const reaction = swipeKey(e.key, at, state, actionCount);
    if (!reaction) return;
    e.preventDefault();
    pendingFocus.current = null;
    if (reaction.reveal) {
      setState('revealed');
      settle('revealed');
    }
    if (reaction.close) {
      setState('closed');
      settle('closed');
    }
    if (reaction.focus === 'item') focusTarget()?.focus();
    else if (reaction.focus != null) {
      if (reaction.reveal || state !== 'revealed') pendingFocus.current = reaction.focus;
      else actionButtons()[reaction.focus]?.focus();
    }
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0 || isNoDragTarget(e.nativeEvent, e.currentTarget)) return;
    rowWidth.current = root.current?.getBoundingClientRect().width ?? DEFAULT_ROW_WIDTH;
    drag.current = { x: e.clientX, start: offsetStore.get(), moved: false };
    tracker.current.reset();
    tracker.current.add(e.timeStamp, e.clientX);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const gesture = drag.current;
    if (!gesture) return;
    // Compose Lsq2VelocityTracker: every MOVE, with its historical (coalesced) samples.
    const samples = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const sample of samples.length > 0 ? samples : [e.nativeEvent])
      tracker.current.add(sample.timeStamp, sample.clientX);
    const dx = gesture.x - e.clientX;
    if (!gesture.moved && Math.abs(dx) < pointerSlop(e.pointerType)) return;
    if (!gesture.moved) {
      gesture.moved = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // The pointer is already gone (or synthetic): keep tracking without capture.
      }
      anim.current?.stop();
      anim.current = null;
    }
    const next = Math.max(0, Math.min(rowWidth.current * MAX_SWIPE_FRACTION, gesture.start + dx));
    setOffset(next);
    updateMode(swipeMode(actionCount, next));
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const gesture = drag.current;
    drag.current = null;
    if (!gesture?.moved) return;
    // The UP isn't a sample; released over 40ms after the last MOVE, the pointer had stopped. The
    // item moves left as the pointer does: opening velocity is the pointer's, negated.
    const stopped = e.type === 'pointercancel' || e.timeStamp - tracker.current.lastTime() > ASSUME_STOPPED_MS;
    const velocity = stopped ? 0 : -tracker.current.velocity();
    const target = swipeTarget(actionCount, offsetStore.get(), velocity, modeNow.current);
    if (target === 'action') (swipeAction ?? actions[actionCount - 1])?.onAction?.();
    setState(target);
    // Settle even when the state doesn't change (released back where it started).
    settle(target);
  };

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- swipe gesture and its keyboard path, delegated from the row and its actions
    <div
      ref={root}
      role={list.inList ? 'listitem' : undefined}
      tabIndex={ownTarget ? undefined : 0}
      data-swipe-item=""
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      {...stylex.props(s.root, !ownTarget && [focusRing.host, s.ringInside], sx)}
    >
      <LiveSwipeActions
        store={offsetStore}
        actions={actions}
        swipeAction={swipeAction}
        mode={mode}
        revealed={state === 'revealed'}
        onAction={(action, e) => {
          action.onAction?.();
          setState('closed');
          // Closed actions leave the tab order and the accessibility tree: don't strand focus there.
          // From the keyboard focus returns to the item; a pointer press just drops it.
          const active = document.activeElement;
          if (active instanceof HTMLElement && root.current?.contains(active)) {
            if (e.detail === 0) focusTarget()?.focus();
            else active.blur();
          }
        }}
      />
      <div ref={itemBox} {...stylex.props(s.item)} style={{ transform: initialTransform }}>
        <ListContext value={itemList}>
          <ListItem ref={itemRef} {...item} sx={s.itemSurface} />
        </ListContext>
      </div>
    </div>
  );
}
