import { useRef, type ReactNode, type RefObject } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Avatar, BottomAppBar, Fab, IconButton, List, ListItem, TopAppBar, typescale } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const s = stylex.create({
  phone: {
    display: 'flex',
    flexDirection: 'column',
    width: 'min(100%, 412px)',
    height: 400,
    borderRadius: shape.cornerLarge,
    overflow: 'hidden',
    backgroundColor: color.surface,
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: color.outlineVariant,
  },
  scroll: { flexGrow: 1, minHeight: 0, overflowY: 'auto', outlineStyle: 'none' },
  hint: {
    margin: 0,
    paddingInline: 16,
    paddingBlock: 12,
    color: color.onSurfaceVariant,
  },
  static: {
    width: 'min(100%, 412px)',
    borderRadius: shape.cornerLarge,
    overflow: 'hidden',
    backgroundColor: color.surface,
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: color.outlineVariant,
  },
  trio: { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', width: '100%' },
  cell: { flexGrow: 1, flexShrink: 1, flexBasis: 300, minWidth: 0 },
  avatarSlot: { display: 'flex', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  search: {
    flexGrow: 1,
    minWidth: 0,
    height: 48,
    paddingInline: 20,
    borderWidth: 0,
    borderRadius: shape.cornerFull,
    backgroundColor: color.surfaceContainerHigh,
    color: color.onSurface,
    fontFamily: 'inherit',
    fontSize: 16,
    outlineOffset: 2,
    '::placeholder': { color: color.onSurfaceVariant },
  },
  brand: { display: 'flex', alignItems: 'center', columnGap: 8, color: color.primary },
  brandText: { color: color.onSurface },
});

const SENDERS = [
  ['Ana Ruiz', 'Invoice #2041 is ready'],
  ['Ben Okafor', 'Lunch on Thursday?'],
  ['Chloe Martin', 'Updated project timeline'],
  ['Dev Patel', 'Re: supplier contract'],
  ['Elif Kaya', 'Photos from the offsite'],
  ['Finn Murphy', 'Payroll approved'],
  ['Grace Lee', 'Weekly summary'],
  ['Hugo Weber', 'New login from Chrome'],
  ['Isla Brown', 'Quarterly review notes'],
  ['Jonas Berg', 'Your parcel is on its way'],
  ['Kai Tanaka', 'Design crit at 3pm'],
  ['Lena Novak', 'Expense report submitted'],
] as const;

function Inbox({ hint }: { hint: string }) {
  return (
    <>
      <p {...stylex.props(typescale.bodyMedium, s.hint)}>{hint}</p>
      <List aria-label="Messages">
        {SENDERS.map(([name, subject]) => (
          <ListItem key={name} leading={<Avatar>{name[0]}</Avatar>} supportingText={subject} supportingMaxLines={1}>
            {name}
          </ListItem>
        ))}
      </List>
    </>
  );
}

/** A phone-sized frame: the bars around a scroll container the bars watch (`scrollTarget`). */
function Phone({
  scrollRef,
  top,
  bottom,
  hint,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  top?: ReactNode;
  bottom?: ReactNode;
  hint: string;
}) {
  return (
    <div {...stylex.props(s.phone)}>
      {top}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must take focus */}
      <div ref={scrollRef} tabIndex={0} role="region" aria-label="Scrolling content" {...stylex.props(s.scroll)}>
        <Inbox hint={hint} />
      </div>
      {bottom}
    </div>
  );
}

function Action({ icon, label }: { icon: string; label: string }) {
  return (
    <IconButton aria-label={label}>
      <Icon name={icon} />
    </IconButton>
  );
}

function SmallBar() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Phone
      scrollRef={ref}
      hint="Scroll: the bar takes Surface Container once content passes under it."
      top={
        <TopAppBar
          headline="Inbox"
          navigationIcon={<Action icon="menu" label="Menu" />}
          actions={
            <>
              <Action icon="attach_file" label="Attachments" />
              <Action icon="more_vert" label="More options" />
            </>
          }
          scrollTarget={ref}
        />
      }
    />
  );
}

function CentredBar() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Phone
      scrollRef={ref}
      hint="The headline centres across the whole bar."
      top={
        <TopAppBar
          centered
          headline="Messages"
          navigationIcon={<Action icon="arrow_back" label="Back" />}
          actions={
            <span {...stylex.props(s.avatarSlot)}>
              <Avatar size={32}>A</Avatar>
            </span>
          }
          scrollTarget={ref}
        />
      }
    />
  );
}

function MediumBar() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Phone
      scrollRef={ref}
      hint="Scroll: the bar collapses to 64px with the content; stop half-way and it snaps open or shut."
      top={
        <TopAppBar
          size="medium"
          headline="Statements"
          navigationIcon={<Action icon="arrow_back" label="Back" />}
          actions={
            <>
              <Action icon="download" label="Download" />
              <Action icon="more_vert" label="More options" />
            </>
          }
          scrollTarget={ref}
        />
      }
    />
  );
}

function LargeBar() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Phone
      scrollRef={ref}
      hint="The large headline rides up under the top row and fades into the small title."
      top={
        <TopAppBar
          size="large"
          headline="Payments"
          navigationIcon={<Action icon="menu" label="Menu" />}
          actions={
            <>
              <Action icon="search" label="Search" />
              <Action icon="filter_list" label="Filter" />
              <Action icon="more_vert" label="More options" />
            </>
          }
          scrollTarget={ref}
        />
      }
    />
  );
}

function BottomBar() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Phone
      scrollRef={ref}
      hint="Scroll down: the bottom bar slides away; any scroll back brings it back."
      top={<TopAppBar headline="Mail" navigationIcon={<Action icon="menu" label="Menu" />} scrollTarget={ref} />}
      bottom={
        <BottomAppBar
          aria-label="Message actions"
          scrollTarget={ref}
          actions={
            <>
              <Action icon="check_box" label="Select" />
              <Action icon="archive" label="Archive" />
              <Action icon="label" label="Label" />
              <Action icon="delete" label="Delete" />
            </>
          }
          fab={
            <Fab aria-label="Compose" color="secondaryContainer" elevated={false}>
              <Icon name="edit" />
            </Fab>
          }
        />
      }
    />
  );
}

const SCROLLER_CODE = `  <div ref={scroller} tabIndex={0} role="region" aria-label="Messages" style={{ overflowY: 'auto' }}>
    …
  </div>`;

export default function AppBarsPage() {
  return (
    <Page
      title="App bars"
      summary="Top app bars show the screen's title and key actions; they react to the content scrolling under them. The bottom app bar holds actions and a FAB within thumb reach."
    >
      <Section
        title="Small"
        description="A single 64px row. Pass the scroll container as scrollTarget and the bar fills in once content scrolls under it."
      >
        <Demo
          title="Small"
          code={`
const scroller = useRef<HTMLDivElement>(null);

<TopAppBar
  headline="Inbox"
  navigationIcon={<IconButton aria-label="Menu"><Icon name="menu" /></IconButton>}
  actions={
    <>
      <IconButton aria-label="Attachments"><Icon name="attach_file" /></IconButton>
      <IconButton aria-label="More options"><Icon name="more_vert" /></IconButton>
    </>
  }
  scrollTarget={scroller}
/>
${SCROLLER_CODE}`}
        >
          <SmallBar />
        </Demo>
        <Demo
          title="Centred"
          code={`
<TopAppBar
  centered
  headline="Messages"
  navigationIcon={<IconButton aria-label="Back"><Icon name="arrow_back" /></IconButton>}
  actions={<Avatar size={32}>A</Avatar>}
  scrollTarget={scroller}
/>`}
        >
          <CentredBar />
        </Demo>
      </Section>

      <Section
        title="Medium and large"
        description="Two-row flexible bars with a bigger headline and an optional subtitle. They collapse into the small bar as the content scrolls."
      >
        <Demo
          title="Medium"
          code={`
<TopAppBar
  size="medium"
  headline="Statements"
  navigationIcon={<IconButton aria-label="Back"><Icon name="arrow_back" /></IconButton>}
  actions={<IconButton aria-label="Download"><Icon name="download" /></IconButton>}
  scrollTarget={scroller}
/>`}
        >
          <MediumBar />
        </Demo>
        <Demo
          title="Large"
          code={`
<TopAppBar
  size="large"
  headline="Payments"
  navigationIcon={<IconButton aria-label="Menu"><Icon name="menu" /></IconButton>}
  actions={
    <>
      <IconButton aria-label="Search"><Icon name="search" /></IconButton>
      <IconButton aria-label="Filter"><Icon name="filter_list" /></IconButton>
      <IconButton aria-label="More options"><Icon name="more_vert" /></IconButton>
    </>
  }
  scrollTarget={scroller}
/>`}
        >
          <LargeBar />
        </Demo>
        <Demo
          title="With a subtitle"
          wide
          code={`
<TopAppBar size="small" headline="Inbox" subtitle="24 unread" … />
<TopAppBar size="medium" headline="Statements" subtitle="Business current account" … />
<TopAppBar size="large" headline="Payments" subtitle="3 scheduled this week" … />`}
        >
          <div {...stylex.props(s.trio)}>
            {(
              [
                ['small', 'Inbox', '24 unread'],
                ['medium', 'Statements', 'Business current account'],
                ['large', 'Payments', '3 scheduled this week'],
              ] as const
            ).map(([size, headline, subtitle]) => (
              <div key={size} {...stylex.props(s.static, s.cell)}>
                <TopAppBar
                  size={size}
                  headline={headline}
                  subtitle={subtitle}
                  navigationIcon={<Action icon="arrow_back" label="Back" />}
                  actions={<Action icon="more_vert" label="More options" />}
                />
              </div>
            ))}
          </div>
        </Demo>
      </Section>

      <Section
        title="Custom content"
        description="Small bars can hold a search field or an image (a logo, a wordmark) in the headline's place."
      >
        <Demo
          title="Search"
          code={`
<TopAppBar
  navigationIcon={<IconButton aria-label="Menu"><Icon name="menu" /></IconButton>}
  search={<input type="search" placeholder="Search messages" aria-label="Search messages" />}
  actions={<Avatar size={32}>A</Avatar>}
/>`}
        >
          <div {...stylex.props(s.static)}>
            <TopAppBar
              navigationIcon={<Action icon="menu" label="Menu" />}
              search={
                <input
                  type="search"
                  placeholder="Search messages"
                  aria-label="Search messages"
                  {...stylex.props(typescale.bodyLarge, s.search)}
                />
              }
              actions={
                <span {...stylex.props(s.avatarSlot)}>
                  <Avatar size={32}>A</Avatar>
                </span>
              }
            />
          </div>
        </Demo>
        <Demo
          title="Image"
          code={`
<TopAppBar
  navigationIcon={<IconButton aria-label="Back"><Icon name="arrow_back" /></IconButton>}
  content={<img src={logo} alt="Northwind" height={32} />}
  actions={<IconButton aria-label="Search"><Icon name="search" /></IconButton>}
/>`}
        >
          <div {...stylex.props(s.static)}>
            <TopAppBar
              navigationIcon={<Action icon="arrow_back" label="Back" />}
              content={
                <span {...stylex.props(s.brand)}>
                  <Icon name="forest" size={32} filled />
                  <span {...stylex.props(typescale.titleLargeEmphasized, s.brandText)}>Northwind</span>
                </span>
              }
              actions={<Action icon="search" label="Search" />}
            />
          </div>
        </Demo>
      </Section>

      <Section
        title="Bottom app bar"
        description="Up to four actions and a FAB. With a scrollTarget it hides as you scroll down and returns on any scroll up."
      >
        <Demo
          title="Actions and a FAB, hiding on scroll"
          code={`
<BottomAppBar
  aria-label="Message actions"
  scrollTarget={scroller}
  actions={
    <>
      <IconButton aria-label="Select"><Icon name="check_box" /></IconButton>
      <IconButton aria-label="Archive"><Icon name="archive" /></IconButton>
      <IconButton aria-label="Label"><Icon name="label" /></IconButton>
      <IconButton aria-label="Delete"><Icon name="delete" /></IconButton>
    </>
  }
  fab={
    <Fab aria-label="Compose" color="secondaryContainer" elevated={false}>
      <Icon name="edit" />
    </Fab>
  }
/>`}
        >
          <BottomBar />
        </Demo>
      </Section>
    </Page>
  );
}
