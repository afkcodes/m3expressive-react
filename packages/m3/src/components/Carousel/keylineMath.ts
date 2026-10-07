/** Shared arithmetic of the keyline port (Compose util lerp / coerceIn). */
export const lerpF = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
