// Ported from AndroidX graphics-shapes Format.kt (+ Format.jvmAndAndroid.kt) (Apache License 2.0).
//
// Upstream uses this only in debug logging. The JVM/Android actual (`"%.3f".format(this)`) is
// ported here rather than the non-JVM one (`toString()`).

export function toStringWithLessPrecision(value: number): string {
  return value.toFixed(3);
}
