// Ported from AndroidX compose-material3 MaterialShapes.kt (Apache License 2.0).
//
// Geometry only: the Compose glue (toPath/toShape, Outline) is not ported. Each shape is the exact
// upstream RoundedPolygon definition, built lazily on first access and `.normalized()` into the
// (0,0)-(1,1) square, as upstream does. Use `toSvgPath(materialShapes.x.cubics, size)` to render.

import { CornerRounding, Point, RoundedPolygon, type PointTransformer } from './graphics/index.ts';
import * as Shapes from './graphics/shapes.ts';

/** Shape names, in the order of the M3 Expressive shape set. */
export const materialShapeNames = [
  'circle',
  'square',
  'slanted',
  'arch',
  'fan',
  'arrow',
  'semiCircle',
  'oval',
  'pill',
  'triangle',
  'diamond',
  'clamShell',
  'pentagon',
  'gem',
  'verySunny',
  'sunny',
  'cookie4Sided',
  'cookie6Sided',
  'cookie7Sided',
  'cookie9Sided',
  'cookie12Sided',
  'ghostish',
  'clover4Leaf',
  'clover8Leaf',
  'burst',
  'softBurst',
  'boom',
  'softBoom',
  'flower',
  'puffy',
  'puffyDiamond',
  'pixelCircle',
  'pixelTriangle',
  'bun',
  'heart',
] as const;

export type MaterialShapeName = (typeof materialShapeNames)[number];

/**
 * The 2D part of androidx.compose.ui.graphics.Matrix, enough for `rotateZ`, `scale` and
 * `map(Offset)` on a fresh matrix (no perspective, so `map`'s pZ is 1). Compose computes
 * `sin(r).toFloat()` / `cos(r).toFloat()`; this keeps them float64 (see graphics/utils.ts note).
 */
class Matrix {
  // this[0,0], this[0,1], this[1,0], this[1,1], this[3,0], this[3,1]
  private v00 = 1;
  private v01 = 0;
  private v10 = 0;
  private v11 = 1;
  private v30 = 0;
  private v31 = 0;

  rotateZ(degrees: number): this {
    const r = degrees * (Math.PI / 180.0);
    const s = Math.sin(r);
    const c = Math.cos(r);

    const a00 = this.v00;
    const a10 = this.v10;
    const v00 = c * a00 + s * a10;
    const v10 = -s * a00 + c * a10;

    const a01 = this.v01;
    const a11 = this.v11;
    const v01 = c * a01 + s * a11;
    const v11 = -s * a01 + c * a11;

    this.v00 = v00;
    this.v01 = v01;
    this.v10 = v10;
    this.v11 = v11;
    return this;
  }

  scale(x: number = 1, y: number = 1): this {
    this.v00 *= x;
    this.v01 *= x;
    this.v10 *= y;
    this.v11 *= y;
    return this;
  }

  /** `androidx.compose.material3.internal.transformed(matrix)` maps each point with this. */
  readonly transformer: PointTransformer = (x, y) => [
    this.v00 * x + this.v10 * y + this.v30,
    this.v01 * x + this.v11 * y + this.v31,
  ];
}

// Cache various roundings for use below
const cornerRound15 = new CornerRounding(0.15);
const cornerRound20 = new CornerRounding(0.2);
const cornerRound30 = new CornerRounding(0.3);
const cornerRound50 = new CornerRounding(0.5);
const cornerRound100 = new CornerRounding(1);

const rotateNeg45 = new Matrix().rotateZ(-45).transformer;
const rotateNeg90 = new Matrix().rotateZ(-90).transformer;
const rotateNeg135 = new Matrix().rotateZ(-135).transformer;

/** `PointNRound(o: Offset, r: CornerRounding = CornerRounding.Unrounded)` */
interface PointNRound {
  readonly o: Point;
  readonly r: CornerRounding;
}

function PointNRound(o: Point, r: CornerRounding = CornerRounding.Unrounded): PointNRound {
  return { o, r };
}

function Offset(x: number, y: number): Point {
  return new Point(x, y);
}

/** Upstream's private builders (`MaterialShapes.circle()`, `.square()`, ...), un-normalized. */
const builders = {
  circle(numVertices: number = 10): RoundedPolygon {
    return Shapes.circle({ numVertices });
  },

  square(): RoundedPolygon {
    return Shapes.rectangle({ width: 1, height: 1, rounding: cornerRound30 });
  },

  slanted(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.926, 0.97), new CornerRounding(0.189, 0.811)),
        PointNRound(Offset(-0.021, 0.967), new CornerRounding(0.187, 0.057)),
      ],
      2,
    );
  },

  arch(): RoundedPolygon {
    return RoundedPolygon.fromNumVertices(4, {
      perVertexRounding: [cornerRound100, cornerRound100, cornerRound20, cornerRound20],
    }).transformed(rotateNeg135);
  },

  fan(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(1.004, 1.0), new CornerRounding(0.148, 0.417)),
        PointNRound(Offset(0.0, 1.0), new CornerRounding(0.151)),
        PointNRound(Offset(0.0, -0.003), new CornerRounding(0.148)),
        PointNRound(Offset(0.978, 0.02), new CornerRounding(0.803)),
      ],
      1,
    );
  },

  arrow(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.5, 0.892), new CornerRounding(0.313)),
        PointNRound(Offset(-0.216, 1.05), new CornerRounding(0.207)),
        PointNRound(Offset(0.499, -0.16), new CornerRounding(0.215, 1.0)),
        PointNRound(Offset(1.225, 1.06), new CornerRounding(0.211)),
      ],
      1,
    );
  },

  semiCircle(): RoundedPolygon {
    return Shapes.rectangle({
      width: 1.6,
      height: 1,
      perVertexRounding: [cornerRound20, cornerRound20, cornerRound100, cornerRound100],
    });
  },

  oval(): RoundedPolygon {
    const m = new Matrix().scale(1, 0.64).transformer;
    return Shapes.circle().transformed(m).transformed(rotateNeg45);
  },

  pill(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.961, 0.039), new CornerRounding(0.426)),
        PointNRound(Offset(1.001, 0.428)),
        PointNRound(Offset(1.0, 0.609), new CornerRounding(1.0)),
      ],
      2,
      undefined,
      true,
    );
  },

  triangle(): RoundedPolygon {
    return RoundedPolygon.fromNumVertices(3, { rounding: cornerRound20 }).transformed(rotateNeg90);
  },

  diamond(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.5, 1.096), new CornerRounding(0.151, 0.524)),
        PointNRound(Offset(0.04, 0.5), new CornerRounding(0.159)),
      ],
      2,
    );
  },

  clamShell(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.171, 0.841), new CornerRounding(0.159)),
        PointNRound(Offset(-0.02, 0.5), new CornerRounding(0.14)),
        PointNRound(Offset(0.17, 0.159), new CornerRounding(0.159)),
      ],
      2,
    );
  },

  pentagon(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.5, -0.009), new CornerRounding(0.172)),
        PointNRound(Offset(1.03, 0.365), new CornerRounding(0.164)),
        PointNRound(Offset(0.828, 0.97), new CornerRounding(0.169)),
      ],
      1,
      undefined,
      true,
    );
  },

  gem(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.499, 1.023), new CornerRounding(0.241, 0.778)),
        PointNRound(Offset(-0.005, 0.792), new CornerRounding(0.208)),
        PointNRound(Offset(0.073, 0.258), new CornerRounding(0.228)),
        PointNRound(Offset(0.433, -0.0), new CornerRounding(0.491)),
      ],
      1,
      undefined,
      true,
    );
  },

  sunny(): RoundedPolygon {
    return Shapes.star(8, { innerRadius: 0.8, rounding: cornerRound15 });
  },

  verySunny(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.5, 1.08), new CornerRounding(0.085)),
        PointNRound(Offset(0.358, 0.843), new CornerRounding(0.085)),
      ],
      8,
    );
  },

  cookie4(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(1.237, 1.236), new CornerRounding(0.258)),
        PointNRound(Offset(0.5, 0.918), new CornerRounding(0.233)),
      ],
      4,
    );
  },

  cookie6(): RoundedPolygon {
    // 6-point cookie
    return customPolygon(
      [
        PointNRound(Offset(0.723, 0.884), new CornerRounding(0.394)),
        PointNRound(Offset(0.5, 1.099), new CornerRounding(0.398)),
      ],
      6,
    );
  },

  cookie7(): RoundedPolygon {
    // 7-point cookie
    return Shapes.star(7, { innerRadius: 0.75, rounding: cornerRound50 }).transformed(rotateNeg90);
  },

  cookie9(): RoundedPolygon {
    return Shapes.star(9, { innerRadius: 0.8, rounding: cornerRound50 }).transformed(rotateNeg90);
  },

  cookie12(): RoundedPolygon {
    return Shapes.star(12, { innerRadius: 0.8, rounding: cornerRound50 }).transformed(rotateNeg90);
  },

  ghostish(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.5, 0), new CornerRounding(1.0)),
        PointNRound(Offset(1, 0), new CornerRounding(1.0)),
        PointNRound(Offset(1, 1.14), new CornerRounding(0.254, 0.106)),
        PointNRound(Offset(0.575, 0.906), new CornerRounding(0.253)),
      ],
      1,
      undefined,
      true,
    );
  },

  clover4(): RoundedPolygon {
    return customPolygon(
      [PointNRound(Offset(0.5, 0.074)), PointNRound(Offset(0.725, -0.099), new CornerRounding(0.476))],
      4,
      undefined,
      true,
    );
  },

  clover8(): RoundedPolygon {
    return customPolygon(
      [PointNRound(Offset(0.5, 0.036)), PointNRound(Offset(0.758, -0.101), new CornerRounding(0.209))],
      8,
    );
  },

  burst(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.5, -0.006), new CornerRounding(0.006)),
        PointNRound(Offset(0.592, 0.158), new CornerRounding(0.006)),
      ],
      12,
    );
  },

  softBurst(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.193, 0.277), new CornerRounding(0.053)),
        PointNRound(Offset(0.176, 0.055), new CornerRounding(0.053)),
      ],
      10,
    );
  },

  boom(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.457, 0.296), new CornerRounding(0.007)),
        PointNRound(Offset(0.5, -0.051), new CornerRounding(0.007)),
      ],
      15,
    );
  },

  softBoom(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.733, 0.454)),
        PointNRound(Offset(0.839, 0.437), new CornerRounding(0.532)),
        PointNRound(Offset(0.949, 0.449), new CornerRounding(0.439, 1.0)),
        PointNRound(Offset(0.998, 0.478), new CornerRounding(0.174)),
      ],
      16,
      undefined,
      true,
    );
  },

  flower(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.37, 0.187)),
        PointNRound(Offset(0.416, 0.049), new CornerRounding(0.381)),
        PointNRound(Offset(0.479, 0.001), new CornerRounding(0.095)),
      ],
      8,
      undefined,
      true,
    );
  },

  puffy(): RoundedPolygon {
    const m = new Matrix().scale(1, 0.742).transformer;
    return customPolygon(
      [
        PointNRound(Offset(0.5, 0.053)),
        PointNRound(Offset(0.545, -0.04), new CornerRounding(0.405)),
        PointNRound(Offset(0.67, -0.035), new CornerRounding(0.426)),
        PointNRound(Offset(0.717, 0.066), new CornerRounding(0.574)),
        PointNRound(Offset(0.722, 0.128)),
        PointNRound(Offset(0.777, 0.002), new CornerRounding(0.36)),
        PointNRound(Offset(0.914, 0.149), new CornerRounding(0.66)),
        PointNRound(Offset(0.926, 0.289), new CornerRounding(0.66)),
        PointNRound(Offset(0.881, 0.346)),
        PointNRound(Offset(0.94, 0.344), new CornerRounding(0.126)),
        PointNRound(Offset(1.003, 0.437), new CornerRounding(0.255)),
      ],
      2,
      undefined,
      true,
    ).transformed(m);
  },

  puffyDiamond(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.87, 0.13), new CornerRounding(0.146)),
        PointNRound(Offset(0.818, 0.357)),
        PointNRound(Offset(1.0, 0.332), new CornerRounding(0.853)),
      ],
      4,
      undefined,
      true,
    );
  },

  pixelCircle(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.5, 0.0)),
        PointNRound(Offset(0.704, 0.0)),
        PointNRound(Offset(0.704, 0.065)),
        PointNRound(Offset(0.843, 0.065)),
        PointNRound(Offset(0.843, 0.148)),
        PointNRound(Offset(0.926, 0.148)),
        PointNRound(Offset(0.926, 0.296)),
        PointNRound(Offset(1.0, 0.296)),
      ],
      2,
      undefined,
      true,
    );
  },

  pixelTriangle(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.11, 0.5)),
        PointNRound(Offset(0.113, 0.0)),
        PointNRound(Offset(0.287, 0.0)),
        PointNRound(Offset(0.287, 0.087)),
        PointNRound(Offset(0.421, 0.087)),
        PointNRound(Offset(0.421, 0.17)),
        PointNRound(Offset(0.56, 0.17)),
        PointNRound(Offset(0.56, 0.265)),
        PointNRound(Offset(0.674, 0.265)),
        PointNRound(Offset(0.675, 0.344)),
        PointNRound(Offset(0.789, 0.344)),
        PointNRound(Offset(0.789, 0.439)),
        PointNRound(Offset(0.888, 0.439)),
      ],
      1,
      undefined,
      true,
    );
  },

  bun(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.796, 0.5)),
        PointNRound(Offset(0.853, 0.518), new CornerRounding(1)),
        PointNRound(Offset(0.992, 0.631), new CornerRounding(1)),
        PointNRound(Offset(0.968, 1.0), new CornerRounding(1)),
      ],
      2,
      undefined,
      true,
    );
  },

  heart(): RoundedPolygon {
    return customPolygon(
      [
        PointNRound(Offset(0.5, 0.268), new CornerRounding(0.016)),
        PointNRound(Offset(0.792, -0.066), new CornerRounding(0.958)),
        PointNRound(Offset(1.064, 0.276), new CornerRounding(1.0)),
        PointNRound(Offset(0.501, 0.946), new CornerRounding(0.129)),
      ],
      1,
      undefined,
      true,
    );
  },
};

function doRepeat(points: readonly PointNRound[], reps: number, center: Point, mirroring: boolean): PointNRound[] {
  if (mirroring) {
    const result: PointNRound[] = [];
    const angles = points.map((it) => angleDegrees(it.o.minus(center)));
    const distances = points.map((it) => it.o.minus(center).getDistance());
    const actualReps = reps * 2;
    const sectionAngle = 360 / actualReps;
    for (let it = 0; it < actualReps; it++) {
      for (let index = 0; index < points.length; index++) {
        const i = it % 2 === 0 ? index : points.length - 1 - index;
        if (i > 0 || it % 2 === 0) {
          const a = toRadians(
            sectionAngle * it + (it % 2 === 0 ? angles[i]! : sectionAngle - angles[i]! + 2 * angles[0]!),
          );
          const finalPoint = new Point(Math.cos(a), Math.sin(a)).times(distances[i]!).plus(center);
          result.push(PointNRound(finalPoint, points[i]!.r));
        }
      }
    }
    return result;
  } else {
    const np = points.length;
    const result: PointNRound[] = [];
    for (let it = 0; it < np * reps; it++) {
      const point = rotateDegrees(points[it % np]!.o, (Math.trunc(it / np) * 360) / reps, center);
      result.push(PointNRound(point, points[it % np]!.r));
    }
    return result;
  }
}

function rotateDegrees(offset: Point, angle: number, center: Point = new Point(0, 0)): Point {
  const a = toRadians(angle);
  const off = offset.minus(center);
  return new Point(off.x * Math.cos(a) - off.y * Math.sin(a), off.x * Math.sin(a) + off.y * Math.cos(a)).plus(center);
}

function toRadians(degrees: number): number {
  return (degrees / 360) * 2 * Math.PI;
}

function angleDegrees(offset: Point): number {
  return (Math.atan2(offset.y, offset.x) * 180) / Math.PI;
}

function customPolygon(
  pnr: readonly PointNRound[],
  reps: number,
  center: Point = new Point(0.5, 0.5),
  mirroring: boolean = false,
): RoundedPolygon {
  const actualPoints = doRepeat(pnr, reps, center, mirroring);
  const vertices = new Float64Array(actualPoints.length * 2);
  for (let ix = 0; ix < vertices.length; ix++) {
    const it = actualPoints[Math.trunc(ix / 2)]!.o;
    vertices[ix] = ix % 2 === 0 ? it.x : it.y;
  }
  return RoundedPolygon.fromVertices(vertices, {
    perVertexRounding: actualPoints.map((p) => p.r),
    centerX: center.x,
    centerY: center.y,
  });
}

const factories: Readonly<Record<MaterialShapeName, () => RoundedPolygon>> = {
  circle: () => builders.circle(),
  square: builders.square,
  slanted: builders.slanted,
  arch: builders.arch,
  fan: builders.fan,
  arrow: builders.arrow,
  semiCircle: builders.semiCircle,
  oval: builders.oval,
  pill: builders.pill,
  triangle: builders.triangle,
  diamond: builders.diamond,
  clamShell: builders.clamShell,
  pentagon: builders.pentagon,
  gem: builders.gem,
  verySunny: builders.verySunny,
  sunny: builders.sunny,
  cookie4Sided: builders.cookie4,
  cookie6Sided: builders.cookie6,
  cookie7Sided: builders.cookie7,
  cookie9Sided: builders.cookie9,
  cookie12Sided: builders.cookie12,
  ghostish: builders.ghostish,
  clover4Leaf: builders.clover4,
  clover8Leaf: builders.clover8,
  burst: builders.burst,
  softBurst: builders.softBurst,
  boom: builders.boom,
  softBoom: builders.softBoom,
  flower: builders.flower,
  puffy: builders.puffy,
  puffyDiamond: builders.puffyDiamond,
  pixelCircle: builders.pixelCircle,
  pixelTriangle: builders.pixelTriangle,
  bun: builders.bun,
  heart: builders.heart,
};

const cache: Partial<Record<MaterialShapeName, RoundedPolygon>> = {};

/**
 * The 35 predefined Material 3 Expressive shapes (`MaterialShapes` in Compose Material 3), each a
 * normalized [RoundedPolygon] (fits the (0,0)-(1,1) square, centered). Built lazily on first
 * access and cached, like upstream.
 */
export const materialShapes: Readonly<Record<MaterialShapeName, RoundedPolygon>> = Object.defineProperties(
  {} as Record<MaterialShapeName, RoundedPolygon>,
  Object.fromEntries(
    materialShapeNames.map((name) => [
      name,
      {
        enumerable: true,
        get: (): RoundedPolygon => (cache[name] ??= factories[name]().normalized()),
      },
    ]),
  ),
);
