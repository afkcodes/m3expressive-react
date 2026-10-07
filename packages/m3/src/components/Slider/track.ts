/*
 * The slider's track geometry as CSS lengths (Figma kit "Sliders": Standard / Centered / Range).
 * The handle centre travels from 6px to length − 6px; tracks stop 6px short of it (the gap is
 * part of the handle's 12px stride); inner corners are 2px; inactive tracks end in a 4px stop dot.
 */
import { sliderVars } from './slider.stylex.ts';

export type SliderMode = 'standard' | 'centered' | 'range';

/** Track corner radius next to a handle (the outer ends use the size's radius). */
export const INNER_RADIUS = 2;

/** `fraction` of the handle's travel (track length − 12px), as a CSS length. */
export const along = (fraction: number) => `${fraction} * (100% - 12px)`;

/** Half the handle's current width (4px, 2px while pressed / focused), as a CSS length. */
const halfHandle = (thumb: number) => `${thumb === 0 ? sliderVars.hw0 : sliderVars.hw1} / 2`;

/** One track piece along the main axis: CSS start / end offsets and size, corner radii, stop dots. */
export interface TrackSpan {
  start: string | null;
  end: string | null;
  size: string;
  role: 'active' | 'inactive';
  startRadius: number;
  endRadius: number;
  dotStart?: boolean;
  dotEnd?: boolean;
}

/** The track pieces for the handles at `fractions` (0…1 of the range, one per thumb). */
export function trackSpans(mode: SliderMode, fractions: readonly number[], outerRadius: number): TrackSpan[] {
  const spans: TrackSpan[] = [];
  if (mode === 'standard') {
    const value = fractions[0]!;
    spans.push({
      start: '0px',
      end: null,
      size: `calc(${along(value)} - ${halfHandle(0)})`,
      role: 'active',
      startRadius: outerRadius,
      endRadius: INNER_RADIUS,
    });
    spans.push({
      start: null,
      end: '0px',
      size: `calc(${along(1 - value)} - ${halfHandle(0)})`,
      role: 'inactive',
      startRadius: INNER_RADIUS,
      endRadius: outerRadius,
      dotEnd: true,
    });
  } else if (mode === 'centered') {
    const value = fractions[0]!;
    spans.push({
      start: '0px',
      end: null,
      size: `min(calc(${along(value)} - ${halfHandle(0)}), calc(50% - 2px))`,
      role: 'inactive',
      startRadius: outerRadius,
      endRadius: INNER_RADIUS,
      dotStart: true,
    });
    if (value < 0.5)
      spans.push({
        start: `calc(12px + ${along(value)} + ${halfHandle(0)})`,
        end: null,
        size: `calc(50% - 14px - ${along(value)} - ${halfHandle(0)})`,
        role: 'active',
        startRadius: INNER_RADIUS,
        endRadius: INNER_RADIUS,
      });
    if (value > 0.5)
      spans.push({
        start: 'calc(50% + 2px)',
        end: null,
        size: `calc(${along(value)} - ${halfHandle(0)} - 50% - 2px)`,
        role: 'active',
        startRadius: INNER_RADIUS,
        endRadius: INNER_RADIUS,
      });
    spans.push({
      start: null,
      end: '0px',
      size: `min(calc(${along(1 - value)} - ${halfHandle(0)}), calc(50% - 2px))`,
      role: 'inactive',
      startRadius: INNER_RADIUS,
      endRadius: outerRadius,
      dotEnd: true,
    });
  } else {
    const [low, high] = [fractions[0]!, fractions[1]!];
    spans.push({
      start: '0px',
      end: null,
      size: `calc(${along(low)} - ${halfHandle(0)})`,
      role: 'inactive',
      startRadius: outerRadius,
      endRadius: INNER_RADIUS,
      dotStart: true,
    });
    spans.push({
      start: `calc(12px + ${along(low)} + ${halfHandle(0)})`,
      end: null,
      size: `calc(${along(high - low)} - ${halfHandle(0)} - ${halfHandle(1)} - 12px)`,
      role: 'active',
      startRadius: INNER_RADIUS,
      endRadius: INNER_RADIUS,
    });
    spans.push({
      start: null,
      end: '0px',
      size: `calc(${along(1 - high)} - ${halfHandle(1)})`,
      role: 'inactive',
      startRadius: INNER_RADIUS,
      endRadius: outerRadius,
      dotEnd: true,
    });
  }
  return spans;
}

/** The active part of the track (fractions), where stop indicators take the on-active colour. */
export function activeRange(mode: SliderMode, fractions: readonly number[]): [number, number] {
  if (mode === 'range') return [fractions[0]!, fractions[1]!];
  if (mode === 'centered') return [Math.min(0.5, fractions[0]!), Math.max(0.5, fractions[0]!)];
  return [0, fractions[0]!];
}
