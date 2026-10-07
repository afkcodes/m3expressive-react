import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { RangeSlider, Slider, typescale, type SliderSize } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';

const SIZES = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const satisfies readonly SliderSize[];
const SIZE_NAMES: Record<SliderSize, string> = {
  xsmall: 'Extra small',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  xlarge: 'Extra large',
};

const s = stylex.create({
  // Room above the track for the value indicator (shown while pressed, dragged or focused).
  stack: { display: 'flex', flexDirection: 'column', gap: 40, paddingTop: 48, width: '100%' },
  readout: { margin: 0, color: color.onSurfaceVariant, fontVariantNumeric: 'tabular-nums' },
  sizeRow: { display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr)', alignItems: 'center', columnGap: 16 },
  sizeLabel: { color: color.onSurfaceVariant },
  vertical: { display: 'flex', justifyContent: 'center', gap: 64, height: 280, paddingBlock: 16, width: '100%' },
  verticalItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, height: '100%' },
  verticalTrack: { flexGrow: 1, minHeight: 0 },
});

function Readout({ children }: { children: ReactNode }) {
  return <p {...stylex.props(typescale.labelLarge, s.readout)}>{children}</p>;
}

function StandardDemo() {
  const [volume, setVolume] = useState(40);
  const [committed, setCommitted] = useState(40);
  return (
    <Demo
      title="Continuous"
      column
      code={`
const [volume, setVolume] = useState(40);

<Slider
  aria-label="Volume"
  value={volume}
  onValueChange={setVolume}
  onValueCommitted={(v) => save(v)}
/>`}
    >
      <div {...stylex.props(s.stack)}>
        <Slider aria-label="Volume" value={volume} onValueChange={setVolume} onValueCommitted={setCommitted} />
      </div>
      <Readout>
        Value {volume} · committed {committed}
      </Readout>
    </Demo>
  );
}

function DiscreteDemo() {
  const [rating, setRating] = useState(60);
  return (
    <Demo
      title="Discrete, with stops"
      column
      code={`
<Slider
  aria-label="Brightness"
  step={10}
  ticks
  value={value}
  onValueChange={setValue}
/>`}
    >
      <div {...stylex.props(s.stack)}>
        <Slider aria-label="Brightness" step={10} ticks value={rating} onValueChange={setRating} />
      </div>
      <Readout>Value {rating}</Readout>
    </Demo>
  );
}

function FormattedDemo() {
  const [share, setShare] = useState(0.25);
  const [amount, setAmount] = useState(2500);
  return (
    <Demo
      title="Formatted value indicator"
      column
      code={`
<Slider
  aria-label="Deposit share"
  min={0}
  max={1}
  step={0.05}
  format={{ style: 'percent' }}
/>
<Slider
  aria-label="Loan amount"
  min={500}
  max={10000}
  step={500}
  ticks
  valueLabel={(v) => \`£\${v / 1000}k\`}
/>`}
    >
      <div {...stylex.props(s.stack)}>
        <Slider
          aria-label="Deposit share"
          min={0}
          max={1}
          step={0.05}
          format={{ style: 'percent' }}
          value={share}
          onValueChange={setShare}
        />
        <Slider
          aria-label="Loan amount"
          min={500}
          max={10000}
          step={500}
          ticks
          valueLabel={(v) => `£${v / 1000}k`}
          value={amount}
          onValueChange={setAmount}
        />
      </div>
      <Readout>
        {Math.round(share * 100)}% · £{amount.toLocaleString('en-GB')}
      </Readout>
    </Demo>
  );
}

function CenteredDemo() {
  const [balance, setBalance] = useState(15);
  return (
    <Demo
      title="Centred"
      column
      code={`
<Slider
  centered
  aria-label="Balance"
  min={-50}
  max={50}
  value={balance}
  onValueChange={setBalance}
/>`}
    >
      <div {...stylex.props(s.stack)}>
        <Slider centered aria-label="Balance" min={-50} max={50} value={balance} onValueChange={setBalance} />
        <Slider centered aria-label="Exposure" min={-3} max={3} step={0.5} ticks defaultValue={-1} />
      </div>
      <Readout>Balance {balance > 0 ? `+${balance}` : balance}</Readout>
    </Demo>
  );
}

function RangeDemo() {
  const [price, setPrice] = useState<[number, number]>([20, 70]);
  return (
    <Demo
      title="Range"
      column
      code={`
const [price, setPrice] = useState<[number, number]>([20, 70]);

<RangeSlider
  getAriaLabel={(i) => (i === 0 ? 'Minimum price' : 'Maximum price')}
  value={price}
  onValueChange={setPrice}
/>`}
    >
      <div {...stylex.props(s.stack)}>
        <RangeSlider
          getAriaLabel={(i) => (i === 0 ? 'Minimum price' : 'Maximum price')}
          value={price}
          onValueChange={setPrice}
        />
        <RangeSlider
          getAriaLabel={(i) => (i === 0 ? 'Earliest hour' : 'Latest hour')}
          min={0}
          max={24}
          step={2}
          ticks
          defaultValue={[8, 18]}
          valueLabel={(v) => `${String(v).padStart(2, '0')}:00`}
        />
      </div>
      <Readout>
        Price {price[0]} – {price[1]}
      </Readout>
    </Demo>
  );
}

function VerticalDemo() {
  const [level, setLevel] = useState(65);
  const [tilt, setTilt] = useState(-10);
  const [band, setBand] = useState<[number, number]>([30, 80]);
  return (
    <Demo
      title="Vertical"
      wide
      code={`
<div style={{ height: 280 }}>
  <Slider orientation="vertical" aria-label="Level" value={level} onValueChange={setLevel} />
</div>`}
    >
      <div {...stylex.props(s.vertical)}>
        <div {...stylex.props(s.verticalItem)}>
          <div {...stylex.props(s.verticalTrack)}>
            <Slider orientation="vertical" size="medium" aria-label="Level" value={level} onValueChange={setLevel} />
          </div>
          <Readout>{level}</Readout>
        </div>
        <div {...stylex.props(s.verticalItem)}>
          <div {...stylex.props(s.verticalTrack)}>
            <Slider
              orientation="vertical"
              size="medium"
              centered
              min={-50}
              max={50}
              aria-label="Tilt"
              value={tilt}
              onValueChange={setTilt}
            />
          </div>
          <Readout>{tilt}</Readout>
        </div>
        <div {...stylex.props(s.verticalItem)}>
          <div {...stylex.props(s.verticalTrack)}>
            <RangeSlider
              orientation="vertical"
              size="medium"
              getAriaLabel={(i) => (i === 0 ? 'Low' : 'High')}
              step={10}
              ticks
              value={band}
              onValueChange={setBand}
            />
          </div>
          <Readout>
            {band[0]}–{band[1]}
          </Readout>
        </div>
        <div {...stylex.props(s.verticalItem)}>
          <div {...stylex.props(s.verticalTrack)}>
            <Slider orientation="vertical" size="xlarge" aria-label="Fill" defaultValue={50} />
          </div>
          <Readout>XL</Readout>
        </div>
      </div>
    </Demo>
  );
}

export default function SlidersPage() {
  return (
    <Page
      title="Sliders"
      summary="Sliders select a value from a range. Drag the handle, click the track or use the arrow keys: the handle narrows and a value indicator appears while you adjust."
    >
      <Section title="Standard" description="The active track fills from the start to the handle.">
        <StandardDemo />
        <DiscreteDemo />
        <FormattedDemo />
      </Section>

      <Section title="Centred and range">
        <CenteredDemo />
        <RangeDemo />
      </Section>

      <Section title="Sizes" description="Track thickness 16, 24, 40, 56 and 96px; the handle grows with it.">
        <Demo
          wide
          column
          code={`
<Slider size="xsmall" aria-label="Volume" />
<Slider size="small" aria-label="Volume" />
<Slider size="medium" aria-label="Volume" />
<Slider size="large" aria-label="Volume" />
<Slider size="xlarge" aria-label="Volume" />`}
        >
          <div {...stylex.props(s.stack)}>
            {SIZES.map((size, i) => (
              <div key={size} {...stylex.props(s.sizeRow)}>
                <span {...stylex.props(typescale.labelLarge, s.sizeLabel)}>{SIZE_NAMES[size]}</span>
                <Slider size={size} aria-label={`${SIZE_NAMES[size]} slider`} defaultValue={30 + i * 10} />
              </div>
            ))}
          </div>
        </Demo>
      </Section>

      <Section title="Orientation" description="Vertical sliders fill the height of their container.">
        <VerticalDemo />
      </Section>

      <Section title="Disabled">
        <Demo
          title="Standard, centred and range"
          column
          code={`
<Slider aria-label="Volume" defaultValue={40} disabled />
<Slider centered aria-label="Balance" min={-50} max={50} defaultValue={-20} disabled />
<RangeSlider aria-label="Price" defaultValue={[20, 70]} step={10} ticks disabled />`}
        >
          <div {...stylex.props(s.stack)}>
            <Slider aria-label="Volume" defaultValue={40} disabled />
            <Slider centered aria-label="Balance" min={-50} max={50} defaultValue={-20} disabled />
            <RangeSlider aria-label="Price" defaultValue={[20, 70]} step={10} ticks disabled />
          </div>
        </Demo>
      </Section>
    </Page>
  );
}
