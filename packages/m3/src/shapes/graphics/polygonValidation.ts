// Ported from AndroidX graphics-shapes PolygonValidation.kt (Apache License 2.0).

import type { Feature } from './features.ts';
import { RoundedPolygon } from './roundedPolygon.ts';

// TODO: b/372000685 b/372003785 b/372004969
//  Make class public as soon as all validations
//  are implemented and mention in [RoundedPolygon] constructor

/**
 * Utility class to fix invalid [RoundedPolygon]s that will otherwise break [Morph]s in one way or
 * another, as [RoundedPolygon] assumes correct input. Correct input meaning:
 * - Closed geometry
 * - Clockwise orientation of points
 * - No self-intersections
 * - No holes
 * - Single Polygon
 *
 * @internal
 */
export class PolygonValidator {
  // TODO: b/372000685 b/372003785 b/372004969
  // Update docs when other validations are implemented
  /**
   * Validates whether this [RoundedPolygon]'s orientation is clockwise and fixes it if necessary.
   *
   * @param polygon The [RoundedPolygon] to validate
   * @return A new [RoundedPolygon] with fixed orientation, or the same [RoundedPolygon] as given
   *   when it was already valid
   */
  static fix(polygon: RoundedPolygon): RoundedPolygon {
    let result = polygon;

    if (PolygonValidator.isCWOriented(polygon)) {
      // Passed clockwise validation!
    } else {
      // Polygon is oriented anti-clockwise, fixing orientation...
      result = PolygonValidator.fixCWOrientation(polygon);
    }

    return result;
  }

  private static isCWOriented(polygon: RoundedPolygon): boolean {
    let signedArea = 0.0;

    for (let i = 0; i < polygon.cubics.length; i++) {
      const cubic = polygon.cubics[i]!;
      signedArea += (cubic.anchor1X - cubic.anchor0X) * (cubic.anchor1Y + cubic.anchor0Y);
    }

    return signedArea < 0;
  }

  private static fixCWOrientation(polygon: RoundedPolygon): RoundedPolygon {
    const reversedFeatures: Feature[] = [];
    // Persist first feature to stay a Corner
    reversedFeatures.push(polygon.features[0]!.reversed());

    for (let i = polygon.features.length - 1; i >= 1; i--) {
      reversedFeatures.push(polygon.features[i]!.reversed());
    }

    return new RoundedPolygon(reversedFeatures, polygon.center);
  }
}
