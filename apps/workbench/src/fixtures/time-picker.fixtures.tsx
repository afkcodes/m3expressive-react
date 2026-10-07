import { useEffect, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '@m3x/react/tokens/color.stylex';
import { Button, ModalTimePicker, TimeInput, TimePicker, type Time } from '@m3x/react';
import {
  ClockFace,
  ClockNumber,
  ForceState,
  PeriodSelector,
  TimeField,
  TimeSelector,
  type ForcedState,
} from '@m3x/react/testing';
import manifest from '../../../../figma/time-picker/manifest.json';
import type { FixtureModule, FixtureVariant } from './types.ts';

const fx = stylex.create({
  cell: { position: 'relative', width: 48, height: 48 },
  clip: { overflow: 'hidden' },
  // The kit's selected hour carries its hand segment (hour-line, angle 1) under the circle.
  hand: { position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', color: color.primary },
  over: { position: 'absolute', inset: 0 },
});

const asForced = (s: string): ForcedState | undefined =>
  s === 'hovered' || s === 'focused' || s === 'pressed' ? s : undefined;
const noop = () => {};

function hourCell(selected: boolean, st: string): ReactNode {
  return (
    <ForceState state={asForced(st)}>
      <span {...stylex.props(fx.cell, selected && st !== 'enabled' && fx.clip)}>
        {selected && (
          <svg width={48} height={48} aria-hidden {...stylex.props(fx.hand)}>
            <line x1={25.5} y1={21.43} x2={-26.5} y2={111.5} stroke="currentColor" strokeWidth={2} />
          </svg>
        )}
        <span {...stylex.props(fx.over)}>
          <ClockNumber label="00" selected={selected} />
        </span>
      </span>
    </ForceState>
  );
}

function render(name: string): ReactNode {
  const p = name.split('-');
  if (p[0] === 'hour') return hourCell(p[1] === 'sel', p[2]!);
  if (name === 'input-sel' || name === 'input-unsel')
    return <TimeSelector value="00" selected={name === 'input-sel'} />;
  if (name === 'kbinput-sel' || name === 'kbinput-unsel') {
    const on = name === 'kbinput-sel';
    return (
      <ForceState state={on ? 'focused' : undefined}>
        <TimeField value="00" onValueChange={noop} label="Time label" max={59} selected={on} />
      </ForceState>
    );
  }
  if (p[0] === 'period' || p[0] === 'periodh') {
    return (
      <ForceState state={asForced(p[2]!)}>
        <PeriodSelector
          value={p[1] === 'pm' ? 'pm' : 'am'}
          onValueChange={noop}
          orientation={p[0] === 'periodh' ? 'horizontal' : 'vertical'}
        />
      </ForceState>
    );
  }
  if (name === 'clock-12') return <ClockFace mode="hour" value={7} onValueChange={noop} />;
  if (name === 'clock-24') return <ClockFace mode="hour" value={20} is24Hour onValueChange={noop} />;
  if (p[0] === 'dial') {
    const is24 = p[1] === '24';
    return (
      <TimePicker
        value={is24 ? { hour: 20, minute: 0 } : { hour: 7, minute: 0 }}
        onValueChange={noop}
        is24Hour={is24}
        orientation={p[2] === 'h' ? 'horizontal' : 'vertical'}
        onModeToggle={noop}
        onCancel={noop}
        onConfirm={noop}
      />
    );
  }
  if (p[0] === 'keyboard') {
    const is24 = p[1] === '24';
    return (
      <ForceState state="focused">
        {/* The kit's 12-hour field reads "20" next to AM (impossible in 12-hour time); 08 AM. */}
        <TimeInput
          value={is24 ? { hour: 20, minute: 0 } : { hour: 8, minute: 0 }}
          onValueChange={noop}
          is24Hour={is24}
          onModeToggle={noop}
          onCancel={noop}
          onConfirm={noop}
        />
      </ForceState>
    );
  }
  return null;
}

/** Live: the time picker dialog (dial ⇄ keyboard). */
function LiveTime() {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState<Time>({ hour: 19, minute: 0 });
  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
      <Button onClick={() => setOpen(true)}>Pick time</Button>
      <output data-time>{`${time.hour}:${String(time.minute).padStart(2, '0')}`}</output>
      <ModalTimePicker open={open} onOpenChange={setOpen} value={time} onValueChange={setTime} />
    </div>
  );
}

/** Live, under a parent that passes a fresh Time object on every render (`window.__m3xChurn()`). */
function ChurnTime() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    (window as unknown as { __m3xChurn?: () => void }).__m3xChurn = () => setTick((t) => t + 1);
  }, []);
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState<Time>({ hour: 19, minute: 0 });
  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
      <Button onClick={() => setOpen(true)}>Pick time</Button>
      <output data-tick>{tick}</output>
      <output data-time>{`${time.hour}:${String(time.minute).padStart(2, '0')}`}</output>
      <ModalTimePicker open={open} onOpenChange={setOpen} value={{ ...time }} onValueChange={setTime} />
    </div>
  );
}

/** Out-of-range input: the pickers clamp it instead of crashing. */
function InvalidTime() {
  const [time, setTime] = useState<Time>({ hour: 25, minute: 75 });
  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
      <output data-time>{`${time.hour}:${time.minute}`}</output>
      <TimePicker value={time} onValueChange={setTime} />
      <ClockFace mode="minute" value={60} onValueChange={noop} aria-label="Minute 60" />
      <ClockFace mode="hour" value={-1} onValueChange={noop} aria-label="Hour -1" />
      <ClockFace mode="hour" value={Number.NaN} is24Hour onValueChange={noop} aria-label="Hour NaN" />
      <TimeInput value={{ hour: Number.NaN, minute: 61 }} onValueChange={noop} />
    </div>
  );
}

const fixture: FixtureModule = {
  component: 'time-picker',
  variants: Object.fromEntries([
    ['live', { width: 360, height: 100, render: () => <LiveTime /> } satisfies FixtureVariant],
    ['live-churn', { width: 360, height: 100, render: () => <ChurnTime /> } satisfies FixtureVariant],
    ['live-invalid', { width: 360, height: 1600, render: () => <InvalidTime /> } satisfies FixtureVariant],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [w, h] = v.size as [number, number];
      return [
        name,
        {
          node: v.node,
          width: w,
          height: h,
          render: () => <div style={{ width: w, height: h, display: 'flex' }}>{render(name)}</div>,
        },
      ];
    }),
  ]),
};
export default fixture;
