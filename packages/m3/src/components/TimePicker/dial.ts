/*
 * The clock face's geometry: the kit's number cells on the 256px dial (Figma 52949:28082), the
 * radii the selector travels on between them, and where the hand ends for an angle.
 */

export type Point = readonly [number, number];

/** The kit's number cells (top-left, px) on the 256px dial: index 0 = 12 o'clock, clockwise. */
export const OUTER: readonly Point[] = [
  [104, 2],
  [154, 16],
  [192, 54],
  [206, 104],
  [192, 154],
  [154, 192],
  [104, 206],
  [54, 192],
  [16, 154],
  [2, 104],
  [16, 54],
  [54, 16],
];
/** The 24-hour inner ring (24, 13 … 23). */
export const INNER: readonly Point[] = [
  [104, 30],
  [141, 40],
  [168, 66],
  [177, 104],
  [172, 141],
  [142, 166],
  [104, 178],
  [70, 166],
  [41, 141],
  [30, 104],
  [41, 66],
  [70, 40],
];
/** Dial centre, and the radii the selector travels on between cells. */
export const CENTRE = 128;
export const OUTER_R = 101;
export const INNER_R = 69;
/** Half a number cell (and the selector circle). */
export const CELL_HALF = 24;
/** Degrees per hour slot (12 slots), and per minute. */
export const SLOT_DEG = 30;
export const MINUTE_DEG = 6;
/** The hand counts as on its value within this many degrees (also the spring's precision). */
export const REST_PRECISION = 0.05;

export const HOUR_LABELS = Array.from({ length: 12 }, (_, i) => String(i === 0 ? 12 : i));
export const MINUTE_LABELS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
export const INNER_LABELS = Array.from({ length: 12 }, (_, i) => String(i === 0 ? 24 : i + 12));

/** The value's hand: its slot (0–11, fractional for minutes off the 5s) and ring. */
export function handFor(mode: 'hour' | 'minute', value: number, is24Hour: boolean) {
  const inner = mode === 'hour' && is24Hour && (value === 0 || value > 12);
  const slot = mode === 'hour' ? value % 12 : value / 5;
  return { inner, slot, target: slot * SLOT_DEG };
}
export type Hand = ReturnType<typeof handFor>;

/** The hand rests on its value: the selector then sits on the kit's cell, not on the circle. */
export const restsOn = (angle: number, { slot, target }: Hand) =>
  Math.abs(angle - target) % 360 < REST_PRECISION && Number.isInteger(slot);

/** Where the hand ends (the selector's centre) at `angle`. */
export function handEnd(angle: number, hand: Hand): Point {
  if (restsOn(angle, hand)) {
    const [x, y] = (hand.inner ? INNER : OUTER)[hand.slot]!;
    return [x + CELL_HALF, y + CELL_HALF];
  }
  const r = hand.inner ? INNER_R : OUTER_R;
  const radians = (angle * Math.PI) / 180;
  return [CENTRE + r * Math.sin(radians), CENTRE - r * Math.cos(radians)];
}
