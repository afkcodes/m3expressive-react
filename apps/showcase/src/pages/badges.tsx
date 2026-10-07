import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Badge, Button, IconButton, NavigationBar, NavigationItem, Slider, typescale } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const s = stylex.create({
  cell: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, minWidth: 72 },
  // Every badge sits in a 16px slot so the captions line up.
  slot: { display: 'flex', alignItems: 'center', height: 16 },
  caption: { color: color.onSurfaceVariant },
  // A 24px icon slot the badge is anchored to (M3: the badge overlaps the icon's top end).
  anchor: { position: 'relative', display: 'inline-flex', width: 24, height: 24, color: color.onSurfaceVariant },
  // Offsets measured from the navigation item: dot 18 / 0, large badge 12 / -2 from the icon's corner.
  dot: { position: 'absolute', insetInlineStart: 18, top: 0 },
  large: { position: 'absolute', insetInlineStart: 12, top: -2 },
  bar: { width: '100%', maxWidth: 412, alignSelf: 'center', borderRadius: 16, overflow: 'hidden' },
  center: { alignSelf: 'center' },
  controls: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 },
  slider: { width: '100%', maxWidth: 320 },
  value: { color: color.onSurfaceVariant, minWidth: 120, textAlign: 'center' },
});

/** A 24px icon with a badge on its top end corner. */
function BadgedIcon({ name, badge }: { name: string; badge: ReactNode }) {
  return (
    <span {...stylex.props(s.anchor)}>
      <Icon name={name} />
      {badge}
    </span>
  );
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div {...stylex.props(s.cell)}>
      <span {...stylex.props(s.slot)}>{children}</span>
      <span {...stylex.props(typescale.labelMedium, s.caption)}>{label}</span>
    </div>
  );
}

function CounterDemo() {
  const [count, setCount] = useState(3);
  return (
    <Demo
      title="Live count"
      column
      code={`
const [count, setCount] = useState(3);

<IconButton aria-label={\`Notifications, \${count} new\`}>
  <Icon name="notifications" />
  {count > 0 && <Badge count={count} sx={styles.large} />}
</IconButton>`}
    >
      <div {...stylex.props(s.controls)}>
        <IconButton aria-label={count > 0 ? `Notifications, ${count} new` : 'Notifications'} variant="tonal">
          <Icon name="notifications" />
          {count > 0 && <Badge count={count} sx={s.large} />}
        </IconButton>
        <span {...stylex.props(typescale.bodyMedium, s.value)}>
          {count === 0 ? 'No new notifications' : `${count} new`}
        </span>
      </div>
      <div {...stylex.props(s.controls)}>
        <Button
          variant="tonal"
          size="small"
          icon={<Icon name="add" size={20} />}
          onClick={() => setCount((c) => c + 1)}
        >
          One more
        </Button>
        <Button variant="tonal" size="small" onClick={() => setCount((c) => c + 100)}>
          +100
        </Button>
        <Button variant="text" size="small" onClick={() => setCount(0)}>
          Mark all read
        </Button>
      </div>
    </Demo>
  );
}

function MaxDemo() {
  const [count, setCount] = useState(120);
  return (
    <Demo
      title="Capped at max"
      column
      code={`
<Badge count={120} max={99} />   // 99+
<Badge count={1200} />           // 999+ (default max)`}
    >
      <div {...stylex.props(s.controls)}>
        <Labelled label="max 9">
          <Badge count={count} max={9} />
        </Labelled>
        <Labelled label="max 99">
          <Badge count={count} max={99} />
        </Labelled>
        <Labelled label="max 999 (default)">
          <Badge count={count} />
        </Labelled>
      </div>
      <div {...stylex.props(s.controls)}>
        <div {...stylex.props(s.slider)}>
          <Slider aria-label="Count" min={0} max={1500} step={1} value={count} onValueChange={setCount} />
        </div>
      </div>
      <span {...stylex.props(typescale.bodyMedium, s.value)}>count = {count}</span>
    </Demo>
  );
}

function NavigationDemo() {
  const [value, setValue] = useState<unknown>('home');
  const [unread, setUnread] = useState(12);
  const select = (v: unknown) => {
    setValue(v);
    if (v === 'chat') setUnread(0);
  };
  return (
    <Demo
      title="In a navigation bar"
      wide
      column
      code={`
<NavigationBar value={value} onValueChange={setValue} aria-label="Main">
  <NavigationItem value="home" label="Home" icon={<Icon name="home" />} />
  <NavigationItem
    value="chat"
    label="Chat"
    icon={<Icon name="chat" />}
    badge={unread > 0 ? <Badge count={unread} /> : undefined}
  />
  <NavigationItem
    value="activity"
    label="Activity"
    icon={<Icon name="notifications" />}
    badge={<Badge />}
    badgeSize="small"
  />
  <NavigationItem value="profile" label="Profile" icon={<Icon name="person" />} />
</NavigationBar>`}
    >
      <div {...stylex.props(s.bar)}>
        <NavigationBar value={value} onValueChange={select} aria-label="Badges example">
          <NavigationItem
            value="home"
            label="Home"
            icon={<Icon name="home" />}
            selectedIcon={<Icon name="home" filled />}
          />
          <NavigationItem
            value="chat"
            label="Chat"
            icon={<Icon name="chat" />}
            selectedIcon={<Icon name="chat" filled />}
            badge={unread > 0 ? <Badge count={unread} /> : undefined}
          />
          <NavigationItem
            value="activity"
            label="Activity"
            icon={<Icon name="notifications" />}
            selectedIcon={<Icon name="notifications" filled />}
            badge={<Badge />}
            badgeSize="small"
          />
          <NavigationItem
            value="profile"
            label="Profile"
            icon={<Icon name="person" />}
            selectedIcon={<Icon name="person" filled />}
          />
        </NavigationBar>
      </div>
      <Button variant="text" size="small" sx={s.center} disabled={unread > 0} onClick={() => setUnread(12)}>
        Restore unread messages
      </Button>
    </Demo>
  );
}

export default function BadgesPage() {
  return (
    <Page
      title="Badges"
      summary="Badges show notifications, counts or status on navigation items and icons. A small dot says “something new”; a large badge carries a count or a short label of up to four characters."
    >
      <Section title="Sizes" description="Small badges are a 6px dot; large badges hug a count or label.">
        <Demo
          wide
          code={`
<Badge />                 // small dot
<Badge count={3} />
<Badge count={42} />
<Badge count={1200} />    // 999+
<Badge>New</Badge>`}
        >
          <Labelled label="Small">
            <Badge />
          </Labelled>
          <Labelled label="Single digit">
            <Badge count={3} />
          </Labelled>
          <Labelled label="Two digits">
            <Badge count={42} />
          </Labelled>
          <Labelled label="Over max">
            <Badge count={1200} />
          </Labelled>
          <Labelled label="Text">
            <Badge>New</Badge>
          </Labelled>
        </Demo>
      </Section>

      <Section
        title="On icons"
        description="Anchor a badge to the top end corner of a 24px icon. Put the count in the control's accessible name; the badge itself is decorative."
      >
        <Demo
          title="Icons"
          code={`
<span className={anchor}>          // position: relative; 24×24
  <Icon name="mail" />
  <Badge sx={styles.dot} />         // position: absolute; inset-inline-start: 18; top: 0
</span>
<span className={anchor}>
  <Icon name="shopping_cart" />
  <Badge count={2} sx={styles.large} />  // inset-inline-start: 12; top: -2
</span>`}
        >
          <BadgedIcon name="mail" badge={<Badge sx={s.dot} />} />
          <BadgedIcon name="shopping_cart" badge={<Badge count={2} sx={s.large} />} />
          <BadgedIcon name="forum" badge={<Badge count={48} sx={s.large} />} />
          <BadgedIcon name="notifications" badge={<Badge count={2000} sx={s.large} />} />
        </Demo>
        <Demo
          title="Icon buttons"
          code={`
<IconButton aria-label="Inbox, 8 unread">
  <Icon name="inbox" />
  <Badge count={8} sx={styles.large} />
</IconButton>`}
        >
          <IconButton aria-label="Messages, new">
            <Icon name="chat_bubble" />
            <Badge sx={s.dot} />
          </IconButton>
          <IconButton aria-label="Inbox, 8 unread" variant="tonal">
            <Icon name="inbox" />
            <Badge count={8} sx={s.large} />
          </IconButton>
          <IconButton aria-label="Updates, 120 new" variant="outlined">
            <Icon name="update" />
            <Badge count={120} max={99} sx={s.large} />
          </IconButton>
          <IconButton aria-label="Cart, 3 items" variant="filled">
            <Icon name="shopping_bag" />
            <Badge count={3} sx={s.large} />
          </IconButton>
        </Demo>
        <CounterDemo />
        <MaxDemo />
      </Section>

      <Section
        title="Navigation"
        description="Navigation items take a badge directly and place it for you. Open Chat to clear its count."
      >
        <NavigationDemo />
      </Section>
    </Page>
  );
}
