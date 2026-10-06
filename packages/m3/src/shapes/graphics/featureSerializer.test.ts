// Ported from AndroidX graphics-shapes FeatureSerializerTest.kt (Apache License 2.0).
import { describe, expect, it } from 'vitest';
import { Cubic } from './cubic.ts';
import { FeatureSerializer } from './featureSerializer.ts';
import { Corner, Edge } from './features.ts';
import { IllegalArgumentError } from './kotlin.ts';
import { assertFeaturesEqualish } from './testUtils.ts';

describe('FeatureSerializerTest', () => {
  it('throwsForEmptyParse', () => {
    const serialized = '';

    expect(() => FeatureSerializer.parse(serialized)).toThrow(IllegalArgumentError);
  });

  it('throwsForBlankParse', () => {
    const serialized = '                    ';

    expect(() => FeatureSerializer.parse(serialized)).toThrow(IllegalArgumentError);
  });

  it('throwsForOnlyVersionNoTags', () => {
    const serialized = 'V1                    ';

    expect(() => FeatureSerializer.parse(serialized)).toThrow(IllegalArgumentError);
  });

  it('throwsForInsufficientCoordinateCount', () => {
    const serialized0 = 'V1c';
    const serialized1 = 'V1o1,1,2,2';
    const serialized2 = 'V1o1,1,2,2,3,3,4,4,5,5,6,6';
    const serialized3 = 'V1o1,1,2,2,3,3,4,4n4,4';

    expect(() => FeatureSerializer.parse(serialized0)).toThrow(IllegalArgumentError);
    expect(() => FeatureSerializer.parse(serialized1)).toThrow(IllegalArgumentError);
    expect(() => FeatureSerializer.parse(serialized2)).toThrow(IllegalArgumentError);
    expect(() => FeatureSerializer.parse(serialized3)).toThrow(IllegalArgumentError);
  });

  it('throwsForWrongSeparator', () => {
    const serialized = 'V1o1 1 2 2 3 3 4 4';

    expect(() => FeatureSerializer.parse(serialized)).toThrow(IllegalArgumentError);
  });

  it('throwsForNonNumbers', () => {
    const serialized = 'V1o1,1,two,2,3,three,4,4';

    expect(() => FeatureSerializer.parse(serialized)).toThrow(IllegalArgumentError);
  });

  it('throwsWhenTagNotFirst', () => {
    const serialized = 'V11,1,2,2,3,4,4,4o';

    expect(() => FeatureSerializer.parse(serialized)).toThrow(IllegalArgumentError);
  });

  it('throwsWhenCoordinatesAndTagSeparated', () => {
    const serialized = 'V1o,1,1,2,2,3,4,4,4';

    expect(() => FeatureSerializer.parse(serialized)).toThrow(IllegalArgumentError);
  });

  it('treatsUnknownFeatureTagAsEdge', () => {
    const serialized = 'V1 h1,1,2,2,3,3,4,4';
    const expected = new Edge([new Cubic(1, 1, 2, 2, 3, 3, 4, 4)]);

    assertFeaturesEqualish(expected, FeatureSerializer.parse(serialized)[0]!);
  });

  it('treatsNoVersionAsV1', () => {
    const serializedNoVersion = 'n1,1,2,2,3,3,4,4x4,4,5,5,6,6,7,7o7,7,8,8,9,9,10,10';
    const serializedV1 = 'V1 n1,1,2,2,3,3,4,4x4,4,5,5,6,6,7,7o7,7,8,8,9,9,10,10';

    const noVersionParse = FeatureSerializer.parse(serializedNoVersion);
    const v1Parse = FeatureSerializer.parse(serializedV1);

    expect(v1Parse.length).toBe(noVersionParse.length);
    for (let index = 0; index < v1Parse.length; index++) {
      assertFeaturesEqualish(v1Parse[index]!, noVersionParse[index]!);
    }
  });

  it('treatsUnknownVersionsAsV1', () => {
    const serializedV999 = 'V999 n1,1,2,2,3,3,4,4x4,4,5,5,6,6,7,7o7,7,8,8,9,9,10,10';
    const serializedV1 = 'V1 n1,1,2,2,3,3,4,4x4,4,5,5,6,6,7,7o7,7,8,8,9,9,10,10';

    const v999Parse = FeatureSerializer.parse(serializedV999);
    const v1Parse = FeatureSerializer.parse(serializedV1);

    expect(v1Parse.length).toBe(v999Parse.length);

    for (let index = 0; index < v1Parse.length; index++) {
      assertFeaturesEqualish(v1Parse[index]!, v999Parse[index]!);
    }
  });

  it('ignoresExcessSpaces', () => {
    const serialized = 'V1       n  1 ,  1  ,2  ,  2 , 3  ,  3  , 4 , 4   ';
    const expected = new Edge([new Cubic(1, 1, 2, 2, 3, 3, 4, 4)]);

    assertFeaturesEqualish(expected, FeatureSerializer.parse(serialized)[0]!);
  });

  it('parsesEdgeWithSingleCubic', () => {
    const serialized = 'V1 n1,1,2,2,3,3,4,4';
    const expected = new Edge([new Cubic(1, 1, 2, 2, 3, 3, 4, 4)]);

    assertFeaturesEqualish(expected, FeatureSerializer.parse(serialized)[0]!);
  });

  it('parsesEdgeWithSingleCubicAndFloats', () => {
    const serialized = 'V1n1.1,1.1,2.12,2.12,3.123,3.123,4.1234,4.1234';
    const expected = new Edge([new Cubic(1.1, 1.1, 2.12, 2.12, 3.123, 3.123, 4.1234, 4.1234)]);

    assertFeaturesEqualish(expected, FeatureSerializer.parse(serialized)[0]!);
  });

  it('parsesConvexCornerWithSingleCubic', () => {
    const serialized = 'V1x1,1,2,2,3,3,4,4';
    const expected = new Corner([new Cubic(1, 1, 2, 2, 3, 3, 4, 4)], true);

    assertFeaturesEqualish(expected, FeatureSerializer.parse(serialized)[0]!);
  });

  it('parsesConcaveCornerWithSingleCubic', () => {
    const serialized = 'V1o1,1,2,2,3,3,4,4';
    const expected = new Corner([new Cubic(1, 1, 2, 2, 3, 3, 4, 4)], false);

    assertFeaturesEqualish(expected, FeatureSerializer.parse(serialized)[0]!);
  });

  it('parsesEdgeWithMultipleCubics', () => {
    const serialized = 'V1n1,1,2,2,3,3,4,4,5,5,6,6,7,7';
    const expected = new Edge([new Cubic(1, 1, 2, 2, 3, 3, 4, 4), new Cubic(4, 4, 5, 5, 6, 6, 7, 7)]);

    const actual = FeatureSerializer.parse(serialized);

    assertFeaturesEqualish(expected, actual[0]!);
  });

  it('parsesConvexCornerWithMultipleCubics', () => {
    const serialized = 'V1x1,1,2,2,3,3,4,4,5,5,6,6,7,7';
    const expected = new Corner([new Cubic(1, 1, 2, 2, 3, 3, 4, 4), new Cubic(4, 4, 5, 5, 6, 6, 7, 7)], true);

    const actual = FeatureSerializer.parse(serialized);

    assertFeaturesEqualish(expected, actual[0]!);
  });

  it('parsesConcaveCornerWithMultipleCubics', () => {
    const serialized = 'V1o1,1,2,2,3,3,4,4,5,5,6,6,7,7';
    const expected = new Corner([new Cubic(1, 1, 2, 2, 3, 3, 4, 4), new Cubic(4, 4, 5, 5, 6, 6, 7, 7)], false);

    const actual = FeatureSerializer.parse(serialized);

    assertFeaturesEqualish(expected, actual[0]!);
  });

  it('parsesConvexCornerWithALotOfCubics', () => {
    const serialized = 'V1x1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,14,14,15,15,16,16';
    const expected = new Corner(
      [
        new Cubic(1, 1, 2, 2, 3, 3, 4, 4),
        new Cubic(4, 4, 5, 5, 6, 6, 7, 7),
        new Cubic(7, 7, 8, 8, 9, 9, 10, 10),
        new Cubic(10, 10, 11, 11, 12, 12, 13, 13),
        new Cubic(13, 13, 14, 14, 15, 15, 16, 16),
      ],
      true,
    );

    const actual = FeatureSerializer.parse(serialized);

    assertFeaturesEqualish(expected, actual[0]!);
  });

  it('parsesMultipleFeaturesWithMultipleCubics', () => {
    const serialized = 'V1n1,1,2,2,3,3,4,4x4,4,5,5,6,6,7,7o7,7,8,8,9,9,10,10';
    const expected = [
      new Edge([new Cubic(1, 1, 2, 2, 3, 3, 4, 4)]),
      new Corner([new Cubic(4, 4, 5, 5, 6, 6, 7, 7)], true),
      new Corner([new Cubic(7, 7, 8, 8, 9, 9, 10, 10)], false),
    ];

    const actual = FeatureSerializer.parse(serialized);

    expect(actual.length).toBe(expected.length);
    for (let index = 0; index < expected.length; index++) {
      assertFeaturesEqualish(expected[index]!, actual[index]!);
    }
  });

  it('serializesEdgeWithSingleCubic', () => {
    const expected = 'V1n1,1,2,2,3,3,4,4';
    const feature = FeatureSerializer.parse(expected);
    const actual = FeatureSerializer.serialize(feature);

    expect(actual).toBe(expected);
  });

  // @IgnoreJsTarget / @IgnoreWasmTarget upstream (JS Float.toString differs); passes here because
  // the port formats numbers like Kotlin/JVM (see kotlin.ts floatToString).
  it('serializesEdgeWithSingleCubicAndFloats', () => {
    const expected = 'V1n1.1,1.1,2.12,2.12,3.123,3.123,4.1234,4.1234';
    const feature = FeatureSerializer.parse(expected);
    const actual = FeatureSerializer.serialize(feature);

    expect(actual).toBe(expected);
  });

  it('serializesConvexCornerWithSingleCubic', () => {
    const expected = 'V1x1,1,2,2,3,3,4,4';
    const feature = FeatureSerializer.parse(expected);
    const actual = FeatureSerializer.serialize(feature);

    expect(actual).toBe(expected);
  });

  it('serializesConcaveCornerWithSingleCubic', () => {
    const expected = 'V1o1,1,2,2,3,3,4,4';
    const feature = FeatureSerializer.parse(expected);
    const actual = FeatureSerializer.serialize(feature);

    expect(actual).toBe(expected);
  });

  it('serializesEdgeWithMultipleCubics', () => {
    const expected = 'V1n1,1,2,2,3,3,4,4,5,5,6,6,7,7';
    const feature = FeatureSerializer.parse(expected);
    const actual = FeatureSerializer.serialize(feature);

    expect(actual).toBe(expected);
  });

  it('serializesConvexCornerWithMultipleCubics', () => {
    const expected = 'V1x1,1,2,2,3,3,4,4,5,5,6,6,7,7';
    const feature = FeatureSerializer.parse(expected);
    const actual = FeatureSerializer.serialize(feature);

    expect(actual).toBe(expected);
  });

  it('serializesConcaveCornerWithMultipleCubics', () => {
    const expected = 'V1o1,1,2,2,3,3,4,4,5,5,6,6,7,7';
    const feature = FeatureSerializer.parse(expected);
    const actual = FeatureSerializer.serialize(feature);

    expect(actual).toBe(expected);
  });

  // @IgnoreJsTarget upstream (JS prints 10f as "10", which removeTrailingZeroes turns into "1").
  it('serializesConvexCornerWithALotOfCubics', () => {
    const expected = 'V1x1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,14,14,15,15,16,16';
    const feature = FeatureSerializer.parse(expected);
    const actual = FeatureSerializer.serialize(feature);

    expect(actual).toBe(expected);
  });

  // @IgnoreJsTarget upstream (same reason as above).
  it('serializesMultipleFeaturesWithMultipleCubics', () => {
    const expected = 'V1n1,1,2,2,3,3,4,4x4,4,5,5,6,6,7,7o7,7,8,8,9,9,10,10';
    const features = FeatureSerializer.parse(expected);
    const actual = FeatureSerializer.serialize(features);

    expect(actual).toBe(expected);
    for (let index = 0; index < expected.length; index++) {
      expect(actual[index]).toBe(expected[index]);
    }
  });
});
