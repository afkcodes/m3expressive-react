import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Avatar,
  Button,
  Checkbox,
  ExpandableListItem,
  List,
  ListItem,
  ListItemImage,
  ListItemMonogram,
  ListItemVideo,
  SwipeableListItem,
  Switch,
  typescale,
  type SwipeAction,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const s = stylex.create({
  list: { width: '100%' },
  note: { margin: 0, color: color.onSurfaceVariant },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  // Picture-like thumbnails drawn from the colour roles, so the page works offline.
  art: (from: string, to: string) => ({
    backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
  }),
});

const ART = [
  s.art(color.primaryContainer, color.tertiaryContainer),
  s.art(color.secondaryContainer, color.primary),
  s.art(color.tertiaryContainer, color.secondary),
  s.art(color.primaryFixedDim, color.tertiary),
];

const FOLDERS = [
  { name: 'Inbox', icon: 'inbox', count: 24 },
  { name: 'Starred', icon: 'star', count: 6 },
  { name: 'Snoozed', icon: 'schedule', count: 2 },
  { name: 'Archive', icon: 'archive', count: 118 },
];

const PEOPLE = [
  { name: 'Amelia Hart', role: 'Finance director', initial: 'A' },
  { name: 'Ben Okafor', role: 'Operations lead', initial: 'B' },
  { name: 'Chloe Martin', role: 'Product designer', initial: 'C' },
];

const PHOTOS = ['Harbour at dawn', 'Mountain ridge', 'City lights', 'Forest path'];

const MESSAGES = ['Quarterly summary', 'Team offsite plan', 'Invoice reminder', 'Welcome aboard'];

/** Standard / segmented lists with single selection. */
function SelectableList({ variant }: { variant: 'standard' | 'segmented' }) {
  const [selected, setSelected] = useState(0);
  return (
    <List variant={variant} aria-label="Folders" sx={s.list}>
      {FOLDERS.map((f, i) => (
        <ListItem
          key={f.name}
          leading={<Icon name={f.icon} size={20} filled={selected === i} />}
          trailing={<Icon name="chevron_right" size={20} />}
          supportingText={`${f.count} conversations`}
          selected={selected === i}
          onClick={() => setSelected(i)}
        >
          {f.name}
        </ListItem>
      ))}
    </List>
  );
}

function ImageList() {
  const [picked, setPicked] = useState<number[]>([1]);
  return (
    <List variant="segmented" aria-label="Photos" sx={s.list}>
      {PHOTOS.map((p, i) => (
        <ListItem
          key={p}
          leading={<ListItemImage sx={ART[i]} />}
          supportingText={`${(i + 2) * 3} photos`}
          selected={picked.includes(i)}
          onClick={() => setPicked((all) => (all.includes(i) ? all.filter((x) => x !== i) : [...all, i]))}
        >
          {p}
        </ListItem>
      ))}
    </List>
  );
}

function ControlsList() {
  const [wifi, setWifi] = useState(true);
  const [bluetooth, setBluetooth] = useState(false);
  const [alerts, setAlerts] = useState([true, false, true]);
  return (
    <List variant="segmented" aria-label="Settings" sx={s.list}>
      <ListItem
        leading={<Icon name="wifi" size={20} />}
        supportingText={wifi ? 'Connected' : 'Off'}
        trailing={<Switch checked={wifi} onCheckedChange={setWifi} aria-label="Wi-Fi" />}
      >
        Wi-Fi
      </ListItem>
      <ListItem
        leading={<Icon name="bluetooth" size={20} />}
        trailing={<Switch checked={bluetooth} onCheckedChange={setBluetooth} icons aria-label="Bluetooth" />}
      >
        Bluetooth
      </ListItem>
      {['Payment alerts', 'Weekly digest', 'Product news'].map((t, i) => (
        <ListItem
          key={t}
          leading={<Icon name="notifications" size={20} />}
          trailing={
            <Checkbox
              checked={alerts[i]}
              onCheckedChange={(v) => setAlerts((a) => a.map((x, k) => (k === i ? v : x)))}
              aria-label={t}
            />
          }
        >
          {t}
        </ListItem>
      ))}
    </List>
  );
}

function ExpandableList() {
  const [open, setOpen] = useState(true);
  const [last, setLast] = useState('—');
  const sub = (items: string[]) =>
    items.map((t) => (
      <ListItem key={t} trailing={<Icon name="chevron_right" size={20} />} onClick={() => setLast(t)}>
        {t}
      </ListItem>
    ));
  return (
    <>
      <List variant="segmented" aria-label="Preferences" sx={s.list}>
        <ExpandableListItem
          leading={<Icon name="display_settings" size={20} />}
          supportingText="Brightness, theme, text size"
          open={open}
          onOpenChange={setOpen}
          items={sub(['Brightness', 'Dark theme', 'Text size'])}
        >
          Display
        </ExpandableListItem>
        <ExpandableListItem
          leading={<Icon name="lock" size={20} />}
          supportingText="Passcode, devices"
          items={sub(['Change passcode', 'Trusted devices'])}
        >
          Security
        </ExpandableListItem>
        <ExpandableListItem leading={<Icon name="notifications" size={20} />} items={sub(['Push', 'Email', 'SMS'])}>
          Notifications
        </ExpandableListItem>
      </List>
      <p {...stylex.props(typescale.bodyMedium, s.note)}>
        Display is {open ? 'open' : 'closed'} · last chosen: {last}
      </p>
    </>
  );
}

function SwipeList() {
  const [messages, setMessages] = useState(MESSAGES);
  const [log, setLog] = useState('—');
  const actions: SwipeAction[] = [
    { icon: <Icon name="star" />, label: 'Star', onAction: () => setLog('Starred') },
    { icon: <Icon name="drive_file_move" />, label: 'Move', onAction: () => setLog('Moved') },
    { icon: <Icon name="mark_email_read" />, label: 'Mark read', onAction: () => setLog('Marked read') },
  ];
  const archive = (t: string): SwipeAction => ({
    icon: <Icon name="archive" />,
    label: 'Archive',
    onAction: () => {
      setLog(`Archived “${t}”`);
      setTimeout(() => setMessages((m) => m.filter((x) => x !== t)), 300);
    },
  });
  return (
    <>
      <List variant="segmented" aria-label="Messages" sx={s.list}>
        {messages.map((t) => (
          <SwipeableListItem
            key={t}
            actions={actions}
            swipeAction={archive(t)}
            leading={<Icon name="mail" size={20} />}
            supportingText="Swipe left for actions"
          >
            {t}
          </SwipeableListItem>
        ))}
      </List>
      <div {...stylex.props(s.footer)}>
        <span {...stylex.props(typescale.bodyMedium, s.note)}>Last action: {log}</span>
        <Button
          variant="text"
          size="small"
          disabled={messages.length === MESSAGES.length}
          onClick={() => setMessages(MESSAGES)}
        >
          Restore
        </Button>
      </div>
    </>
  );
}

function LiftedList() {
  const [lifted, setLifted] = useState(true);
  return (
    <>
      <List aria-label="Queue" sx={s.list}>
        {['Pay suppliers', 'Approve expenses', 'Send invoices'].map((t, i) => (
          <ListItem
            key={t}
            leading={<Icon name="task_alt" size={20} />}
            trailing={<Icon name="drag_indicator" size={20} />}
            dragged={lifted && i === 1}
          >
            {t}
          </ListItem>
        ))}
      </List>
      <div {...stylex.props(s.footer)}>
        <span {...stylex.props(typescale.bodyMedium, s.note)}>The state your drag-and-drop layer applies.</span>
        <Button variant="tonal" size="small" onClick={() => setLifted((v) => !v)}>
          {lifted ? 'Drop' : 'Lift'}
        </Button>
      </div>
    </>
  );
}

function BaselineControls() {
  const [checks, setChecks] = useState([true, false]);
  const [sync, setSync] = useState(true);
  return (
    <List variant="baseline" aria-label="Sync settings" sx={s.list}>
      {['Contacts', 'Calendar'].map((t, i) => (
        <ListItem
          key={t}
          leading={<ListItemMonogram>{t[0]}</ListItemMonogram>}
          trailing={
            <Checkbox
              checked={checks[i]}
              onCheckedChange={(v) => setChecks((c) => c.map((x, k) => (k === i ? v : x)))}
              aria-label={`Sync ${t}`}
            />
          }
          supportingText={i === 0 ? '312 contacts' : undefined}
        >
          {t}
        </ListItem>
      ))}
      <ListItem trailing={<Switch checked={sync} onCheckedChange={setSync} aria-label="Auto-sync" />}>
        Auto-sync
      </ListItem>
    </List>
  );
}

export default function ListsPage() {
  return (
    <Page
      title="Lists"
      summary="Continuous, vertical indexes of text and images. Expressive lists come standard or segmented, with items that expand, swipe and lift; the baseline list keeps the classic 56 / 72 / 88px rows."
    >
      <Section
        title="Standard and segmented"
        description="Selection is owned by the list: each item shows the selected look it is given. Hover, press and select to watch the corners morph."
      >
        <Demo
          title="Standard"
          column
          code={`
const [selected, setSelected] = useState(0);

<List aria-label="Folders">
  {folders.map((f, i) => (
    <ListItem
      key={f.name}
      leading={<Icon name={f.icon} size={20} />}
      trailing={<Icon name="chevron_right" size={20} />}
      supportingText={\`\${f.count} conversations\`}
      selected={selected === i}
      onClick={() => setSelected(i)}
    >
      {f.name}
    </ListItem>
  ))}
</List>`}
        >
          <SelectableList variant="standard" />
        </Demo>
        <Demo
          title="Segmented"
          column
          code={`
<List variant="segmented" aria-label="Folders">
  <ListItem leading={<Icon name="inbox" size={20} />} selected onClick={select}>
    Inbox
  </ListItem>
  <ListItem leading={<Icon name="star" size={20} />} onClick={select}>
    Starred
  </ListItem>
</List>`}
        >
          <SelectableList variant="segmented" />
        </Demo>
      </Section>

      <Section title="Leading content" description="Icons, avatars, monograms, image and video thumbnails.">
        <Demo
          title="Avatars and monograms"
          column
          code={`
<List aria-label="People">
  <ListItem leading={<Avatar>A</Avatar>} supportingText="Finance director">
    Amelia Hart
  </ListItem>
  <ListItem leading={<ListItemMonogram>B</ListItemMonogram>} supportingText="Operations lead">
    Ben Okafor
  </ListItem>
</List>`}
        >
          <List aria-label="People" sx={s.list}>
            {PEOPLE.map((p, i) => (
              <ListItem
                key={p.name}
                leading={i === 1 ? <ListItemMonogram>{p.initial}</ListItemMonogram> : <Avatar>{p.initial}</Avatar>}
                supportingText={p.role}
                trailing={<Icon name="mail" size={20} />}
                href="#/lists"
              >
                {p.name}
              </ListItem>
            ))}
          </List>
        </Demo>
        <Demo
          title="Images (multi-select)"
          column
          code={`
<List variant="segmented" aria-label="Photos">
  <ListItem
    leading={<ListItemImage src={thumbnail} alt="" />}
    supportingText="6 photos"
    selected={picked.includes(id)}
    onClick={() => toggle(id)}
  >
    Harbour at dawn
  </ListItem>
</List>`}
        >
          <ImageList />
        </Demo>
        <Demo
          title="Video"
          column
          code={`
<ListItem
  leading={<ListItemVideo src={poster} alt="" />}
  supportingText="12:04"
  alignment="top"
>
  Getting started
</ListItem>`}
        >
          <List aria-label="Videos" sx={s.list}>
            {['Getting started', 'Paying your team', 'Year-end checklist'].map((t, i) => (
              <ListItem
                key={t}
                leading={<ListItemVideo sx={ART[(i + 1) % ART.length]} />}
                supportingText={`${8 + i * 3}:0${i} · Tutorial`}
                alignment="top"
              >
                {t}
              </ListItem>
            ))}
          </List>
        </Demo>
        <Demo
          title="Top alignment"
          column
          code={`
<ListItem
  leading={<Avatar>A</Avatar>}
  overline="Amelia Hart"
  supportingText="The figures for Q3 are in, and the summary is attached for review before Friday."
  supportingMaxLines={2}
  trailingText="09:41"
  alignment="top"
>
  Quarterly summary
</ListItem>`}
        >
          <List variant="segmented" aria-label="Inbox" sx={s.list}>
            {[
              [
                'Amelia Hart',
                'Quarterly summary',
                'The figures for Q3 are in, and the summary is attached for review before Friday.',
                '09:41',
              ],
              [
                'Ben Okafor',
                'Supplier onboarding',
                'Two new suppliers need approval. Their bank details have been verified.',
                'Tue',
              ],
            ].map(([from, subject, preview, time]) => (
              <ListItem
                key={subject}
                leading={<Avatar>{from![0]}</Avatar>}
                overline={from}
                supportingText={preview}
                supportingMaxLines={2}
                trailingText={time}
                alignment="top"
              >
                {subject}
              </ListItem>
            ))}
          </List>
        </Demo>
      </Section>

      <Section title="Trailing content" description="Controls, icons and supporting text at the end of a row.">
        <Demo
          title="Switches and checkboxes"
          column
          code={`
<List variant="segmented" aria-label="Settings">
  <ListItem
    leading={<Icon name="wifi" size={20} />}
    trailing={<Switch checked={wifi} onCheckedChange={setWifi} aria-label="Wi-Fi" />}
  >
    Wi-Fi
  </ListItem>
  <ListItem
    trailing={<Checkbox checked={alerts} onCheckedChange={setAlerts} aria-label="Payment alerts" />}
  >
    Payment alerts
  </ListItem>
</List>`}
        >
          <ControlsList />
        </Demo>
        <Demo
          title="Trailing text"
          column
          code={`
<List aria-label="Edit">
  <ListItem leading={<Icon name="content_cut" size={20} />} trailingText="⌘X">Cut</ListItem>
  <ListItem leading={<Icon name="content_copy" size={20} />} trailingText="⌘C">Copy</ListItem>
  <ListItem leading={<Icon name="content_paste" size={20} />} trailingText="⌘V">Paste</ListItem>
</List>`}
        >
          <List aria-label="Edit" sx={s.list}>
            {[
              ['content_cut', 'Cut', '⌘X'],
              ['content_copy', 'Copy', '⌘C'],
              ['content_paste', 'Paste', '⌘V'],
              ['select_all', 'Select all', '⌘A'],
            ].map(([icon, label, key]) => (
              <ListItem key={label} leading={<Icon name={icon!} size={20} />} trailingText={key}>
                {label}
              </ListItem>
            ))}
          </List>
        </Demo>
      </Section>

      <Section
        title="Expandable and swipeable"
        description="The accordion button reveals nested items; swiping a row left reveals actions, and a full swipe runs the primary one. Both have keyboard paths (Enter on the accordion, arrow keys on a swipeable row)."
      >
        <Demo
          title="Expandable"
          column
          code={`
const [open, setOpen] = useState(true);

<List variant="segmented" aria-label="Preferences">
  <ExpandableListItem
    leading={<Icon name="display_settings" size={20} />}
    supportingText="Brightness, theme, text size"
    open={open}
    onOpenChange={setOpen}
    items={
      <>
        <ListItem onClick={...}>Brightness</ListItem>
        <ListItem onClick={...}>Dark theme</ListItem>
      </>
    }
  >
    Display
  </ExpandableListItem>
</List>`}
        >
          <ExpandableList />
        </Demo>
        <Demo
          title="Swipeable"
          column
          code={`
const actions: SwipeAction[] = [
  { icon: <Icon name="star" />, label: 'Star', onAction: star },
  { icon: <Icon name="drive_file_move" />, label: 'Move', onAction: move },
];

<List variant="segmented" aria-label="Messages">
  <SwipeableListItem
    actions={actions}
    swipeAction={{ icon: <Icon name="archive" />, label: 'Archive', onAction: archive }}
    leading={<Icon name="mail" size={20} />}
  >
    Quarterly summary
  </SwipeableListItem>
</List>`}
        >
          <SwipeList />
        </Demo>
      </Section>

      <Section title="States" description="Disabled items, and the lifted look of an item being reordered.">
        <Demo
          title="Disabled"
          column
          code={`
<ListItem leading={<Icon name="cloud_upload" size={20} />} disabled>
  Back up now
</ListItem>`}
        >
          <List variant="segmented" aria-label="Backup" sx={s.list}>
            <ListItem leading={<Icon name="cloud_done" size={20} />} supportingText="Today, 09:41">
              Last backup
            </ListItem>
            <ListItem leading={<Icon name="cloud_upload" size={20} />} supportingText="Connect to Wi-Fi first" disabled>
              Back up now
            </ListItem>
            <ListItem
              leading={<Icon name="sync" size={20} />}
              trailing={<Switch disabled defaultChecked aria-label="Sync on mobile data" />}
              disabled
            >
              Sync on mobile data
            </ListItem>
          </List>
        </Demo>
        <Demo
          title="Lifted (dragged)"
          column
          code={`
<ListItem
  leading={<Icon name="task_alt" size={20} />}
  trailing={<Icon name="drag_indicator" size={20} />}
  dragged={isDragging}
>
  Approve expenses
</ListItem>`}
        >
          <LiftedList />
        </Demo>
      </Section>

      <Section
        title="Baseline"
        description="The classic M3 list: one, two and three line rows, with an overline, dividers and controls."
      >
        <Demo
          title="One, two and three lines"
          column
          code={`
<List variant="baseline" aria-label="Accounts">
  <ListItem leading={<Icon name="account_balance" />}>Current account</ListItem>
  <ListItem leading={<Icon name="savings" />} supportingText="Instant access">
    Savings
  </ListItem>
  <ListItem
    leading={<Icon name="request_quote" />}
    overline="Due 28 Oct"
    supportingText="Quarterly VAT return for the period ending 30 September."
  >
    VAT return
  </ListItem>
</List>`}
        >
          <List variant="baseline" aria-label="Accounts" sx={s.list}>
            <ListItem leading={<Icon name="account_balance" />} trailingText="£12,480" divider>
              Current account
            </ListItem>
            <ListItem leading={<Icon name="savings" />} supportingText="Instant access" trailingText="£40,200" divider>
              Savings
            </ListItem>
            <ListItem
              leading={<Icon name="request_quote" />}
              overline="Due 28 Oct"
              supportingText="Quarterly VAT return for the period ending 30 September."
              supportingMaxLines={2}
            >
              VAT return
            </ListItem>
          </List>
        </Demo>
        <Demo
          title="With controls"
          column
          code={`
<List variant="baseline" aria-label="Sync settings">
  <ListItem
    leading={<ListItemMonogram>C</ListItemMonogram>}
    trailing={<Checkbox checked={contacts} onCheckedChange={setContacts} aria-label="Sync contacts" />}
  >
    Contacts
  </ListItem>
  <ListItem trailing={<Switch checked={sync} onCheckedChange={setSync} aria-label="Auto-sync" />}>
    Auto-sync
  </ListItem>
</List>`}
        >
          <BaselineControls />
        </Demo>
      </Section>
    </Page>
  );
}
