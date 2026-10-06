// SVG path helpers for the AndroidX graphics-shapes port (Apache License 2.0).
//
// The web counterpart of the Android-only Shapes.android.kt `RoundedPolygon.toPath()` /
// `Morph.toPath()`: same command sequence (moveTo the first anchor, one cubicTo per cubic,
// close), emitted as an absolute SVG path string instead of an android.graphics.Path.

import type { Cubic } from './cubic.ts';
import type { Morph } from './morph.ts';

function fmt(value: number, fractionDigits: number): string {
  const rounded = Number(value.toFixed(fractionDigits));
  // Normalise -0 to 0
  return String(rounded === 0 ? 0 : rounded);
}

/**
 * Absolute `M … C … Z` path for a list of cubics (e.g. `polygon.cubics` or
 * `morph.asCubics(progress)`). Each point is mapped to `(x * scale + offsetX, y * scale + offsetY)`
 * and printed with at most [fractionDigits] decimals.
 */
export function toSvgPath(
  cubics: readonly Cubic[],
  scale: number = 1,
  offsetX: number = 0,
  offsetY: number = 0,
  fractionDigits: number = 4,
): string {
  const px = (x: number) => fmt(x * scale + offsetX, fractionDigits);
  const py = (y: number) => fmt(y * scale + offsetY, fractionDigits);
  let d = '';
  for (let i = 0; i < cubics.length; i++) {
    const cubic = cubics[i]!;
    if (i === 0) {
      d += `M${px(cubic.anchor0X)} ${py(cubic.anchor0Y)}`;
    }
    d +=
      `C${px(cubic.control0X)} ${py(cubic.control0Y)} ` +
      `${px(cubic.control1X)} ${py(cubic.control1Y)} ` +
      `${px(cubic.anchor1X)} ${py(cubic.anchor1Y)}`;
  }
  return cubics.length > 0 ? `${d}Z` : '';
}

/**
 * Absolute `M … C … Z` path for a [Morph] at [progress] (0 = start shape, 1 = end shape).
 *
 * Mirrors Shapes.android.kt `Morph.toPath`: iterates with `forEachCubic` (no Cubic allocation)
 * and ends the last curve exactly on the first anchor point, so the outline closes without a seam.
 */
export function morphToSvgPath(
  morph: Morph,
  progress: number,
  scale: number = 1,
  offsetX: number = 0,
  offsetY: number = 0,
  fractionDigits: number = 4,
): string {
  const px = (x: number) => fmt(x * scale + offsetX, fractionDigits);
  const py = (y: number) => fmt(y * scale + offsetY, fractionDigits);
  let d = '';
  let firstX = 0;
  let firstY = 0;
  let prevControl0X = 0;
  let prevControl0Y = 0;
  let prevControl1X = 0;
  let prevControl1Y = 0;
  let prevAnchor1X = 0;
  let prevAnchor1Y = 0;
  let first = true;
  morph.forEachCubic(progress, (it) => {
    if (first) {
      d += `M${px(it.anchor0X)} ${py(it.anchor0Y)}`;
      firstX = it.anchor0X;
      firstY = it.anchor0Y;
      first = false;
    } else {
      // We delay using the current cubic, because we need to do something special for the
      // last one and we can't detect it is the last one until the loop ends.
      d +=
        `C${px(prevControl0X)} ${py(prevControl0Y)} ` +
        `${px(prevControl1X)} ${py(prevControl1Y)} ` +
        `${px(prevAnchor1X)} ${py(prevAnchor1Y)}`;
    }
    prevControl0X = it.control0X;
    prevControl0Y = it.control0Y;
    prevControl1X = it.control1X;
    prevControl1Y = it.control1Y;
    prevAnchor1X = it.anchor1X;
    prevAnchor1Y = it.anchor1Y;
  });
  if (first) return '';
  d +=
    `C${px(prevControl0X)} ${py(prevControl0Y)} ` +
    `${px(prevControl1X)} ${py(prevControl1Y)} ` +
    `${px(firstX)} ${py(firstY)}`;
  return `${d}Z`;
}
