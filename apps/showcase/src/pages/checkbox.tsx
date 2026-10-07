import { Fragment, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Checkbox, typescale } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';

const s = stylex.create({
  list: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
  row: { display: 'flex', alignItems: 'center', gap: 4, color: color.onSurface, cursor: 'pointer' },
  child: { paddingInlineStart: 32 },
  rowDisabled: { cursor: 'default', color: `color-mix(in srgb, ${color.onSurface} 38%, transparent)` },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'max-content repeat(3, 72px)',
    alignItems: 'center',
    justifyItems: 'center',
    rowGap: 4,
  },
  muted: { color: color.onSurfaceVariant },
  rowHead: { justifySelf: 'start', paddingInlineEnd: 16 },
  status: { margin: 0, color: color.onSurfaceVariant },
  error: { margin: 0, color: color.error },
});

const TYPES = ['unselected', 'selected', 'indeterminate'] as const;
const STATES = ['enabled', 'error', 'disabled'] as const;

function StatesGrid() {
  return (
    <div {...stylex.props(s.grid)}>
      <span />
      {STATES.map((state) => (
        <span key={state} {...stylex.props(typescale.labelMedium, s.muted)}>
          {state[0]!.toUpperCase() + state.slice(1)}
        </span>
      ))}
      {TYPES.map((type) => (
        <Fragment key={type}>
          <span {...stylex.props(typescale.labelMedium, s.muted, s.rowHead)}>
            {type[0]!.toUpperCase() + type.slice(1)}
          </span>
          {STATES.map((state) => (
            <Checkbox
              key={state}
              aria-label={`${type}, ${state}`}
              defaultChecked={type === 'selected'}
              indeterminate={type === 'indeterminate'}
              error={state === 'error'}
              disabled={state === 'disabled'}
            />
          ))}
        </Fragment>
      ))}
    </div>
  );
}

const TOPPINGS = ['Basil', 'Mozzarella', 'Olives'];

function ParentChild() {
  const [items, setItems] = useState([true, false, false]);
  const all = items.every(Boolean);
  const some = items.some(Boolean) && !all;
  return (
    <div {...stylex.props(s.list)}>
      <label {...stylex.props(s.row, typescale.bodyLarge)}>
        <Checkbox checked={all} indeterminate={some} onCheckedChange={(c) => setItems(items.map(() => c))} />
        All toppings
      </label>
      {TOPPINGS.map((name, i) => (
        <label key={name} {...stylex.props(s.row, s.child, typescale.bodyLarge)}>
          <Checkbox checked={items[i]} onCheckedChange={(c) => setItems(items.map((x, j) => (j === i ? c : x)))} />
          {name}
        </label>
      ))}
    </div>
  );
}

function Terms() {
  const [accepted, setAccepted] = useState(false);
  return (
    <div {...stylex.props(s.list)}>
      <label {...stylex.props(s.row, typescale.bodyLarge)}>
        <Checkbox checked={accepted} error={!accepted} onCheckedChange={setAccepted} />I accept the terms
      </label>
      {!accepted ? (
        <p {...stylex.props(typescale.bodySmall, s.error)}>You need to accept the terms to continue.</p>
      ) : (
        <p {...stylex.props(typescale.bodySmall, s.status)}>Thanks — you can continue.</p>
      )}
    </div>
  );
}

export default function CheckboxPage() {
  return (
    <Page
      title="Checkbox"
      summary="Checkboxes let people select one or more items from a list, or turn an item on or off. Unchecked, checked and indeterminate, with the check mark morphing between them."
    >
      <Section title="Checkbox" description="Click, or Tab to one and press Space. Wrap it in a label to name it.">
        <Demo
          title="With labels"
          start
          code={`
<label>
  <Checkbox defaultChecked />
  Email updates
</label>
<label>
  <Checkbox />
  Text messages
</label>`}
        >
          <div {...stylex.props(s.list)}>
            <label {...stylex.props(s.row, typescale.bodyLarge)}>
              <Checkbox defaultChecked />
              Email updates
            </label>
            <label {...stylex.props(s.row, typescale.bodyLarge)}>
              <Checkbox />
              Text messages
            </label>
            <label {...stylex.props(s.row, s.rowDisabled, typescale.bodyLarge)}>
              <Checkbox disabled />
              Phone calls (unavailable)
            </label>
          </div>
        </Demo>
        <Demo
          title="Indeterminate parent"
          start
          code={`
const [items, setItems] = useState([true, false, false]);
const all = items.every(Boolean);
const some = items.some(Boolean) && !all;

<label>
  <Checkbox
    checked={all}
    indeterminate={some}
    onCheckedChange={(c) => setItems(items.map(() => c))}
  />
  All toppings
</label>
{items.map((checked, i) => (
  <label key={i}>
    <Checkbox
      checked={checked}
      onCheckedChange={(c) => setItems(items.map((x, j) => (j === i ? c : x)))}
    />
    {TOPPINGS[i]}
  </label>
))}`}
        >
          <ParentChild />
        </Demo>
      </Section>

      <Section title="States" description="Selected, unselected and indeterminate; enabled, error and disabled.">
        <Demo
          code={`
<Checkbox aria-label="Unselected" />
<Checkbox aria-label="Selected" defaultChecked />
<Checkbox aria-label="Indeterminate" indeterminate />
<Checkbox aria-label="Error" error />
<Checkbox aria-label="Disabled" disabled />`}
        >
          <StatesGrid />
        </Demo>
        <Demo
          title="Error"
          start
          code={`
const [accepted, setAccepted] = useState(false);

<label>
  <Checkbox checked={accepted} error={!accepted} onCheckedChange={setAccepted} />
  I accept the terms
</label>`}
        >
          <Terms />
        </Demo>
      </Section>
    </Page>
  );
}
