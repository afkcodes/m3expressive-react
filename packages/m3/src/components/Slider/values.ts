/*
 * Pure slider value helpers (no styling): tick density, range order and the thumbs' accessible
 * value text.
 */

/**
 * Tick marks are drawn for at most this many steps. A denser track would paint a solid line of
 * 4px dots (and thousands of nodes), so above it `ticks` draws nothing.
 */
export const MAX_TICKS = 200;

/** Steps between `min` and `max` for tick marks, or null when none are drawn (no step, empty range, over MAX_TICKS). */
export function tickSteps(min: number, max: number, step: number): number | null {
  if (!(step > 0) || !(max > min)) return null;
  const n = Math.round((max - min) / step);
  return n >= 1 && n <= MAX_TICKS ? n : null;
}

/** A range value in ascending order: a reversed value would otherwise lose its active track. */
export function sortRange(value: readonly [number, number]): [number, number] {
  return value[0] <= value[1] ? [value[0], value[1]] : [value[1], value[0]];
}

/**
 * aria-valuetext for a thumb whose value indicator shows `label`: the label itself when it is text
 * (a string or number), otherwise Base UI's default — the formatted value, followed by
 * "start range" / "end range" on a range slider.
 */
export function thumbValueText(label: unknown, formatted: string, index: number, range: boolean): string {
  const text = typeof label === 'string' || typeof label === 'number' ? String(label) : formatted;
  return range ? `${text} ${index === 0 ? 'start' : 'end'} range` : text;
}
