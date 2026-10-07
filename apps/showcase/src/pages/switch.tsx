import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Switch, typescale } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';

const s = stylex.create({
  column: { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' },
  settings: { display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 360 },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    color: color.onSurface,
    cursor: 'pointer',
  },
  rowDisabled: { cursor: 'default', color: `color-mix(in srgb, ${color.onSurface} 38%, transparent)` },
  inline: { display: 'flex', alignItems: 'center', gap: 12, color: color.onSurface, cursor: 'pointer' },
  status: { margin: 0, color: color.onSurfaceVariant },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'max-content repeat(2, 80px)',
    alignItems: 'center',
    justifyItems: 'center',
    rowGap: 16,
  },
  muted: { color: color.onSurfaceVariant },
  rowHead: { justifySelf: 'start', paddingInlineEnd: 16 },
});

function Controlled() {
  const [on, setOn] = useState(true);
  return (
    <div {...stylex.props(s.column)}>
      <label {...stylex.props(s.inline, typescale.bodyLarge)}>
        <Switch checked={on} onCheckedChange={setOn} />
        Wi-Fi
      </label>
      <p {...stylex.props(typescale.bodyMedium, s.status)}>Wi-Fi is {on ? 'on' : 'off'}.</p>
    </div>
  );
}

const SETTINGS = [
  { label: 'Notifications', on: true, icons: true },
  { label: 'Dark theme', on: false, icons: true },
  { label: 'Location', on: true, icons: false },
  { label: 'Managed by your organisation', on: true, icons: false, disabled: true },
];

function StatesGrid() {
  const rows = [
    ['Off', false, false],
    ['On', true, false],
    ['Off, icons', false, true],
    ['On, icons', true, true],
  ] as const;
  return (
    <div {...stylex.props(s.grid)}>
      <span />
      <span {...stylex.props(typescale.labelMedium, s.muted)}>Enabled</span>
      <span {...stylex.props(typescale.labelMedium, s.muted)}>Disabled</span>
      {rows.map(([label, on, icons]) => [
        <span key={`${label}-label`} {...stylex.props(typescale.labelMedium, s.muted, s.rowHead)}>
          {label}
        </span>,
        <Switch key={`${label}-enabled`} aria-label={label} defaultChecked={on} icons={icons} />,
        <Switch
          key={`${label}-disabled`}
          aria-label={`${label}, disabled`}
          defaultChecked={on}
          icons={icons}
          disabled
        />,
      ])}
    </div>
  );
}

export default function SwitchPage() {
  return (
    <Page
      title="Switch"
      summary="Switches toggle a single setting on or off. Press and hold to see the handle grow; the handle springs across on release."
    >
      <Section title="Switch" description="Click it, or Tab to it and press Space. Wrap it in a label to name it.">
        <Demo
          title="Controlled"
          start
          code={`
const [on, setOn] = useState(true);

<label>
  <Switch checked={on} onCheckedChange={setOn} />
  Wi-Fi
</label>`}
        >
          <Controlled />
        </Demo>
        <Demo
          title="With icons"
          code={`
<Switch aria-label="Bluetooth" icons defaultChecked />
<Switch aria-label="Airplane mode" icons />`}
        >
          <Switch aria-label="Bluetooth" icons defaultChecked />
          <Switch aria-label="Airplane mode" icons />
        </Demo>
      </Section>

      <Section title="States" description="On and off, with and without icons, enabled and disabled.">
        <Demo
          code={`
<Switch aria-label="Off" />
<Switch aria-label="On" defaultChecked />
<Switch aria-label="On, icons" defaultChecked icons />
<Switch aria-label="Disabled" disabled />
<Switch aria-label="Disabled, on" defaultChecked disabled />`}
        >
          <StatesGrid />
        </Demo>
        <Demo
          title="Settings list"
          code={`
<label>
  Notifications
  <Switch defaultChecked icons />
</label>
<label>
  Managed by your organisation
  <Switch defaultChecked disabled />
</label>`}
        >
          <div {...stylex.props(s.settings)}>
            {SETTINGS.map(({ label, on, icons, disabled }) => (
              <label key={label} {...stylex.props(s.row, disabled && s.rowDisabled, typescale.bodyLarge)}>
                {label}
                <Switch defaultChecked={on} icons={icons} disabled={disabled} />
              </label>
            ))}
          </div>
        </Demo>
      </Section>
    </Page>
  );
}
