// Kotlin / JVM standard-library semantics needed by the AndroidX graphics-shapes port
// (Apache License 2.0). Not a port of an upstream graphics-shapes file: these are the small
// pieces of kotlin-stdlib behaviour (require, ranges, binarySearch, Float <-> String) that the
// ported code relies on, kept in one place so the ported files can stay line-by-line.

/** Kotlin's `IllegalArgumentException`. */
export class IllegalArgumentError extends Error {
  override name = 'IllegalArgumentError';
}

/** Kotlin's `NumberFormatException` (a subclass of `IllegalArgumentException`). */
export class NumberFormatError extends IllegalArgumentError {
  override name = 'NumberFormatError';
}

/** Kotlin `require(value) { lazyMessage() }`. */
export function require(value: boolean, lazyMessage: () => string = () => 'Failed requirement.'): asserts value {
  if (!value) throw new IllegalArgumentError(lazyMessage());
}

/** Kotlin `Float.MIN_VALUE` — the smallest *positive* float32 (not the most negative value). */
export const FloatMinValue = 1.401298464324817e-45;

/** Kotlin `Float.MAX_VALUE`. */
export const FloatMaxValue = 3.4028234663852886e38;

/** Kotlin `Float.coerceIn(minimumValue, maximumValue)`. */
export function coerceIn(value: number, minimumValue: number, maximumValue: number): number {
  if (minimumValue > maximumValue) {
    throw new IllegalArgumentError(
      `Cannot coerce value to an empty range: maximum ${maximumValue} is less than minimum ${minimumValue}.`,
    );
  }
  if (value < minimumValue) return minimumValue;
  if (value > maximumValue) return maximumValue;
  return value;
}

/** Kotlin `Float.coerceAtLeast(minimumValue)`. */
export function coerceAtLeast(value: number, minimumValue: number): number {
  return value < minimumValue ? minimumValue : value;
}

/** Kotlin `Float.coerceAtMost(maximumValue)`. */
export function coerceAtMost(value: number, maximumValue: number): number {
  return value > maximumValue ? maximumValue : value;
}

/**
 * Kotlin `List<T>.binarySearchBy(key, selector)`: index of the element whose selected key equals
 * [key], or `-(insertionPoint) - 1` when absent. The list must be sorted by the selector.
 */
export function binarySearchBy<T>(list: readonly T[], key: number, selector: (element: T) => number): number {
  let low = 0;
  let high = list.length - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    const midVal = selector(list[mid]!);
    // compareValues(selector(it), key) for non-NaN floats
    const cmp = midVal < key ? -1 : midVal > key ? 1 : 0;
    if (cmp < 0) low = mid + 1;
    else if (cmp > 0) high = mid - 1;
    else return mid;
  }
  return -(low + 1);
}

const JAVA_FLOAT_LITERAL = /^[+-]?(?:NaN|Infinity|(?:(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)[fFdD]?)$/;

/**
 * Kotlin/JVM `String.toFloat()` (`java.lang.Float.parseFloat`): trims surrounding whitespace and
 * throws [NumberFormatError] for anything that is not a decimal floating-point literal
 * (hexadecimal float literals are not supported). Returns a float64; no float32 rounding.
 */
export function stringToFloat(s: string): number {
  const t = s.trim();
  if (!JAVA_FLOAT_LITERAL.test(t)) {
    throw new NumberFormatError(t.length === 0 ? 'empty String' : `For input string: "${s}"`);
  }
  return Number.parseFloat(t.replace(/[fFdD]$/, ''));
}

/**
 * Kotlin/JVM `Float.toString()` formatting: always has a fractional part ("1.0", not "1"), uses
 * decimal notation for 1e-3 <= |v| < 1e7 and computerized scientific notation ("1.0E-4")
 * otherwise. The digits are the shortest float64 representation (JVM would print the shortest
 * float32 representation; identical for values parsed from short decimal strings).
 */
export function floatToString(v: number): string {
  if (Number.isNaN(v)) return 'NaN';
  if (v === Infinity) return 'Infinity';
  if (v === -Infinity) return '-Infinity';
  if (v === 0) return Object.is(v, -0) ? '-0.0' : '0.0';
  const abs = Math.abs(v);
  if (abs >= 1e-3 && abs < 1e7) {
    const s = String(v);
    return s.includes('.') ? s : `${s}.0`;
  }
  const [mantissa = '', exponent = '0'] = v.toExponential().split('e');
  return `${mantissa.includes('.') ? mantissa : `${mantissa}.0`}E${Number(exponent)}`;
}
