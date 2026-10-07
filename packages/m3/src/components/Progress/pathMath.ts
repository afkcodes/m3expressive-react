/** Shared helpers for the indicators' SVG path data. */

export const rad = (deg: number) => (deg * Math.PI) / 180;

/** A path coordinate at Figma's export precision (3 decimals; `-0` and trailing zeros dropped). */
export const num = (n: number) => +n.toFixed(3);

/** The point at radius `r` and `deg` degrees clockwise from 12 o'clock around (c, c). */
export const polar = (r: number, deg: number, c: number): [number, number] => [
  c + r * Math.sin(rad(deg)),
  c - r * Math.cos(rad(deg)),
];
