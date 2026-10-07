import { useState, type ReactNode } from 'react';
import {
  CircularProgress,
  LinearProgress,
  LoadingIndicator,
  type ProgressThickness,
  type ProgressShape,
} from '@m3x/react';
import { ForceState, type ForcedProgressFrame } from '@m3x/react/testing';
import manifest from '../../../../figma/progress/manifest.json';
import type { FixtureModule, FixtureVariant } from './types.ts';

/** The kit names the shapes Flat / Wave. */
const kitShape = (name: string): ProgressShape => (name === 'wave' ? 'wavy' : 'flat');

/** The kit's indeterminate still frames: active centre-line frames (px) per Step (keys: kit names). */
const LINEAR_STEPS: Record<string, [number, number][][]> = {
  'flat-4': [[], [[46.229, 166.826]], [[86.428, 327.622]]],
  'flat-8': [[], [[48, 168]], [[88, 328]]],
  'wave-4': [[], [[46, 166]], [[86, 326]]],
  'wave-8': [[], [[48, 168]], [[88, 328]]],
};
/** Circular Step frames = the determinate 10% / 50% arcs, rotated. */
const CIRCULAR_STEPS: Record<string, ForcedProgressFrame> = {
  '1': { value: 0.1, rotation: 100 },
  '2': { value: 0.5, rotation: -60 },
};

const frozen = (frame: ForcedProgressFrame, node: ReactNode) => <ForceState progress={frame}>{node}</ForceState>;
/** The kit's Wave · 8 dp frames without a wave (0% / Step 0) are 12px tall, the others 14. */
const shift = (node: ReactNode) => <div style={{ marginTop: -1, width: '100%' }}>{node}</div>;

/** Live: the real component (no frozen frame) with buttons that change the value. */
function LiveDeterminate({ kind }: { kind: 'linear' | 'circular' }) {
  const [value, setValue] = useState(kind === 'linear' ? 50 : 30);
  const P = kind === 'linear' ? LinearProgress : CircularProgress;
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <P value={value} aria-label="Upload" />
      <div style={{ position: 'absolute', top: 'calc(100% + 40px)', display: 'flex', gap: 8 }}>
        {[30, 50, 80].map((n) => (
          <button key={n} onClick={() => setValue(n)}>
            {n}%
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Motion review / live tests: flat and wavy, linear and circular, sharing one value. The buttons
 * cover the motion edges: gaps opening from 0, the amplitude thresholds (10% / 95%), the stop dot.
 */
function LiveMotion() {
  const [value, setValue] = useState(Number(new URLSearchParams(location.search).get('v') ?? 50));
  return (
    <div style={{ display: 'grid', gap: 16, width: '100%' }}>
      <LinearProgress value={value} aria-label="Linear flat" />
      <LinearProgress value={value} shape="wavy" aria-label="Linear wave" />
      <div style={{ display: 'flex', gap: 16 }}>
        <CircularProgress value={value} aria-label="Circular flat" />
        <CircularProgress value={value} shape="wavy" aria-label="Circular wave" />
        <CircularProgress value={value} thickness={8} aria-label="Circular flat 8" />
        <CircularProgress value={value} shape="wavy" thickness={8} aria-label="Circular wave 8" />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[0, 1, 5, 9, 30, 50, 80, 97, 99.5, 100].map((n) => (
          <button key={n} onClick={() => setValue(n)}>
            {n}%
          </button>
        ))}
      </div>
    </div>
  );
}

const live: Record<string, FixtureVariant> = {
  'live-motion': { width: 404, height: 200, render: () => <LiveMotion /> },
  'live-linear': { width: 404, height: 12, render: () => <LiveDeterminate kind="linear" /> },
  'live-circular': { width: 40, height: 40, render: () => <LiveDeterminate kind="circular" /> },
  'live-wave-linear': {
    width: 404,
    height: 12,
    render: () => <LinearProgress value={50} shape="wavy" aria-label="Upload" />,
  },
  'live-wave-circular': {
    width: 48,
    height: 48,
    render: () => <CircularProgress value={50} shape="wavy" aria-label="Upload" />,
  },
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

/** Review aid: the live indeterminate motion at fixed times (ForceState `time`), 50ms apart. */
const strip = (shape: ProgressShape) => () => (
  <div style={{ display: 'grid', gap: 6 }}>
    {Array.from({ length: 30 }, (_, i) => (
      <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center', width: 520 }}>
        <span style={{ font: '10px monospace', width: 40 }}>{i * 50}</span>
        <div style={{ width: 404 }}>{frozen({ time: i * 50 }, <LinearProgress shape={shape} aria-label="l" />)}</div>
        {frozen({ time: i * 50 }, <CircularProgress shape={shape} aria-label="c" />)}
      </div>
    ))}
  </div>
);
/** Review aid: the 8dp wavy indeterminate circle every 200ms over one 6s cycle (the spec video's variant). */
live['strip-circular-8'] = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 60px)', gap: 8 }}>
      {Array.from({ length: 30 }, (_, i) => (
        <div key={i}>{frozen({ time: i * 200 }, <CircularProgress shape="wavy" thickness={8} aria-label="c" />)}</div>
      ))}
    </div>
  ),
};
live['strip-flat'] = { render: strip('flat') };
live['strip-wave'] = { render: strip('wavy') };
/** Circular: one full 6s cycle, every 200ms (flat and wave, 4 / 8dp). */
live['strip-circular'] = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 64px)', gap: 8 }}>
      {Array.from({ length: 30 }, (_, i) => (
        <div key={i} style={{ display: 'grid', justifyItems: 'center', gap: 2 }}>
          <span style={{ font: '9px monospace' }}>{i * 200}</span>
          {frozen({ time: i * 200 }, <CircularProgress aria-label="c" />)}
          {frozen({ time: i * 200 }, <CircularProgress shape="wavy" aria-label="c" />)}
        </div>
      ))}
    </div>
  ),
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
        render = () =>
          frozen(
            { step: Number(p[1]) - 1 },
            <LoadingIndicator contained={p[2] === 'container'} aria-label="Loading" />,
          );
      } else if (p[1] === 'indet') {
        const [kind, , kit, th, step] = p as [string, string, string, string, string];
        const shape = kitShape(kit);
        const t = Number(th) as ProgressThickness;
        if (kind === 'linear') {
          // Step 2's wave was drawn with the determinate 40px segments (Step 1 uses 20px).
          const el = (
            <LinearProgress
              shape={shape}
              thickness={t}
              wavelength={step === '2' ? 40 : undefined}
              aria-label="Loading"
            />
          );
          const node = frozen({ actives: LINEAR_STEPS[`${kit}-${th}`]![Number(step)]!, phase: 0 }, el);
          render = () => (shape === 'wavy' && t === 8 && h === 12 ? shift(node) : node);
        } else {
          render = () =>
            frozen(CIRCULAR_STEPS[step]!, <CircularProgress shape={shape} thickness={t} aria-label="Loading" />);
        }
      } else {
        const [kind, kit, th, pct] = p as [string, string, string, string];
        const shape = kitShape(kit);
        const t = Number(th) as ProgressThickness;
        const value = Number(pct);
        if (kind === 'linear') {
          const node = frozen(
            { phase: 0 },
            <LinearProgress value={value} shape={shape} thickness={t} aria-label="Progress" />,
          );
          render = () => (shape === 'wavy' && t === 8 && h === 12 ? shift(node) : node);
        } else {
          render = () =>
            frozen(
              { phase: value === 100 ? 0 : -5 },
              <CircularProgress value={value} shape={shape} thickness={t} aria-label="Progress" />,
            );
        }
      }
      return [name, { node: v.node, width: w, height: h, render }];
    }),
  ]),
};
export default fixture;
