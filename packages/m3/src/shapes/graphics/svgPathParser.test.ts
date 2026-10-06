// Ported from AndroidX graphics-shapes SvgPathParserTest.kt (Apache License 2.0).
import { describe, expect, it } from 'vitest';
import { Cubic } from './cubic.ts';
import { SvgPathParser } from './svgPathParser.ts';
import { assertCubicListsEqualish } from './testUtils.ts';

function parsingIsEqualish(pathA: string, pathB: string) {
  const pathAResult = SvgPathParser.parseCubics(pathA);
  const pathBResult = SvgPathParser.parseCubics(pathB);

  assertCubicListsEqualish(pathAResult, pathBResult);
}

function parsingMatches(path: string, expected: readonly Cubic[]) {
  const actual = SvgPathParser.parseCubics(path);

  assertCubicListsEqualish(expected, actual);
}

/** Kotlin `"""...""".trimMargin()` */
function trimMargin(s: string): string {
  return s
    .split('\n')
    .filter((line, i, all) => !((i === 0 || i === all.length - 1) && line.trim() === ''))
    .map((line) => line.replace(/^\s*\|/, ''))
    .join('\n');
}

describe('SVGParserTest', () => {
  it('handlesEmptyInput', () => {
    const path = '';
    const expected: Cubic[] = [];
    parsingMatches(path, expected);
  });

  it('parsesBothParameterSplitsEqually', () => {
    const commaPath = 'M 10,10 L 30,10 L 20,30 z';
    const spacePath = 'M 10 10 L 30 10 L 20 30 z';

    parsingIsEqualish(commaPath, spacePath);
  });

  it('parsesWhitespacesEqually', () => {
    const spaced = 'M 10,10  L    30,10    L 20,30 z';
    const touching = 'M10,10L30,10L20,30z';

    parsingIsEqualish(spaced, touching);
  });

  it('parsesAbsoluteMultiplePaths', () => {
    const path = 'M 10,10 30,10 20,30 z M 20,20 50,10 40,30 z';
    const expected = [
      Cubic.straightLine(10, 10, 30, 10),
      Cubic.straightLine(30, 10, 20, 30),
      Cubic.straightLine(20, 30, 10, 10),
      Cubic.straightLine(20, 20, 50, 10),
      Cubic.straightLine(50, 10, 40, 30),
      Cubic.straightLine(40, 30, 20, 20),
    ];
    parsingMatches(path, expected);
  });

  it('parsesRelativeMultiplePaths', () => {
    const absolute = 'M 10,10 30,10 20,30 z M 20,20 50,10 40,30 z';
    const relative = 'm 10,10 20,0 -10,20 z m 10,10, 30,-10, -10,20 z';

    parsingIsEqualish(absolute, relative);
  });

  it('parsesMultipleAbsoluteMoveTos', () => {
    const path = 'M 10,10 30,10 20,30 z';
    const expected = [
      Cubic.straightLine(10, 10, 30, 10),
      Cubic.straightLine(30, 10, 20, 30),
      Cubic.straightLine(20, 30, 10, 10),
    ];
    parsingMatches(path, expected);
  });

  it('parsesMultipleRelativeMoveTosLikeAbsolute', () => {
    const absolute = 'M 10,10 30,10 20,30 z';
    const relative = 'm 10,10 20,0 -10,20 z';

    parsingIsEqualish(absolute, relative);
  });

  it('parsesAbsoluteLine', () => {
    const path = 'M 10,10 L 30,10 20,30 z';
    const expected = [
      Cubic.straightLine(10, 10, 30, 10),
      Cubic.straightLine(30, 10, 20, 30),
      Cubic.straightLine(20, 30, 10, 10),
    ];
    parsingMatches(path, expected);
  });

  it('parsesRelativeLineLikeAbsolute', () => {
    const absolute = 'M 10,10 L 30,10 20,30 z';
    const relative = 'm 10,10 l 20,0 l -10,20 z';

    parsingIsEqualish(absolute, relative);
  });

  it('parsesNegativeFloatingPointParameters', () => {
    const path = 'M-10.5555,10.5L-30.5555,10.5L-20.5555,30z';
    const expected = [
      Cubic.straightLine(-10.5555, 10.5, -30.5555, 10.5),
      Cubic.straightLine(-30.5555, 10.5, -20.5555, 30),
      Cubic.straightLine(-20.5555, 30, -10.5555, 10.5),
    ];
    parsingMatches(path, expected);
  });

  it('parsesAbsoluteHorizontalLikeLine', () => {
    const linePath = 'M 10,10 L 30,10 L 40,10 z';
    const horizontalEquivalent = 'M 10,10 H 30 40 z';

    parsingIsEqualish(linePath, horizontalEquivalent);
  });

  it('parsesRelativeHorizontalLikeAbsolute', () => {
    const linePath = 'M 10,10 L 30,10 L 40,10 z';
    const horizontalEquivalent = 'M 10,10 h 20 10 z';

    parsingIsEqualish(linePath, horizontalEquivalent);
  });

  it('parsesAbsoluteVerticalLikeLine', () => {
    const linePath = 'M 10,10 L 10,30 L 10,40 z';
    const verticalEquivalent = 'M 10,10 V 30 40 z';

    parsingIsEqualish(linePath, verticalEquivalent);
  });

  it('parsesRelativeVerticalLikeAbsolute', () => {
    const linePath = 'M 10,10 L 10,30 L 10,40 z';
    const verticalEquivalent = 'M 10,10 v 20 10 z';

    parsingIsEqualish(linePath, verticalEquivalent);
  });

  it('parsesAbsoluteCubics', () => {
    const path = 'M 0,0 C 10,10 30,20, 10,10 C 23, 23 48,40 20,20 z';
    const expected = [
      new Cubic(Float64Array.of(0, 0, 10, 10, 30, 20, 10, 10)),
      new Cubic(Float64Array.of(10, 10, 23, 23, 48, 40, 20, 20)),
      Cubic.straightLine(20, 20, 0, 0),
    ];

    parsingMatches(path, expected);
  });

  it('parsesRelativeCubicsLikeAbsolute', () => {
    const absolute = 'M 0,0 C 10,10 30,20, 10,10 C 23, 23 48,40 20,20 z';
    const relativeEquivalent = 'M 0,0 c 10,10 30,20, 10,10 c 13, 13 38,30 10,10 z';

    parsingIsEqualish(absolute, relativeEquivalent);
  });

  it('parsesAbsoluteSmoothCurveLikeCubic', () => {
    const smooth = 'M 0,0 C 0,10 10,10 10,0 S 20,-10 20,0 z';
    const cubicEquivalent = 'M 0,0 C 0,10 10,10 10,0 C 10,-10 20,-10 20,0 z';

    parsingIsEqualish(smooth, cubicEquivalent);
  });

  it('parsesRelativeSmoothCurveLikeAbsolute', () => {
    const absolute = 'M 0,0 C 0,10 10,10 10,0 S 20,-10 20,0 z';
    const relativeEquivalent = 'M 0,0 C 0,10 10,10 10,0 s 10,-10 10,0 z';

    parsingIsEqualish(absolute, relativeEquivalent);
  });

  it('parsesSmoothCurveWithCurrentPositionIfNoPredecessor', () => {
    const path = 'M 10,10 S 20,-10, 20,0';
    const expected = [new Cubic(Float64Array.of(10, 10, 10, 10, 20, -10, 20, 0))];
    parsingMatches(path, expected);
  });

  it('parsesAbsoluteQuadraticCurveLikeCubic', () => {
    const qPath = 'M 0,0 Q 5,10 10,0 z';
    const curveEquivalent = 'M 0,0 C 5,10 5,10 10,0 z';

    parsingIsEqualish(qPath, curveEquivalent);
  });

  it('parsesRelativeQuadraticCurveLikeAbsolute', () => {
    const absolute = 'M 10,10 Q 15,20 20,10 z';
    const relative = 'M 10,10 q 5, 10 10,0 z';

    parsingIsEqualish(absolute, relative);
  });

  it('parsesAbsoluteSmoothQuadraticLikeCubic', () => {
    const tPath = 'M 0,0 Q 5,10 10,0 T 20,0 z';
    const curveEquivalent = 'M 0,0 Q 5,10 10,0 C 15,-10 15,-10 20,0 z';

    parsingIsEqualish(tPath, curveEquivalent);
  });

  it('parsesRelativeSmoothQuadraticLikeAbsolute', () => {
    const absolute = 'M 0,0 Q 5,10 10,0 T 20,0 z';
    const relative = 'M 0,0 Q 5,10 10,0 t 10,0 z';

    parsingIsEqualish(absolute, relative);
  });

  it('parsesSmoothQuadraticWithCurrentPositionIfNoPredecessor', () => {
    const path = 'M 10,10 T 20,0';
    const expected = [new Cubic(Float64Array.of(10, 10, 10, 10, 10, 10, 20, 0))];
    parsingMatches(path, expected);
  });

  // @IgnoreJsTarget upstream ("Fails with Expected <5>, actual <4>"): the arc segment count comes
  // from float32 rounding, which the port keeps in ArcConverter (see svgPathParser.ts).
  it('parsesAbsoluteArc', () => {
    // A 1/4 segment of a pie chart
    const path = 'M300,200 v-150 A150,150 0 0,0 150,200 z';
    const expected = [
      Cubic.straightLine(300, 200, 300, 50),
      new Cubic(Float64Array.of(300, 50, 273.67145, 50, 247.80118, 56.93192, 225, 70.09619)),
      new Cubic(Float64Array.of(225, 70.09619, 202.19882, 83.26046, 183.26047, 102.198814, 170.09619, 125)),
      new Cubic(Float64Array.of(170.09619, 125, 156.93192, 147.80118, 150, 173.67145, 150, 200)),
      Cubic.straightLine(150, 200, 300, 200),
    ];

    parsingMatches(path, expected);
  });

  it('parsesRelativeArcLikeAbsolute', () => {
    // A 1/4 segment of a pie chart
    const absolute = 'M300,200 v-150 A150,150 0 0,0 150,200 z';
    const relative = 'M300,200 v-150 a150,150 0 0,0 -150,150 z';

    parsingIsEqualish(absolute, relative);
  });

  it('parsesMaterialThreeFavorite', () => {
    // https://fonts.google.com/icons?selected=Material+Symbols+Outlined:favorite:FILL
    const path = trimMargin(`
            |m 480 -120
            |l -58 -52
            |q -101 -91 -167 -157
            |T 150 -447.5
            |Q 111 -500 95.5 -544
            |T 80 -634 q 0 -94 63 -157
            |t 157 -63
            |q 52 0 99 22
            |t 81 62
            |q 34 -40 81 -62
            |t 99 -22
            |q 94 0 157 63
            |t 63 157
            |q 0 46 -15.5 90
            |T 810 -447.5
            |Q 771 -395 705 -329
            |T 538 -172
            |l -58 52
            |Z
            `);
    const result = SvgPathParser.parseCubics(path);

    expect(19).toBe(result.length);
  });

  it('parsesMaterialThreeEco', () => {
    // https://fonts.google.com/icons?selected=Material+Symbols+Outlined:eco:FILL
    const path = trimMargin(`
            |M 450 -80
            |q -33 0 -66.5 -7.5
            |T 315 -109
            |q 12 -121 70 -226
            |t 149 -185
            |q -110 56 -190.5 148
            |T 231 -162
            |q -4 -3 -7.5 -6.5
            |L 216 -176
            |q -47 -47 -71.5 -105
            |T 120 -402
            |q 0 -68 27 -130
            |t 75 -110
            |q 81 -81 210 -105.5
            |t 362 -4.5
            |q 18 239 -6 364.5
            |T 684 -182
            |q -49 49 -109.5 75.5
            |T 450 -80
            |Z
            `);

    const result = SvgPathParser.parseCubics(path);

    expect(19).toBe(result.length);
  });
});
