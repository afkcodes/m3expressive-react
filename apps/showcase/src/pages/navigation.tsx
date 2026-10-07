import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Badge,
  ExtendedFab,
  IconButton,
  NavigationBar,
  NavigationItem,
  NavigationRail,
  NavigationRailSection,
  Switch,
  typescale,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const s = stylex.create({
  // A small "window" the navigation sits in: content above / beside, the component at its edge.
  frame: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    overflow: 'hidden',
    borderRadius: shape.cornerLarge,
    backgroundColor: color.surface,
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: color.outlineVariant,
    outlineOffset: -1,
  },
  phone: { maxWidth: 412, height: 280 },
  tablet: { maxWidth: 840, height: 220 },
  railFrame: { flexDirection: 'row', height: 600 },
  railFrameShort: { flexDirection: 'row', height: 360 },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flexGrow: 1,
    minWidth: 0,
    padding: 24,
    color: color.onSurfaceVariant,
  },
  heading: { margin: 0, color: color.onSurface },
  text: { margin: 0 },
  controls: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 },
  control: { display: 'flex', alignItems: 'center', gap: 12, color: color.onSurface, cursor: 'pointer' },
  railSlot: { display: 'flex', flexShrink: 0 },
  floatingPad: { padding: 12 },
  // Workaround (library): a horizontal item's label box hugs at ceil(advance − tracking) but also
  // ellipsises, so Chrome cuts most labels ("Ho…"). A 1px zero-height float widens the hug box
  // without taking room from the line.
  hugFix: { float: 'right', width: 1, height: 0 },
});

interface Destination {
  label: string;
  icon: string;
  badge?: ReactNode;
  /** `small` for a dot badge. */
  badgeSize?: 'small' | 'large';
  disabled?: boolean;
}

const BAR: readonly Destination[] = [
  { label: 'Home', icon: 'home' },
  { label: 'Inbox', icon: 'inbox', badge: <Badge count={3} /> },
  { label: 'Saved', icon: 'bookmark', badge: <Badge />, badgeSize: 'small' },
  { label: 'Profile', icon: 'person' },
];
const WIDE_BAR: readonly Destination[] = [
  { label: 'Home', icon: 'home' },
  { label: 'Inbox', icon: 'inbox', badge: <Badge />, badgeSize: 'small' },
  { label: 'Saved', icon: 'bookmark' },
];
const SHORT_BAR: readonly Destination[] = [
  { label: 'Explore', icon: 'explore' },
  { label: 'Trips', icon: 'luggage' },
  { label: 'Offline', icon: 'cloud_off', disabled: true },
];

/** One destination: outlined icon, filled when selected, with an optional badge. */
function item(d: Destination, value: number, hugFix = false) {
  return (
    <NavigationItem
      key={d.label}
      value={value}
      label={
        hugFix ? (
          <>
            {d.label}
            <span aria-hidden {...stylex.props(s.hugFix)} />
          </>
        ) : (
          d.label
        )
      }
      icon={<Icon name={d.icon} />}
      selectedIcon={<Icon name={d.icon} filled />}
      badge={d.badge}
      badgeSize={d.badgeSize}
      disabled={d.disabled}
    />
  );
}

function BarDemo({
  destinations,
  layout = 'vertical',
  note,
}: {
  destinations: readonly Destination[];
  layout?: 'vertical' | 'horizontal';
  note: string;
}) {
  const [value, setValue] = useState<unknown>(0);
  return (
    <div {...stylex.props(s.frame, layout === 'horizontal' ? s.tablet : s.phone)}>
      <div {...stylex.props(s.content)}>
        <h4 {...stylex.props(typescale.titleLarge, s.heading)}>{destinations[value as number]!.label}</h4>
        <p {...stylex.props(typescale.bodyMedium, s.text)}>{note}</p>
      </div>
      <NavigationBar value={value} onValueChange={setValue} layout={layout} aria-label="Main">
        {destinations.map((d, i) => item(d, i, layout === 'horizontal'))}
      </NavigationBar>
    </div>
  );
}

const MAIL: readonly Destination[] = [
  { label: 'Inbox', icon: 'inbox', badge: <Badge count={12} /> },
  { label: 'Starred', icon: 'star' },
  { label: 'Sent', icon: 'send' },
];
const LABELS: readonly Destination[] = [
  { label: 'Work', icon: 'work', badge: <Badge />, badgeSize: 'small' },
  { label: 'Travel', icon: 'flight' },
];

function RailDemo() {
  const [value, setValue] = useState<unknown>(0);
  const [expanded, setExpanded] = useState(false);
  const [floating, setFloating] = useState(false);
  const [middle, setMiddle] = useState(false);
  const all = [...MAIL, ...LABELS];
  const rail = (
    <NavigationRail
      value={value}
      onValueChange={setValue}
      expanded={expanded}
      layout={floating ? 'floating' : 'docked'}
      alignment={middle ? 'middle' : 'top'}
      aria-label="Mail"
      header={
        <>
          <IconButton
            size="medium"
            shape="square"
            aria-label="Expand navigation"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            <Icon name={expanded ? 'menu_open' : 'menu'} />
          </IconButton>
          <ExtendedFab size="small" elevated={false} expanded={expanded} icon={<Icon name="edit" />}>
            Compose
          </ExtendedFab>
        </>
      }
    >
      <NavigationRailSection>{MAIL.map((d, i) => item(d, i))}</NavigationRailSection>
      {/* Section headers belong to the expanded rail. */}
      <NavigationRailSection label={expanded ? 'Labels' : undefined}>
        {LABELS.map((d, i) => item(d, MAIL.length + i))}
      </NavigationRailSection>
    </NavigationRail>
  );
  return (
    <div {...stylex.props(s.frame, s.railFrame)}>
      <div {...stylex.props(s.railSlot, floating && expanded && s.floatingPad)}>{rail}</div>
      <div {...stylex.props(s.content)}>
        <h4 {...stylex.props(typescale.titleLarge, s.heading)}>{all[value as number]!.label}</h4>
        <p {...stylex.props(typescale.bodyMedium, s.text)}>
          The menu button expands the rail to 220px: every item morphs on the default spatial spring, and the FAB
          extends to show its label.
        </p>
        <div {...stylex.props(s.controls)}>
          <label {...stylex.props(typescale.bodyLarge, s.control)}>
            <Switch checked={expanded} onCheckedChange={setExpanded} />
            Expanded
          </label>
          <label {...stylex.props(typescale.bodyLarge, s.control)}>
            <Switch checked={floating} onCheckedChange={setFloating} />
            Floating (expanded rails)
          </label>
          <label {...stylex.props(typescale.bodyLarge, s.control)}>
            <Switch checked={middle} onCheckedChange={setMiddle} />
            Middle alignment
          </label>
        </div>
      </div>
    </div>
  );
}

function NoLabelsRail() {
  const [value, setValue] = useState<unknown>(0);
  return (
    <div {...stylex.props(s.frame, s.railFrameShort)}>
      <NavigationRail value={value} onValueChange={setValue} showLabels={false} aria-label="Mail">
        {MAIL.map((d, i) => item(d, i))}
      </NavigationRail>
      <div {...stylex.props(s.content)}>
        <h4 {...stylex.props(typescale.titleLarge, s.heading)}>{MAIL[value as number]!.label}</h4>
        <p {...stylex.props(typescale.bodyMedium, s.text)}>
          Without labels the items keep their names for assistive technology.
        </p>
      </div>
    </div>
  );
}

export default function NavigationPage() {
  return (
    <Page
      title="Navigation bar & rail"
      summary="Navigation bars switch between a few top-level destinations on compact windows; rails do the same along the side of larger ones, and expand to show more."
    >
      <Section
        title="Navigation bar"
        description="Three to five destinations at the bottom of the screen. Items are vertical (icon over label) on compact windows and horizontal on medium ones."
      >
        <Demo
          title="Vertical items"
          code={`
const [value, setValue] = useState<unknown>(0);

<NavigationBar value={value} onValueChange={setValue} aria-label="Main">
  <NavigationItem value={0} label="Home" icon={<Icon name="home" />} selectedIcon={<Icon name="home" filled />} />
  <NavigationItem value={1} label="Inbox" icon={<Icon name="inbox" />} badge={<Badge count={3} />} />
  <NavigationItem value={2} label="Saved" icon={<Icon name="bookmark" />} badge={<Badge />} badgeSize="small" />
  <NavigationItem value={3} label="Profile" icon={<Icon name="person" />} />
</NavigationBar>`}
        >
          <BarDemo
            destinations={BAR}
            note="The selected pill grows from its centre and the icon swaps to its filled glyph."
          />
        </Demo>
        <Demo
          title="Disabled destination"
          code={`
<NavigationBar defaultValue={0} aria-label="Main">
  <NavigationItem value={0} label="Explore" icon={<Icon name="explore" />} />
  <NavigationItem value={1} label="Trips" icon={<Icon name="luggage" />} />
  <NavigationItem value={2} label="Offline" icon={<Icon name="cloud_off" />} disabled />
</NavigationBar>`}
        >
          <BarDemo destinations={SHORT_BAR} note="A disabled item stays in place at 38% opacity." />
        </Demo>
        <Demo
          wide
          title="Horizontal items"
          code={`
<NavigationBar layout="horizontal" value={value} onValueChange={setValue} aria-label="Main">
  <NavigationItem value={0} label="Home" icon={<Icon name="home" />} />
  <NavigationItem value={1} label="Inbox" icon={<Icon name="inbox" />} badge={<Badge />} badgeSize="small" />
  <NavigationItem value={2} label="Saved" icon={<Icon name="bookmark" />} />
</NavigationBar>`}
        >
          <BarDemo
            destinations={WIDE_BAR}
            layout="horizontal"
            note="Medium windows put the label beside the icon; the bar insets its items 40px per missing item."
          />
        </Demo>
      </Section>

      <Section
        title="Navigation rail"
        description="A collapsed rail (96px) with an optional menu button and FAB; expanded (220px) it shows labels beside the icons and section headers. Expanding is controlled: your menu button toggles it."
      >
        <Demo
          wide
          title="Collapsed and expanded, with sections, a FAB and badges"
          code={`
const [value, setValue] = useState<unknown>(0);
const [expanded, setExpanded] = useState(false);

<NavigationRail
  value={value}
  onValueChange={setValue}
  expanded={expanded}
  layout="docked" // or "floating" (expanded rails)
  aria-label="Mail"
  header={
    <>
      <IconButton size="medium" shape="square" aria-label="Expand navigation" aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}>
        <Icon name="menu" />
      </IconButton>
      <ExtendedFab size="small" elevated={false} expanded={expanded} icon={<Icon name="edit" />}>
        Compose
      </ExtendedFab>
    </>
  }
>
  <NavigationRailSection>
    <NavigationItem value={0} label="Inbox" icon={<Icon name="inbox" />} badge={<Badge count={12} />} />
    <NavigationItem value={1} label="Starred" icon={<Icon name="star" />} />
    <NavigationItem value={2} label="Sent" icon={<Icon name="send" />} />
  </NavigationRailSection>
  <NavigationRailSection label={expanded ? 'Labels' : undefined}>
    <NavigationItem value={3} label="Work" icon={<Icon name="work" />} badge={<Badge />} badgeSize="small" />
    <NavigationItem value={4} label="Travel" icon={<Icon name="flight" />} />
  </NavigationRailSection>
</NavigationRail>`}
        >
          <RailDemo />
        </Demo>
        <Demo
          title="Without labels"
          code={`
<NavigationRail showLabels={false} value={value} onValueChange={setValue} aria-label="Mail">
  <NavigationItem value={0} label="Inbox" icon={<Icon name="inbox" />} badge={<Badge count={12} />} />
  <NavigationItem value={1} label="Starred" icon={<Icon name="star" />} />
  <NavigationItem value={2} label="Sent" icon={<Icon name="send" />} />
</NavigationRail>`}
        >
          <NoLabelsRail />
        </Demo>
      </Section>
    </Page>
  );
}
