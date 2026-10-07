import { MAX_FLING_VELOCITY, MIN_FLING_VELOCITY } from '../../motion/gesture.ts';

/*
 * The modal side sheet's drag release (Material Components SideSheetBehavior + ViewDragHelper):
 * where a released sheet goes and how long it takes to get there.
 */

/** The sheet's horizontal geometry, measured when a drag starts. */
export interface SideSheetGeometry {
  /** The sheet sits at the right edge (end in LTR, start in RTL). */
  right: boolean;
  parentWidth: number;
  childWidth: number;
  /** Its inner margin from the edge (16px detached). */
  innerMargin: number;
  /** Expanded … fully off screen (width + inner margin). */
  range: number;
}

/** SideSheetBehavior: SIGNIFICANT_VEL_THRESHOLD, HIDE_THRESHOLD, HIDE_FRICTION. */
const SIGNIFICANT_VEL_THRESHOLD = 500;
const HIDE_THRESHOLD = 0.5;
const HIDE_FRICTION = 0.1;
/** ViewDragHelper BASE_SETTLE_DURATION / MAX_SETTLE_DURATION (ms) and its quintic ease-out. */
const BASE_SETTLE_DURATION = 256;
const MAX_SETTLE_DURATION = 600;
export const quinticOut = (t: number) => {
  const u = t - 1;
  return u * u * u * u * u + 1;
};
const clampMag = (value: number, absMin: number, absMax: number) => {
  const abs = Math.abs(value);
  if (abs < absMin) return 0;
  if (abs > absMax) return value > 0 ? absMax : -absMax;
  return value;
};
/** ViewDragHelper.computeAxisDuration. */
function computeAxisDuration(delta: number, velocity: number, motionRange: number, parentWidth: number) {
  if (delta === 0) return 0;
  const halfWidth = Math.trunc(parentWidth / 2);
  const distanceRatio = Math.min(1, Math.abs(delta) / parentWidth);
  const influence = Math.sin((distanceRatio - 0.5) * ((0.3 * Math.PI) / 2));
  const distance = halfWidth + halfWidth * influence;
  let duration: number;
  velocity = Math.abs(velocity);
  if (velocity > 0) duration = 4 * Math.round(1000 * Math.abs(distance / velocity));
  else duration = Math.trunc((Math.abs(delta) / motionRange + 1) * BASE_SETTLE_DURATION);
  return Math.min(duration, MAX_SETTLE_DURATION);
}
/** ViewDragHelper.computeSettleDuration for a horizontal-only drag (vertical range 0, dy 0). */
export function computeSettleDuration(
  dx: number,
  xvel: number,
  yvel: number,
  motionRange: number,
  parentWidth: number,
) {
  xvel = Math.trunc(clampMag(xvel, MIN_FLING_VELOCITY, MAX_FLING_VELOCITY));
  yvel = Math.trunc(clampMag(yvel, MIN_FLING_VELOCITY, MAX_FLING_VELOCITY));
  const absXVel = Math.abs(xvel);
  const addedVel = absXVel + Math.abs(yvel);
  const xweight = xvel !== 0 ? absXVel / addedVel : 1;
  return Math.trunc(computeAxisDuration(dx, xvel, motionRange, parentWidth) * xweight);
}

/**
 * SideSheetBehavior.calculateTargetStateOnViewReleased with the Right / LeftSheetDelegate
 * geometry. (shouldHide compares the released edge in px with HIDE_THRESHOLD 0.5 — always true
 * on screen, so the significant-swipe / half-way rules decide; ported as is.)
 */
export function shouldHideOnRelease(
  geometry: Pick<SideSheetGeometry, 'right' | 'parentWidth' | 'childWidth' | 'innerMargin'>,
  inward: number,
  vx: number,
  vy: number,
) {
  const mostlyHorizontal = Math.abs(vx) > Math.abs(vy);
  if (geometry.right) {
    const expanded = Math.max(0, geometry.parentWidth - geometry.childWidth - geometry.innerMargin);
    const hidden = geometry.parentWidth;
    const left = expanded + inward;
    if (vx < 0) return false; // isExpandingOutwards
    if (Math.abs(left + geometry.childWidth + vx * HIDE_FRICTION) > HIDE_THRESHOLD) {
      return (mostlyHorizontal && Math.abs(vx) > SIGNIFICANT_VEL_THRESHOLD) || left > (hidden + expanded) / 2;
    }
    if (vx === 0 || !mostlyHorizontal) return Math.abs(left - expanded) >= Math.abs(left - hidden);
    return true;
  }
  const expanded = Math.max(0, geometry.innerMargin);
  const hidden = -geometry.childWidth - geometry.innerMargin;
  const left = expanded - inward;
  if (vx > 0) return false;
  if (Math.abs(left + vx * HIDE_FRICTION) > HIDE_THRESHOLD) {
    return (
      (mostlyHorizontal && Math.abs(vx) > SIGNIFICANT_VEL_THRESHOLD) ||
      left + geometry.childWidth < (expanded - hidden) / 2
    );
  }
  if (vx === 0 || !mostlyHorizontal) return Math.abs(left - expanded) >= Math.abs(left - hidden);
  return true;
}
