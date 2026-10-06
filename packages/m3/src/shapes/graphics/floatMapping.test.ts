// Ported from AndroidX graphics-shapes FloatMappingTest.kt (Apache License 2.0).
import { describe, expect, it } from 'vitest';
import { DoubleMapper } from './floatMapping.ts';
import { IllegalArgumentError } from './kotlin.ts';
import { assertEqualish } from './testUtils.ts';

function validateMapping(mapper: DoubleMapper, expectedFunction: (x: number) => number) {
  for (let i = 0; i <= 9999; i++) {
    const source = i / 10000;
    const target = expectedFunction(source);

    assertEqualish(target, mapper.map(source));
    assertEqualish(source, mapper.mapBack(target));
  }
}

describe('FloatMappingTest', () => {
  it('identityMappingTest', () => validateMapping(DoubleMapper.Identity, (it) => it));

  it('simpleMappingTest', () =>
    validateMapping(
      // Map the first half of the start source to the first quarter of the target.
      new DoubleMapper([0, 0], [0.5, 0.25]),
      (x) => (x < 0.5 ? x / 2 : (3 * x - 1) / 2),
    ));

  it('targetWrapsTest', () =>
    validateMapping(
      // mapping applies a "+ 0.5f"
      new DoubleMapper([0, 0.5], [0.1, 0.6]),
      (x) => (x + 0.5) % 1,
    ));

  // @IgnoreJsTarget upstream (float rounding near the mod boundary); passes in this port.
  it('sourceWrapsTest', () =>
    validateMapping(
      // Values on the source wrap (this is still the "+ 0.5f" function)
      new DoubleMapper([0.5, 0], [0.1, 0.6]),
      (x) => (x + 0.5) % 1,
    ));

  it('bothWrapTest', () =>
    validateMapping(
      // Just the identity function
      new DoubleMapper([0.5, 0.5], [0.75, 0.75], [0.1, 0.1], [0.49, 0.49]),
      (it) => it,
    ));

  // @IgnoreJsTarget upstream (float rounding near the mod boundary); passes in this port.
  it('multiplePointTest', () =>
    validateMapping(new DoubleMapper([0.4, 0.2], [0.5, 0.22], [0, 0.8]), (x) => {
      if (x < 0.4) {
        return (0.8 + x) % 1;
      } else if (x < 0.5) {
        return 0.2 + (x - 0.4) / 5;
      } else {
        // maps a change of 0.5 in the source to a change 0.58 in the target, hence the 1.16
        return 0.22 + (x - 0.5) * 1.16;
      }
    }));

  it('targetDoubleWrapThrows', () => {
    expect(() => new DoubleMapper([0.0, 0.0], [0.3, 0.6], [0.6, 0.3], [0.9, 0.9])).toThrow(IllegalArgumentError);
  });

  it('sourceDoubleWrapThrows', () => {
    expect(() => new DoubleMapper([0.0, 0.0], [0.6, 0.3], [0.3, 0.6], [0.9, 0.9])).toThrow(IllegalArgumentError);
  });
});
