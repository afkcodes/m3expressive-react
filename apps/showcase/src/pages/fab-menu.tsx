import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { FabMenu, FabMenuItem, typescale, type FabMenuColor } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const COLORS: FabMenuColor[] = ['primary', 'secondary', 'tertiary'];

const cap = (v: string) => v[0]!.toUpperCase() + v.slice(1);

const s = stylex.create({
  // Room above the FABs for the open menus, so opening one doesn't move the page.
  bay: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 48,
    width: '100%',
    minHeight: 360,
  },
  // A fixed width keeps neighbours still while a menu opens wider than its FAB.
  item: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, width: 200 },
  caption: { color: color.onSurfaceVariant },
  screen: {
    position: 'relative',
    width: '100%',
    height: 420,
    borderRadius: shape.cornerExtraLarge,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  screenText: { display: 'flex', flexDirection: 'column', gap: 4, padding: 24 },
  title: { margin: 0, color: color.onSurface },
  status: { margin: 0, color: color.onSurfaceVariant },
  corner: { position: 'absolute', insetInlineEnd: 16, bottom: 16 },
});

function ComposeMenu() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  const actions = [
    { icon: 'mail', label: 'Email' },
    { icon: 'chat', label: 'Message' },
    { icon: 'event', label: 'Event' },
    { icon: 'task_alt', label: 'Task' },
  ];
  return (
    <div {...stylex.props(s.screen)}>
      <div {...stylex.props(s.screenText)}>
        <p {...stylex.props(typescale.titleLarge, s.title)}>Inbox</p>
        <p {...stylex.props(typescale.bodyMedium, s.status)}>Menu {open ? 'open' : 'closed'}</p>
        <p {...stylex.props(typescale.bodyMedium, s.status)}>
          {last ? `Last action: new ${last.toLowerCase()}` : 'Choose an action from the FAB menu.'}
        </p>
      </div>
      <FabMenu aria-label="Create" icon={<Icon name="add" />} open={open} onOpenChange={setOpen} sx={s.corner}>
        {actions.map((a) => (
          <FabMenuItem key={a.label} icon={<Icon name={a.icon} />} onClick={() => setLast(a.label)}>
            {a.label}
          </FabMenuItem>
        ))}
      </FabMenu>
    </div>
  );
}

export default function FabMenuPage() {
  return (
    <Page
      title="FAB menu"
      summary="A FAB that opens a short menu of related actions. The FAB morphs into a close button and the items spring in, staggered. Arrow keys move between items; Escape closes."
    >
      <Section
        title="Colours"
        description="Each colour is a set: items use the container role, the open toggle the full colour."
      >
        <Demo
          wide
          code={`
<FabMenu aria-label="Create" color="secondary" icon={<Icon name="add" />}>
  <FabMenuItem icon={<Icon name="mail" />}>Email</FabMenuItem>
  <FabMenuItem icon={<Icon name="chat" />}>Message</FabMenuItem>
  <FabMenuItem icon={<Icon name="event" />}>Event</FabMenuItem>
</FabMenu>`}
        >
          <div {...stylex.props(s.bay)}>
            {COLORS.map((c) => (
              <div key={c} {...stylex.props(s.item)}>
                <FabMenu aria-label={`Create (${c})`} color={c} icon={<Icon name="add" />}>
                  <FabMenuItem icon={<Icon name="mail" />}>Email</FabMenuItem>
                  <FabMenuItem icon={<Icon name="chat" />}>Message</FabMenuItem>
                  <FabMenuItem icon={<Icon name="event" />}>Event</FabMenuItem>
                </FabMenu>
                <span {...stylex.props(typescale.labelMedium, s.caption)}>{cap(c)}</span>
              </div>
            ))}
          </div>
        </Demo>
      </Section>

      <Section
        title="In a screen"
        description="Controlled with open and onOpenChange; choosing an item closes the menu (closeOnClick, default true)."
      >
        <Demo
          wide
          column
          code={`
const [open, setOpen] = useState(false);

<FabMenu aria-label="Create" icon={<Icon name="add" />} open={open} onOpenChange={setOpen}>
  <FabMenuItem icon={<Icon name="mail" />} onClick={() => compose('email')}>
    Email
  </FabMenuItem>
  <FabMenuItem icon={<Icon name="chat" />} onClick={() => compose('message')}>
    Message
  </FabMenuItem>
</FabMenu>`}
        >
          <ComposeMenu />
        </Demo>
      </Section>
    </Page>
  );
}
