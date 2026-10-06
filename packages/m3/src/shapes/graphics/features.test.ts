// Ported from AndroidX graphics-shapes FeaturesTest.kt (Apache License 2.0).
import { describe, expect, it } from 'vitest';
import { Cubic } from './cubic.ts';
import { Corner, Edge, Feature } from './features.ts';
import { IllegalArgumentError } from './kotlin.ts';
import { assertFeaturesEqualish } from './testUtils.ts';

describe('FeaturesTest', () => {
  it('cannotBuildEmptyFeatures', () => {
    expect(() => Feature.buildConvexCorner([])).toThrow(IllegalArgumentError);
    expect(() => Feature.buildConcaveCorner([])).toThrow(IllegalArgumentError);
    expect(() => Feature.buildIgnorableFeature([])).toThrow(IllegalArgumentError);
  });

  it('cannotBuildNonContinuousFeatures', () => {
    const cubic1 = Cubic.straightLine(0, 0, 1, 1);
    const cubic2 = Cubic.straightLine(10, 10, 11, 11);

    expect(() => Feature.buildConvexCorner([cubic1, cubic2])).toThrow(IllegalArgumentError);
    expect(() => Feature.buildConcaveCorner([cubic1, cubic2])).toThrow(IllegalArgumentError);
    expect(() => Feature.buildIgnorableFeature([cubic1, cubic2])).toThrow(IllegalArgumentError);
  });

  it('buildsConcaveCorner', () => {
    const cubic = Cubic.straightLine(0, 0, 1, 0);
    const actual = Feature.buildConcaveCorner([cubic]);
    const expected = new Corner([cubic], false);
    assertFeaturesEqualish(expected, actual);
  });

  it('buildsConvexCorner', () => {
    const cubic = Cubic.straightLine(0, 0, 1, 0);
    const actual = Feature.buildConvexCorner([cubic]);
    const expected = new Corner([cubic], true);
    assertFeaturesEqualish(expected, actual);
  });

  it('buildsEdge', () => {
    const cubic = Cubic.straightLine(0, 0, 1, 0);
    const actual = Feature.buildEdge(cubic);
    const expected = new Edge([cubic]);
    assertFeaturesEqualish(expected, actual);
  });

  it('buildsIgnorableAsEdge', () => {
    const cubic = Cubic.straightLine(0, 0, 1, 0);
    const actual = Feature.buildIgnorableFeature([cubic]);
    const expected = new Edge([cubic]);
    assertFeaturesEqualish(expected, actual);
  });
});
