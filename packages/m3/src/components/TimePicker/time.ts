/** Time values for the time pickers. */

export interface Time {
  /** 0–23 */
  hour: number;
  minute: number;
}

const clamp = (v: number, min: number, max: number) =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : min;

/** A valid time: hour 0–23 and minute 0–59 (out-of-range values clamp, fractions round, NaN → 0). */
export function normalizeTime(t: Time): Time {
  const hour = clamp(t.hour, 0, 23);
  const minute = clamp(t.minute, 0, 59);
  return hour === t.hour && minute === t.minute ? t : { hour, minute };
}

/**
 * A clock-face value in range: minutes 0–59, 24-hour hours 0–23, 12-hour hours 1–12 (a 0–23 hour
 * maps onto the 12-hour dial: 0 → 12, 13 → 1). Out-of-range values clamp, fractions round, NaN → the minimum.
 */
export function dialValue(mode: 'hour' | 'minute', value: number, is24Hour = false): number {
  if (mode === 'minute') return clamp(value, 0, 59);
  const hour = clamp(value, 0, 23);
  return is24Hour ? hour : hour % 12 || 12;
}

/** The dial's accessible value (Compose's m3c_time_picker_*_suffix strings). */
export function dialValueText(mode: 'hour' | 'minute', value: number, is24Hour = false): string {
  if (mode === 'minute') return `${value} minutes`;
  return is24Hour ? `${value} hours` : `${value} o'clock`;
}
