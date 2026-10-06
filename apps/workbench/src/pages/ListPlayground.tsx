import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Checkbox,
  ExpandableListItem,
  List,
  ListItem,
  ListItemMonogram,
  M3Provider,
  SwipeableListItem,
  Switch,
  typescale,
  type ColorSchemeMode,
  type SwipeAction,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import assets from '../../../../figma/list/assets.json';

const s = stylex.create({
  page: { minHeight: '100vh', backgroundColor: color.surface, color: color.onSurface, padding: 32, display: 'grid', gap: 24, alignContent: 'start' },
  panel: { display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'end', padding: 16, borderRadius: 16, backgroundColor: color.surfaceContainer },
  stage: { display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'start' },
  column: { display: 'grid', gap: 8, width: 320 },
  card: { padding: 8, borderRadius: 20, backgroundColor: color.surfaceContainer },
  muted: { color: color.onSurfaceVariant },
});

type IconName = keyof typeof assets.icons;
const Icon = ({ name }: { name: IconName }) => {
  const size = Number(name.split('-').pop());
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="currentColor" aria-hidden style={{ display: 'block' }}>
      <path d={assets.icons[name] as string} />
    </svg>
  );
};

const Section = ({ title, note, children }: { title: string; note: string; children: ReactNode }) => (
  <section {...stylex.props(s.column)}>
    <h2 {...stylex.props(typescale.titleMedium)} style={{ margin: 0 }}>
      {title}
    </h2>
    <p {...stylex.props(typescale.bodySmall, s.muted)} style={{ margin: 0 }}>
      {note}
    </p>
    <div {...stylex.props(s.card)}>{children}</div>
  </section>
);

const FOLDERS = ['Inbox', 'Starred', 'Snoozed', 'Archived'];
const MESSAGES = ['Weekly summary', 'Team update', 'Reminder'];

/** Expressive + baseline lists: selection, accordion, swipe actions, controls, the lifted state. */
export function ListPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [segmented, setSegmented] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [selected, setSelected] = useState(0);
  const [log, setLog] = useState('—');
  const [checks, setChecks] = useState([true, false, false]);
  const [wifi, setWifi] = useState(true);
  const [dragged, setDragged] = useState(true);
  const [messages, setMessages] = useState(MESSAGES);
  const type = segmented ? 'segmented' : 'standard';
  const actions: SwipeAction[] = [
    { icon: <Icon name="star-24" />, label: 'Star', onAction: () => setLog('Star') },
    { icon: <Icon name="move_item-24" />, label: 'Move', onAction: () => setLog('Move') },
    { icon: <Icon name="edit-24" />, label: 'Edit', onAction: () => setLog('Edit') },
  ];
  // The full swipe hands removal to the app: the archived row leaves the list.
  const archive = (t: string): SwipeAction => ({
    icon: <Icon name="archive-24" />,
    label: 'Archive',
    onAction: () => {
      setLog(`Archived "${t}"`);
      setTimeout(() => setMessages((m) => m.filter((x) => x !== t)), 300);
    },
  });
  const field = { font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8 } as const;
  return (
    <M3Provider colorScheme={scheme}>
      <main {...stylex.props(s.page)}>
        <p style={{ margin: 0 }}>
          <a href="/" style={{ color: 'inherit' }}>
            ← all
          </a>
        </p>
        <h1 {...stylex.props(typescale.headlineMedium)} style={{ margin: 0 }}>
          List playground
        </h1>
        <section {...stylex.props(s.panel)}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>colour scheme</span>
            <select value={scheme} onChange={(e) => setScheme(e.target.value as ColorSchemeMode)} style={field}>
              <option>light</option>
              <option>dark</option>
              <option>system</option>
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={segmented} onChange={(e) => setSegmented(e.target.checked)} /> segmented
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} /> disabled
          </label>
        </section>
        <div {...stylex.props(s.stage)}>
          <Section title="Selectable" note="Hover rounds the corners to 12px, press / focus / selected to 16px (fast spatial spring).">
            <List type={type} aria-label="Folders">
              {FOLDERS.map((f, i) => (
                <ListItem
                  key={f}
                  leading={<Icon name={selected === i ? 'stars_filled-20' : 'stars-20'} />}
                  trailing={<Icon name="arrow_right-20" />}
                  supportingText={`${(i + 1) * 3} conversations`}
                  supportingMaxLines={1}
                  selected={selected === i}
                  disabled={disabled}
                  onClick={() => setSelected(i)}
                >
                  {f}
                </ListItem>
              ))}
            </List>
          </Section>
          <Section title="Expandable" note="The accordion button toggles nested items; the panel height animates on the default spatial spring.">
            <List type="segmented" aria-label="Settings">
              <ExpandableListItem
                leading={<Icon name="stars-20" />}
                supportingText="3 items"
                supportingMaxLines={1}
                defaultExpanded
                items={['Display', 'Sound', 'Storage'].map((t) => (
                  <ListItem key={t} leading={<Icon name="stars-20" />} trailing={<Icon name="arrow_right-20" />} onClick={() => setLog(t)}>
                    {t}
                  </ListItem>
                ))}
              >
                Device
              </ExpandableListItem>
              <ExpandableListItem
                leading={<Icon name="stars-20" />}
                items={['Notifications', 'Privacy'].map((t) => (
                  <ListItem key={t} leading={<Icon name="stars-20" />} onClick={() => setLog(t)}>
                    {t}
                  </ListItem>
                ))}
              >
                Account
              </ExpandableListItem>
            </List>
          </Section>
          <Section title="Swipeable" note={`Drag a row left: peek → revealed actions → a full swipe archives. Last action: ${log}`}>
            <List type={type} aria-label="Messages">
              {messages.map((t) => (
                <SwipeableListItem key={t} actions={actions} swipeAction={archive(t)} leading={<Icon name="stars-20" />} trailing={<Icon name="more_vert-20" />}>
                  {t}
                </SwipeableListItem>
              ))}
            </List>
            {messages.length < MESSAGES.length && (
              <button type="button" onClick={() => setMessages(MESSAGES)} style={{ marginTop: 8, font: 'inherit', fontSize: 13 }}>
                Restore archived
              </button>
            )}
          </Section>
          <Section title="Baseline" note="The classic M3 list (56 / 72 / 88px rows) with monograms and controls.">
            <List variant="baseline" aria-label="Preferences">
              {['Alerts', 'Daily digest', 'Beta features'].map((t, i) => (
                <ListItem
                  key={t}
                  leading={<ListItemMonogram>{t[0]}</ListItemMonogram>}
                  trailing={
                    <Checkbox
                      checked={checks[i]}
                      onCheckedChange={(v) => setChecks((c) => c.map((x, k) => (k === i ? v : x)))}
                      aria-label={t}
                      disabled={disabled}
                    />
                  }
                  supportingText={i === 1 ? 'Sent every morning' : undefined}
                  disabled={disabled}
                >
                  {t}
                </ListItem>
              ))}
              <ListItem trailing={<Switch checked={wifi} onCheckedChange={setWifi} aria-label="Wi-Fi" disabled={disabled} />} disabled={disabled}>
                Wi-Fi
              </ListItem>
            </List>
          </Section>
          <Section title="Lifted (reorder)" note="The dragged state for your drag-and-drop layer: tertiary container, elevation 5, 16px corners.">
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, marginBottom: 8 }}>
              <input type="checkbox" checked={dragged} onChange={(e) => setDragged(e.target.checked)} /> dragged
            </label>
            <List aria-label="Queue">
              {['First', 'Second', 'Third'].map((t, i) => (
                <ListItem key={t} leading={<Icon name="stars-20" />} trailing={<Icon name="drag_handle-20" />} dragged={dragged && i === 1}>
                  {t}
                </ListItem>
              ))}
            </List>
          </Section>
        </div>
      </main>
    </M3Provider>
  );
}
