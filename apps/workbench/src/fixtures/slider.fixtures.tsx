import { useState, type ReactNode } from 'react';
import { RangeSlider, Slider, type SliderSize } from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/slider/manifest.json';
import type { FixtureModule, FixtureVariant } from './types.ts';

const SIZES: Record<string, SliderSize> = { xs: 'xsmall', s: 'small', m: 'medium', l: 'large', xl: 'xlarge' };
const asForced = (s: string): ForcedState | undefined => (s === 'hovered' || s === 'pressed' ? s : undefined);
/**
 * The Centered / Range sets place their ±50 handles by eye (not at ±50% of the travel), so the
 * fixtures pass the values that put the handle centres where the kit draws them (6 + p·342 px),
 * and the kit's label text through `valueLabel`.
 */
const at = (centre: number) => ((centre - 6) / 342) * 200 - 100;
const CENTERED: Record<string, number> = { '0': 0, m50: at(88), p50: at(266) };
const RANGE: Record<string, [number, number]> = { '0': [at(172), at(182)], m50: [at(76), 0], p50: [0, at(274)] };
/** Pressed range variants: which thumb is pressed (and labelled), and its label. */
const RANGE_PRESSED: Record<string, [number, string]> = { '0': [1, '0'], m50: [0, '-50'], p50: [1, '50'] };
/** The kit's Range · Medium frames are 44px tall (the 52px handles overflow by 4px). */
const shiftUp = (n: ReactNode) => <div style={{ marginTop: -4, width: '100%' }}>{n}</div>;

/** Live: the real component. The node is exactly the kit's Medium 50% frame (354×52); the other
 *  sliders sit below it, outside the compared area. */
function LiveSliders() {
  const [v, setV] = useState(50);
  const [c, setC] = useState(0);
  const [r, setR] = useState<[number, number]>([20, 60]);
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Slider size="medium" value={v} onValueChange={setV} aria-label="Volume" />
      <div style={{ position: 'absolute', top: 120, width: '100%', display: 'grid', gap: 48 }}>
        <Slider size="xsmall" centered min={-50} max={50} value={c} onValueChange={setC} aria-label="Balance" />
        <RangeSlider size="small" value={r} onValueChange={setR} aria-label="Price" />
        <output data-values>{`${v}|${c}|${r.join(',')}`}</output>
      </div>
    </div>
  );
}

/** Live (a11y): per-thumb names, value text from `valueLabel`, a reversed range value, a tick scale over the cap. */
function LiveA11y() {
  return (
    <div style={{ display: 'grid', gap: 48, width: 342 }}>
      <div data-slider="range">
        <RangeSlider
          defaultValue={[80, 20]}
          getAriaLabel={(i) => (i === 0 ? 'Minimum price' : 'Maximum price')}
          valueLabel={(v) => `$${v}`}
        />
      </div>
      <div data-slider="single">
        <Slider defaultValue={40} valueLabel={(v) => `${v}%`} aria-label="Opacity" />
      </div>
      <div data-slider="dense">
        <Slider defaultValue={500} max={1000} ticks aria-label="Dense" />
      </div>
    </div>
  );
}

const fixture: FixtureModule = {
  component: 'slider',
  variants: Object.fromEntries([
    ['live', { width: 354, height: 52, padding: 64, render: () => <LiveSliders /> } satisfies FixtureVariant],
    ['live-a11y', { width: 342, height: 240, padding: 64, render: () => <LiveA11y /> } satisfies FixtureVariant],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [set, o, sz, st, val] = name.split('-') as [string, string, string, string, string];
      const [w, h] = v.size as [number, number];
      const size = SIZES[sz]!;
      const orientation = o === 'v' ? 'vertical' : 'horizontal';
      const disabled = st === 'disabled';
      let render: () => ReactNode;
      if (set === 'std') {
        render = () => (
          <ForceState state={asForced(st)}>
            <Slider size={size} orientation={orientation} value={Number(val)} disabled={disabled} aria-label="Slider" />
          </ForceState>
        );
      } else if (set === 'cen') {
        render = () => (
          <ForceState state={asForced(st)}>
            <Slider
              centered
              size={size}
              orientation={orientation}
              min={-100}
              max={100}
              step={0.0001}
              value={CENTERED[val]}
              valueLabel={() => (val === '0' ? '0' : '50')}
              disabled={disabled}
              aria-label="Slider"
            />
          </ForceState>
        );
      } else {
        const [pressedThumb, text] = RANGE_PRESSED[val]!;
        const node = (
          <ForceState state={asForced(st)} thumb={st === 'pressed' ? pressedThumb : 1}>
            <RangeSlider
              size={size}
              min={-100}
              max={100}
              step={0.0001}
              value={RANGE[val]}
              valueLabel={() => text}
              disabled={disabled}
              aria-label="Range"
            />
          </ForceState>
        );
        render = () => (sz === 'm' ? shiftUp(node) : node);
      }
      return [name, { node: v.node, width: w, height: h, padding: 64, render }];
    }),
  ]),
};
export default fixture;
