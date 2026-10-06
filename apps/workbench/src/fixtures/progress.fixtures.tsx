import { useState, type ReactNode } from 'react';
import { CircularProgress, LinearProgress, LoadingIndicator, type ProgressThickness, type ProgressType } from '@m3x/react';
import { ForceState, type ForcedProgressFrame } from '@m3x/react/testing';
import manifest from '../../../../figma/progress/manifest.json';
import type { FixtureModule, FixtureVariant } from './types';

/** The kit's indeterminate still frames: active centre-line frames (px) per Step. */
const LINEAR_STEPS: Record<string, [number, number][][]> = {
  'flat-4': [[], [[46.229, 166.826]], [[86.428, 327.622]]],
  'flat-8': [[], [[48, 168]], [[88, 328]]],
  'wave-4': [[], [[46, 166]], [[86, 326]]],
  'wave-8': [[], [[48, 168]], [[88, 328]]],
};
/** Circular Step frames = the determinate 10% / 50% arcs, rotated. */
const CIRCULAR_STEPS: Record<string, ForcedProgressFrame> = { '1': { value: 0.1, rotation: 100 }, '2': { value: 0.5, rotation: -60 } };

const frozen = (frame: ForcedProgressFrame, node: ReactNode) => <ForceState progress={frame}>{node}</ForceState>;
/** The kit's Wave · 8 dp frames without a wave (0% / Step 0) are 12px tall, the others 14. */
const shift = (node: ReactNode) => <div style={{ marginTop: -1, width: '100%' }}>{node}</div>;

/** Live: the real component (no frozen frame) with buttons that change the value. */
function LiveDeterminate({ kind }: { kind: 'linear' | 'circular' }) {
  const [value, setValue] = useState(kind === 'linear' ? 50 : 30);
  const P = kind === 'linear' ? LinearProgress : CircularProgress;
  return (
    <div style={{ display: 'grid', gap: 8, width: '100%' }}>
      <P value={value} aria-label="Upload" />
      <div style={{ position: 'absolute', top: 80, display: 'flex', gap: 8 }}>
        {[30, 50, 80].map((n) => <button key={n} onClick={() => setValue(n)}>{n}%</button>)}
      </div>
    </div>
  );
}

const live: Record<string, FixtureVariant> = {
  'live-linear': { width: 404, height: 12, render: () => <LiveDeterminate kind="linear" /> },
  'live-circular': { width: 40, height: 40, render: () => <LiveDeterminate kind="circular" /> },
  'live-wave-linear': { width: 404, height: 12, render: () => <LinearProgress value={50} type="wave" aria-label="Upload" /> },
  'live-wave-circular': { width: 48, height: 48, render: () => <CircularProgress value={50} type="wave" aria-label="Upload" /> },
  'live-indeterminate': {
    width: 404,
    height: 120,
    render: () => (
      <div style={{ display: 'grid', gap: 16, width: '100%' }}>
        <LinearProgress aria-label="Loading linear" />
        <div style={{ display: 'flex', gap: 16 }}>
          <CircularProgress aria-label="Loading circular" />
          <LoadingIndicator aria-label="Loading shape" />
        </div>
      </div>
    ),
  },
};

const fixture: FixtureModule = {
  component: 'progress',
  variants: Object.fromEntries([
    ...Object.entries(live),
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const p = name.split('-');
      const [w, h] = v.size as [number, number];
      let render: () => ReactNode;
      if (p[0] === 'loading') {
        render = () => frozen({ step: Number(p[1]) - 1 }, <LoadingIndicator container={p[2] === 'container'} aria-label="Loading" />);
      } else if (p[1] === 'indet') {
        const [kind, , type, th, step] = p as [string, string, ProgressType, string, string];
        const t = Number(th) as ProgressThickness;
        if (kind === 'linear') {
          // Step 2's wave was drawn with the determinate 40px segments (Step 1 uses 20px).
          const el = <LinearProgress type={type} thickness={t} wavelength={step === '2' ? 40 : undefined} aria-label="Loading" />;
          const node = frozen({ actives: LINEAR_STEPS[`${type}-${th}`]![Number(step)]!, phase: 0 }, el);
          render = () => (type === 'wave' && t === 8 && h === 12 ? shift(node) : node);
        } else {
          render = () => frozen(CIRCULAR_STEPS[step]!, <CircularProgress type={type} thickness={t} aria-label="Loading" />);
        }
      } else {
        const [kind, type, th, pct] = p as [string, ProgressType, string, string];
        const t = Number(th) as ProgressThickness;
        const value = Number(pct);
        if (kind === 'linear') {
          const node = frozen({ phase: 0 }, <LinearProgress value={value} type={type} thickness={t} aria-label="Progress" />);
          render = () => (type === 'wave' && t === 8 && h === 12 ? shift(node) : node);
        } else {
          render = () => frozen({ phase: value === 100 ? 0 : -5 }, <CircularProgress value={value} type={type} thickness={t} aria-label="Progress" />);
        }
      }
      return [name, { node: v.node, width: w, height: h, render }];
    }),
  ]),
};
export default fixture;
