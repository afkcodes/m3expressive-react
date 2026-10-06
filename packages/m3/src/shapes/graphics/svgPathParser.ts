// Ported from AndroidX graphics-shapes SvgPathParser.kt (Apache License 2.0).
//
// Float32 note: the ArcConverter below keeps upstream's explicit `.toFloat()` conversions (and the
// float32 `sweep * 4` product that feeds ceil()) as Math.fround, because they decide the arc
// segment count: a 90° arc gets 3 segments on JVM/Android but 2 in plain float64 (upstream's
// `parsesAbsoluteArc` test depends on it, and is @IgnoreJsTarget upstream for exactly this reason).
// All other (implicit) float32 arithmetic stays float64, as in the rest of the port.

import { Cubic } from './cubic.ts';
import type { Feature } from './features.ts';
import { detectFeatures } from './featureDetector.ts';
import { IllegalArgumentError, stringToFloat } from './kotlin.ts';
import { Point } from './point.ts';
import { PolygonValidator } from './polygonValidation.ts';
import { RoundedPolygon } from './roundedPolygon.ts';
import { DistanceEpsilon } from './utils.ts';

// TODO: b/370041761 Remove manual parsing and low level operations when multiplatform SVG parser
// exists

/**
 * Converts each command (beside move to) of a svg path to a list of [Cubic]s by calling
 * [SvgPathParser.parseCubics]. Any svg path complying to the specification found at
 * https://www.w3.org/TR/SVG/paths.html is supported. Parameters can either be split by whitespace
 * or by commas. There is very little error handling, so use with valid paths and consult the debug
 * logs for unexpected [Cubic] objects.
 */
export class SvgPathParser {
  /**
   * Converts an SVG path string into a list of [Feature] objects. The polygon described in the
   * path should be representing a single, closed, non-self-intersecting polygon. Otherwise, either
   * an error is thrown or the [Morph] that the polygon is used in will be distorted.
   *
   * **Note:**
   * - Only the first shape within the SVG path is processed. Subsequent shapes or holes are
   *   ignored.
   * - This method is primarily intended for development and testing purposes. For production use,
   *   serialize and parse the [Feature] objects with [FeatureSerializer].
   *
   * @param svgPath The SVG path string, typically extracted from the `d` attribute of an SVG
   *   element.
   * @return A list of [Feature] objects that can be used to create [RoundedPolygon]s
   * @throws IllegalArgumentError - if the SVG path is invalid or represents a non-closed or
   *   self-intersecting polygon.
   */
  static parseFeatures(svgPath: string): readonly Feature[] {
    const parsedCubics = SvgPathParser.parseCubics(svgPath);

    const continuous = (first: Cubic, second: Cubic): boolean =>
      Math.abs(second.anchor0X - first.anchor1X) < DistanceEpsilon &&
      Math.abs(second.anchor0Y - first.anchor1Y) < DistanceEpsilon;

    // TODO: b/376039669 add parameter to choose shape
    let continuousCubicsCount = parsedCubics.length;
    for (let index = 0; index < parsedCubics.length - 1; index++) {
      const current = parsedCubics[index]!;
      const next = parsedCubics[index + 1]!;
      if (!continuous(current, next)) {
        continuousCubicsCount = index;
        break;
      }
    }
    const firstShapeCubics = parsedCubics.slice(0, continuousCubicsCount);

    const parsedPolygon = RoundedPolygon.fromFeatures(detectFeatures(firstShapeCubics));
    const fixedPolygon = PolygonValidator.fix(parsedPolygon);

    return fixedPolygon.features;
  }

  /**
   * Converts the path elements of svgPath to their cubic counterparts. svgPath corresponds to the
   * data found in the path's "d" property.
   *
   * @internal
   */
  static parseCubics(svgPath: string): Cubic[] {
    const paths = svgPath.split(/(?=[mM])/).filter((it) => it.trim().length > 0);
    let current = new Point(0, 0);

    // The input may contain multiple move to commands, in which later ones can be
    // relative. Therefore we need to finish one path before we parse the following,
    // so we have the correct start positions
    const result: Cubic[] = [];
    paths.forEach((path) => {
      const commandStrings = path.split(/(?=[a-zA-Z])/).filter((it) => it.trim().length > 0);

      // Paths start with move commands that define the starting position
      // Subsequent pairs are equal to line commands
      const moveToCommand = Command.parse(commandStrings[0]!, current);
      current = moveToCommand.start.plus(new Point(moveToCommand.get(0), moveToCommand.get(1)));

      const parser = new SvgPathParser(current);

      // Move to command already handled, handle subsequent line commands (if any)
      parser.parseCommand(moveToCommand.asLine(current));
      commandStrings.slice(1).forEach((it) => {
        parser.parseCommand(Command.parse(it, parser.position));
      });

      result.push(...parser.cubics);
    });
    return result;
  }

  private readonly cubics: Cubic[] = [];

  private readonly start: Point;

  private constructor(startPosition: Point) {
    this.start = startPosition;
  }

  private get position(): Point {
    const last = this.cubics[this.cubics.length - 1];
    return last !== undefined ? new Point(last.anchor1X, last.anchor1Y) : this.start;
  }

  private previousCommand: Command = new Command('I', false, [], 0);

  private get reflectedPreviousControlPoint(): Point {
    const last = this.cubics[this.cubics.length - 1]!;
    return this.position.plus(this.position.minus(new Point(last.control1X, last.control1Y)));
  }

  private parseCommand(command: Command): void {
    if (command.isCloseCommand) {
      this.cubics.push(this.lineToCubic(this.position, this.start));
      return;
    }

    // A single SVG command can contain multiple parameter pairs. Split them into atomics.
    // (Kotlin's `step` requires a positive step.)
    if (command.paramsCount <= 0) {
      throw new IllegalArgumentError(`Step must be positive, was: ${command.paramsCount}.`);
    }
    for (let i = 0; i <= command.parameters.length - 1; i += command.paramsCount) {
      const atomicCommand = command.chunk(i, this.position);

      this.parseAtomicCommand(atomicCommand);
    }
  }

  private parseAtomicCommand(atomicCommand: Command): void {
    if (atomicCommand.isLineCommand) this.parseLine(atomicCommand);
    else if (atomicCommand.isCurveCommand) this.parseCurve(atomicCommand);
    else if (atomicCommand.isArcCommand) this.parseArc(atomicCommand);
    // else: Ignoring unknown command

    this.previousCommand = atomicCommand;
  }

  private parseLine(command: Command): void {
    const addLineTo = (endPoint: Point) => this.cubics.push(this.lineToCubic(this.position, endPoint));

    switch (command.letter) {
      case 'l':
        addLineTo(command.xy(0, 1));
        break;
      case 'h':
        addLineTo(new Point(command.x(0), command.start.y));
        break;
      case 'v':
        addLineTo(new Point(command.start.x, command.y(0)));
        break;
    }
  }

  private parseCurve(command: Command): void {
    const addCurveWith = (c0: Point, c1: Point, a1: Point) =>
      this.cubics.push(this.curveToCubic(this.position, c0, c1, a1));

    switch (command.letter) {
      case 'c':
        addCurveWith(command.xy(0, 1), command.xy(2, 3), command.xy(4, 5));
        break;
      case 's': {
        const c0 = this.previousCommand.isBezierCommand ? this.reflectedPreviousControlPoint : this.position;

        addCurveWith(c0, command.xy(0, 1), command.xy(2, 3));
        break;
      }
      case 'q':
        addCurveWith(command.xy(0, 1), command.xy(0, 1), command.xy(2, 3));
        break;
      case 't': {
        const c0 = this.previousCommand.isQuadraticCurveCommand ? this.reflectedPreviousControlPoint : this.position;

        addCurveWith(c0, c0, command.xy(0, 1));
        break;
      }
    }
  }

  private parseArc(command: Command): void {
    const target = command.xy(5, 6);

    this.cubics.push(
      ...ArcConverter.arcToCubics(
        this.position.x,
        this.position.y,
        target.x,
        target.y,
        command.get(0),
        command.get(1),
        command.get(2),
        command.get(3) !== 0,
        command.get(4) !== 0,
      ),
    );
  }

  private curveToCubic(a0: Point, c0: Point, c1: Point, a1: Point): Cubic {
    return new Cubic(Float64Array.of(a0.x, a0.y, c0.x, c0.y, c1.x, c1.y, a1.x, a1.y));
  }

  private lineToCubic(start: Point, end: Point): Cubic {
    return Cubic.straightLine(start.x, start.y, end.x, end.y);
  }
}

const commandToParamsCount: Readonly<Record<string, number>> = {
  m: 2,
  l: 2,
  h: 1,
  v: 1,
  c: 6,
  s: 4,
  q: 4,
  t: 2,
  a: 7,
};

class Command {
  readonly letter: string;
  readonly isRelative: boolean;
  readonly parameters: readonly number[];
  readonly paramsCount: number;
  readonly start: Point;
  readonly isLineCommand: boolean;
  readonly isBezierCommand: boolean;
  readonly isQuadraticCurveCommand: boolean;
  readonly isCurveCommand: boolean;
  readonly isArcCommand: boolean;
  readonly isCloseCommand: boolean;

  constructor(
    letter: string,
    isRelative: boolean,
    parameters: readonly number[],
    paramsCount: number,
    start: Point = new Point(0, 0),
  ) {
    this.letter = letter;
    this.isRelative = isRelative;
    this.parameters = parameters;
    this.paramsCount = paramsCount;
    this.start = start;
    this.isLineCommand = letter === 'l' || letter === 'h' || letter === 'v';
    this.isBezierCommand = letter === 'c' || letter === 's';
    this.isQuadraticCurveCommand = letter === 'q' || letter === 't';
    this.isCurveCommand = letter === 'c' || letter === 's' || letter === 'q' || letter === 't';
    this.isArcCommand = letter === 'a';
    this.isCloseCommand = letter === 'z';
  }

  static parse(input: string, currentPosition: Point): Command {
    const letter = input[0]!;
    const isRelative = letter !== letter.toUpperCase() && letter === letter.toLowerCase();
    const parameters = input
      .slice(1)
      .split(/[ ,]/)
      .filter((it) => it.trim().length > 0)
      .map((it) => stringToFloat(it.trim()));
    const lower = letter.toLowerCase();
    return new Command(
      lower,
      isRelative,
      parameters,
      commandToParamsCount[lower] ?? 0,
      isRelative ? currentPosition : new Point(0, 0),
    );
  }

  /** Kotlin `operator fun get(i)`: throws when out of bounds. */
  get(i: number): number {
    const value = this.parameters[i];
    if (value === undefined) throw new RangeError(`Index ${i} out of bounds for length ${this.parameters.length}`);
    return value;
  }

  x(i: number): number {
    const coordinate = this.get(i);
    return this.isRelative ? this.start.x + coordinate : coordinate;
  }

  y(i: number): number {
    const coordinate = this.get(i);
    return this.isRelative ? this.start.y + coordinate : coordinate;
  }

  xy(i: number, j: number): Point {
    const coordinates = new Point(this.get(i), this.get(j));
    return this.isRelative ? this.start.plus(coordinates) : coordinates;
  }

  chunk(index: number, currentPosition: Point): Command {
    // sliceArray(index until index + paramsCount) throws when the range exceeds the array
    if (index + this.paramsCount > this.parameters.length) {
      throw new RangeError(
        `Range [${index}, ${index + this.paramsCount}) out of bounds for length ${this.parameters.length}`,
      );
    }
    return new Command(
      this.letter,
      this.isRelative,
      this.parameters.slice(index, index + this.paramsCount),
      this.paramsCount,
      currentPosition,
    );
  }

  asLine(newStart: Point): Command {
    const convertedParameters = this.parameters.slice(this.paramsCount);
    return new Command('l', this.isRelative, convertedParameters, 2, newStart);
  }
}

/**
 * The following code has been copied and slightly adjusted from graphics/PathParser to remove the
 * Path dependency.
 *
 * TODO: b/370041761 Remove when multiplatform SVG parser with arc support exists
 */
class ArcConverter {
  static arcToCubics(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    a: number,
    b: number,
    theta: number,
    isMoreThanHalf: boolean,
    isPositiveArc: boolean,
  ): Cubic[] {
    /* Convert rotation angle from degrees to radians */
    const thetaD = (theta / 180) * Math.PI;
    /* Pre-compute rotation matrix entries */
    const cosTheta = Math.cos(thetaD);
    const sinTheta = Math.sin(thetaD);
    /* Transform (x0, y0) and (x1, y1) into unit space */
    /* using (inverse) rotation, followed by (inverse) scale */
    const x0p = (x0 * cosTheta + y0 * sinTheta) / a;
    const y0p = (-x0 * sinTheta + y0 * cosTheta) / b;
    const x1p = (x1 * cosTheta + y1 * sinTheta) / a;
    const y1p = (-x1 * sinTheta + y1 * cosTheta) / b;

    /* Compute differences and averages */
    const dx = x0p - x1p;
    const dy = y0p - y1p;
    const xm = (x0p + x1p) / 2;
    const ym = (y0p + y1p) / 2;
    /* Solve for intersecting unit circles */
    const dsq = dx * dx + dy * dy;
    if (dsq === 0.0) {
      return []; /* Points are coincident */
    }
    const disc = 1.0 / dsq - 1.0 / 4.0;
    if (disc < 0.0) {
      const adjust = Math.fround(Math.sqrt(dsq) / 1.99999);
      /* Points are too far apart */
      return ArcConverter.arcToCubics(x0, y0, x1, y1, a * adjust, b * adjust, theta, isMoreThanHalf, isPositiveArc);
    }
    const s = Math.sqrt(disc);
    const sdx = s * dx;
    const sdy = s * dy;
    let cx: number;
    let cy: number;
    if (isMoreThanHalf === isPositiveArc) {
      cx = xm - sdy;
      cy = ym + sdx;
    } else {
      cx = xm + sdy;
      cy = ym - sdx;
    }

    const eta0 = Math.atan2(y0p - cy, x0p - cx);

    const eta1 = Math.atan2(y1p - cy, x1p - cx);

    let sweep = eta1 - eta0;
    if (isPositiveArc !== sweep >= 0) {
      if (sweep > 0) {
        sweep -= 2 * Math.PI;
      } else {
        sweep += 2 * Math.PI;
      }
    }

    cx *= a;
    cy *= b;
    const tcx = cx;
    cx = cx * cosTheta - cy * sinTheta;
    cy = tcx * sinTheta + cy * cosTheta;

    return ArcConverter.arcToBezier(
      Math.fround(cx),
      Math.fround(cy),
      a,
      b,
      x0,
      y0,
      Math.fround(thetaD),
      Math.fround(eta0),
      Math.fround(sweep),
    );
  }

  /**
   * Converts an arc to cubic Bezier segments and records them in p.
   *
   * @param cx The x coordinate center of the ellipse
   * @param cy The y coordinate center of the ellipse
   * @param rx The radius of the ellipse in the horizontal direction
   * @param ry The radius of the ellipse in the vertical direction
   * @param e1x E(eta1) x coordinate of the starting point of the arc
   * @param e1y E(eta2) y coordinate of the starting point of the arc
   * @param theta The angle that the ellipse bounding rectangle makes with horizontal plane
   * @param start The start angle of the arc on the ellipse
   * @param sweep The angle (positive or negative) of the sweep of the arc on the ellipse
   */
  private static arcToBezier(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    e1x: number,
    e1y: number,
    theta: number,
    start: number,
    sweep: number,
  ): Cubic[] {
    const cubics: Cubic[] = [];

    // Taken from equations at: http://spaceroots.org/documents/ellipse/node8.html
    // and http://www.spaceroots.org/documents/ellipse/node22.html
    // Maximum of 45 degrees per cubic Bezier segment
    let ce1x = e1x;
    let ce1y = e1y;
    // Kotlin: `sweep * 4` is a float32 product, then promoted to Double for `/ PI`.
    const numSegments = Math.trunc(Math.ceil(Math.abs(Math.fround(sweep * 4) / Math.PI)));

    let eta1 = start;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    const cosEta1 = Math.cos(eta1);
    const sinEta1 = Math.sin(eta1);
    let ep1x = -rx * cosTheta * sinEta1 - ry * sinTheta * cosEta1;
    let ep1y = -rx * sinTheta * sinEta1 + ry * cosTheta * cosEta1;

    const anglePerSegment = sweep / numSegments;
    for (let i = 0; i < numSegments; i++) {
      const eta2 = eta1 + anglePerSegment;
      const sinEta2 = Math.sin(eta2);
      const cosEta2 = Math.cos(eta2);
      const e2x = cx + rx * cosTheta * cosEta2 - ry * sinTheta * sinEta2;
      const e2y = cy + rx * sinTheta * cosEta2 + ry * cosTheta * sinEta2;
      const ep2x = -rx * cosTheta * sinEta2 - ry * sinTheta * cosEta2;
      const ep2y = -rx * sinTheta * sinEta2 + ry * cosTheta * cosEta2;
      const tanDiff2 = Math.tan((eta2 - eta1) / 2);
      const alpha = (Math.sin(eta2 - eta1) * (Math.sqrt(4 + 3 * tanDiff2 * tanDiff2) - 1)) / 3;
      const q1x = ce1x + alpha * ep1x;
      const q1y = ce1y + alpha * ep1y;
      const q2x = e2x - alpha * ep2x;
      const q2y = e2y - alpha * ep2y;

      cubics.push(new Cubic(ce1x, ce1y, q1x, q1y, q2x, q2y, e2x, e2y));
      eta1 = eta2;
      ce1x = e2x;
      ce1y = e2y;
      ep1x = ep2x;
      ep1y = ep2y;
    }
    return cubics;
  }
}
