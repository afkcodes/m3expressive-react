import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Radio, RadioGroup, typescale } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';

const s = stylex.create({
  column: { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' },
  group: { alignItems: 'flex-start' },
  horizontal: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16 },
  row: { display: 'flex', alignItems: 'center', gap: 4, color: color.onSurface, cursor: 'pointer' },
  rowDisabled: { cursor: 'default', color: `color-mix(in srgb, ${color.onSurface} 38%, transparent)` },
  status: { margin: 0, color: color.onSurfaceVariant },
  states: { display: 'flex', gap: 8, alignItems: 'center' },
});

const PLANS = [
  ['basic', 'Basic'],
  ['standard', 'Standard'],
  ['premium', 'Premium'],
] as const;

function Plans() {
  const [plan, setPlan] = useState('standard');
  return (
    <div {...stylex.props(s.column)}>
      <RadioGroup aria-label="Plan" value={plan} onValueChange={(v) => setPlan(v as string)} sx={s.group}>
        {PLANS.map(([value, label]) => (
          <label key={value} {...stylex.props(s.row, typescale.bodyLarge)}>
            <Radio value={value} />
            {label}
          </label>
        ))}
      </RadioGroup>
      <p {...stylex.props(typescale.bodyMedium, s.status)}>Selected: {plan}</p>
    </div>
  );
}

function Standalone() {
  const [choice, setChoice] = useState('list');
  return (
    <div {...stylex.props(s.column)}>
      <div {...stylex.props(s.states)}>
        <Radio value="list" aria-label="List view" checked={choice === 'list'} onClick={() => setChoice('list')} />
        <Radio value="grid" aria-label="Grid view" checked={choice === 'grid'} onClick={() => setChoice('grid')} />
      </div>
      <p {...stylex.props(typescale.bodyMedium, s.status)}>Parent state: {choice}</p>
    </div>
  );
}

export default function RadioPage() {
  return (
    <Page
      title="Radio button"
      summary="Radio buttons let people select one option from a set. The group owns the value: arrow keys move the selection, and the dot springs in."
    >
      <Section title="Radio group" description="Tab into the group, then use the arrow keys.">
        <Demo
          title="Controlled"
          start
          code={`
const [plan, setPlan] = useState('standard');

<RadioGroup aria-label="Plan" value={plan} onValueChange={(v) => setPlan(v as string)}>
  <label><Radio value="basic" /> Basic</label>
  <label><Radio value="standard" /> Standard</label>
  <label><Radio value="premium" /> Premium</label>
</RadioGroup>`}
        >
          <Plans />
        </Demo>
        <Demo
          title="Horizontal"
          start
          code={`
// const styles = stylex.create({ horizontal: { flexDirection: 'row', columnGap: 16 } });
<RadioGroup aria-label="Size" defaultValue="m" sx={styles.horizontal}>
  <label><Radio value="s" /> Small</label>
  <label><Radio value="m" /> Medium</label>
  <label><Radio value="l" /> Large</label>
</RadioGroup>`}
        >
          <RadioGroup aria-label="Size" defaultValue="m" sx={[s.group, s.horizontal]}>
            {[
              ['s', 'Small'],
              ['m', 'Medium'],
              ['l', 'Large'],
            ].map(([value, label]) => (
              <label key={value} {...stylex.props(s.row, typescale.bodyLarge)}>
                <Radio value={value} />
                {label}
              </label>
            ))}
          </RadioGroup>
        </Demo>
      </Section>

      <Section title="Disabled" description="Disable one option, or the whole group.">
        <Demo
          title="One option"
          start
          code={`
<RadioGroup aria-label="Delivery" defaultValue="standard">
  <label><Radio value="standard" /> Standard</label>
  <label><Radio value="express" /> Express</label>
  <label><Radio value="same-day" disabled /> Same day (unavailable)</label>
</RadioGroup>`}
        >
          <RadioGroup aria-label="Delivery" defaultValue="standard" sx={s.group}>
            <label {...stylex.props(s.row, typescale.bodyLarge)}>
              <Radio value="standard" />
              Standard
            </label>
            <label {...stylex.props(s.row, typescale.bodyLarge)}>
              <Radio value="express" />
              Express
            </label>
            <label {...stylex.props(s.row, s.rowDisabled, typescale.bodyLarge)}>
              <Radio value="same-day" disabled />
              Same day (unavailable)
            </label>
          </RadioGroup>
        </Demo>
        <Demo
          title="Whole group"
          start
          code={`
<RadioGroup aria-label="Locked" defaultValue="a" disabled>
  <label><Radio value="a" /> Selected</label>
  <label><Radio value="b" /> Unselected</label>
</RadioGroup>`}
        >
          <RadioGroup aria-label="Locked" defaultValue="a" disabled sx={s.group}>
            <label {...stylex.props(s.row, s.rowDisabled, typescale.bodyLarge)}>
              <Radio value="a" />
              Selected
            </label>
            <label {...stylex.props(s.row, s.rowDisabled, typescale.bodyLarge)}>
              <Radio value="b" />
              Unselected
            </label>
          </RadioGroup>
        </Demo>
      </Section>

      <Section
        title="Standalone"
        description="Outside a group a radio shows the state its parent passes in checked: it never changes itself."
      >
        <Demo
          title="Owned by the parent"
          code={`
const [choice, setChoice] = useState('list');

<Radio value="list" aria-label="List view" checked={choice === 'list'} onClick={() => setChoice('list')} />
<Radio value="grid" aria-label="Grid view" checked={choice === 'grid'} onClick={() => setChoice('grid')} />`}
        >
          <Standalone />
        </Demo>
        <Demo
          title="States"
          code={`
<Radio value="a" aria-label="Unselected" checked={false} />
<Radio value="b" aria-label="Selected" checked />
<Radio value="c" aria-label="Disabled" checked={false} disabled />
<Radio value="d" aria-label="Disabled, selected" checked disabled />`}
        >
          <div {...stylex.props(s.states)}>
            <Radio value="a" aria-label="Unselected" checked={false} />
            <Radio value="b" aria-label="Selected" checked />
            <Radio value="c" aria-label="Disabled" checked={false} disabled />
            <Radio value="d" aria-label="Disabled, selected" checked disabled />
          </div>
        </Demo>
      </Section>
    </Page>
  );
}
