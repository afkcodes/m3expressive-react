/*
 * Swipe geometry for SwipeableListItem — kit "List Item - Swipe" + "Reveal element"
 * (59106:13321 / 13386). Swiping left slides the item and reveals the actions 2px to its right,
 * rightmost = primary:
 *   peek     — 8px pills (2px apart) — as the drag opens, the pills widen evenly into…
 *   revealed — 48px icon buttons (52px when there's a single action), fully rounded;
 *   action   — a full swipe: the primary grows to 120px, the others shrink back to pills.
 * The reveal is a pure function of the offset, so the drag tracks the finger. Release follows
 * Compose SwipeToDismissBox (AnchoredDraggable fling behaviour).
 */
export type SwipeRevealState = 'closed' | 'peek' | 'revealed' | 'action';

/** Between the item and the actions, and between actions (SwipeActions' column gap). */
export const GAP = 2;
const PILL = 8;
const BUTTON = 48;
/** A lone action is a little wider (kit). */
const SINGLE_BUTTON = 52;
const ACTION = 120;
/** A drag this far past the revealed width engages the full-swipe action (kit). */
export const ACTION_ENGAGE_DISTANCE = 24;
/** SwipeToDismissBox.kt: DismissVelocityThreshold (125.dp) and positionalThreshold (56.dp). */
const VELOCITY_THRESHOLD = 125;
const POSITIONAL_THRESHOLD = 56;
/** AnchoredDraggableDefaults.SnapAnimationSpec = tween() — 300ms, FastOutSlowInEasing. */
export const SETTLE_MS = 300;

/** Action widths (left → right) for an offset `offset` (px the item has moved left). */
export function swipeLayout(count: number, offset: number, mode: 'drag' | 'action') {
  const avail = Math.max(0, offset - GAP);
  if (count === 0) return [];
  if (mode === 'action') {
    const others = (count - 1) * (PILL + GAP);
    return [...Array(count - 1).fill(PILL), Math.max(PILL, avail - others)] as number[];
  }
  const full = count === 1 ? SINGLE_BUTTON : BUTTON;
  const width = Math.min(full, Math.max(0, (avail - (count - 1) * GAP) / count));
  return Array(count).fill(width) as number[];
}

/** Item offset for each settled state. */
export function swipeOffset(count: number, state: SwipeRevealState) {
  if (state === 'peek') return count * PILL + (count - 1) * GAP + GAP;
  if (state === 'revealed') return (count === 1 ? SINGLE_BUTTON : count * BUTTON + (count - 1) * GAP) + GAP;
  if (state === 'action') return ACTION + (count - 1) * (PILL + GAP) + GAP;
  return 0;
}

/** Whether a drag at `offset` has engaged the full-swipe action. */
export const swipeMode = (count: number, offset: number): 'drag' | 'action' =>
  offset > swipeOffset(count, 'revealed') + ACTION_ENGAGE_DISTANCE ? 'action' : 'drag';

/**
 * Release target: AnchoredDraggable `computeTarget` over the closed (0) and revealed anchors.
 * `velocity` is in px/s along the offset (positive = opening).
 */
export function swipeTarget(
  count: number,
  offset: number,
  velocity: number,
  mode: 'drag' | 'action',
): SwipeRevealState {
  if (count === 0) return 'closed';
  if (mode === 'action') return velocity <= -VELOCITY_THRESHOLD ? 'revealed' : 'action';
  const anchors: [SwipeRevealState, number][] = [
    ['closed', 0],
    ['revealed', swipeOffset(count, 'revealed')],
  ];
  // DefaultDraggableAnchors.closestAnchor (ties and "nothing in that direction" pick the later anchor).
  const closest = (pos: number, upwards?: boolean) => {
    let best = anchors[0]!;
    let min = Infinity;
    for (const anchor of anchors) {
      const delta = upwards === undefined ? Math.abs(pos - anchor[1]) : upwards ? anchor[1] - pos : pos - anchor[1];
      const dist = delta < 0 ? Infinity : delta;
      if (dist <= min) {
        best = anchor;
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
