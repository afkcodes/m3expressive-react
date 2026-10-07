import { useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Avatar, IconButton, List, ListItem, SearchBar, SearchView, typescale } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { motion } from '@m3x/react/tokens/motion.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const s = stylex.create({
  stack: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' },
  note: { margin: 0, color: color.onSurfaceVariant, textAlign: 'center' },
  bars: { display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 412 },
  inputColumn: { display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 412, alignSelf: 'center' },
  // A small phone-sized frame the view expands in.
  phone: {
    position: 'relative',
    width: '100%',
    maxWidth: 412,
    height: 480,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: color.surface,
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: color.outlineVariant,
  },
  barSlot: { paddingBlock: 8, paddingInline: 16 },
  heading: { margin: 0, paddingTop: 16, paddingBottom: 4, paddingInline: 16, color: color.onSurfaceVariant },
  docked: { position: 'absolute', top: 8, left: 16, right: 16, zIndex: 1 },
  fullScreen: { position: 'absolute', inset: 0, paddingTop: 8, zIndex: 1 },
  // The full-screen view has no fill of its own (it sits on the screen): cover the content behind it.
  backdrop: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    backgroundColor: color.surface,
    opacity: 0,
    pointerEvents: 'none',
    transitionProperty: 'opacity',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  backdropOn: { opacity: 1 },
  monogram: { backgroundColor: color.primary, color: color.onPrimary },
  // A decorative 48px leading slot (the size of the icon button it replaces).
  glyphSlot: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48 },
});

const ITEMS = [
  { title: 'Savings account', text: 'Instant access, interest paid monthly', icon: 'savings' },
  { title: 'Business card', text: 'Spending, limits and statements', icon: 'credit_card' },
  { title: 'Payments', text: 'Send money, standing orders, direct debits', icon: 'payments' },
  { title: 'Statements', text: 'Download monthly statements', icon: 'description' },
  { title: 'Team access', text: 'Invite colleagues, set permissions', icon: 'group' },
  { title: 'Security', text: 'Passkeys, devices and alerts', icon: 'shield' },
] as const;
const RECENT = ['Statements', 'Payments', 'Team access'] as const;
const CONTENT = [
  { title: 'Coffee Roasters Ltd', text: 'Card payment · £4.20', icon: 'local_cafe' },
  { title: 'Office supplies', text: 'Direct debit · £86.00', icon: 'inventory_2' },
  { title: 'Invoice #2041', text: 'Received · £1,250.00', icon: 'receipt_long' },
  { title: 'Train tickets', text: 'Card payment · £42.10', icon: 'train' },
  { title: 'Cloud hosting', text: 'Card payment · £19.99', icon: 'cloud' },
] as const;

const matching = (query: string) => {
  const q = query.trim().toLowerCase();
  return q ? ITEMS.filter(({ title, text }) => `${title} ${text}`.toLowerCase().includes(q)) : [];
};

/** A trigger bar in a phone frame that expands into a docked or full-screen search view. */
function SearchDemo({ layout }: { layout: 'docked' | 'fullScreen' }) {
  const bar = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const pick = (title: string) => {
    setChosen(title);
    close();
  };
  const results = matching(query);
  const full = layout === 'fullScreen';
  return (
    <div {...stylex.props(s.stack)}>
      <div {...stylex.props(s.phone)}>
        <div {...stylex.props(s.barSlot)}>
          <SearchBar
            ref={bar}
            placeholder="Search your account"
            aria-label="Search your account"
            leading={
              <IconButton aria-label="Menu">
                <Icon name="menu" />
              </IconButton>
            }
            trailing={
              <IconButton aria-label="Voice search">
                <Icon name="mic" />
              </IconButton>
            }
            avatar={
              <Avatar size={30} sx={s.monogram}>
                A
              </Avatar>
            }
            onActivate={() => setOpen(true)}
          />
        </div>
        <h3 {...stylex.props(typescale.titleSmall, s.heading)}>Recent activity</h3>
        <List aria-label="Recent activity">
          {CONTENT.map(({ title, text, icon }) => (
            <ListItem key={title} leading={<Icon name={icon} />} supportingText={text}>
              {title}
            </ListItem>
          ))}
        </List>
        {full && <div aria-hidden {...stylex.props(s.backdrop, open && s.backdropOn)} />}
        <SearchView
          layout={layout}
          open={open}
          onOpenChange={(next) => (next ? setOpen(true) : close())}
          expandedFrom={bar}
          value={query}
          onValueChange={setQuery}
          placeholder="Search your account"
          sx={full ? s.fullScreen : s.docked}
          leading={
            <IconButton aria-label="Back" onClick={close}>
              <Icon name="arrow_back" />
            </IconButton>
          }
          trailing={
            query ? (
              <IconButton aria-label="Clear" onClick={() => setQuery('')}>
                <Icon name="close" />
              </IconButton>
            ) : (
              <IconButton aria-label="Voice search">
                <Icon name="mic" />
              </IconButton>
            )
          }
        >
          {query.trim() === ''
            ? RECENT.map((title) => (
                <ListItem key={title} leading={<Icon name="history" />} onClick={() => pick(title)}>
                  {title}
                </ListItem>
              ))
            : results.length > 0
              ? results.map(({ title, text, icon }) => (
                  <ListItem
                    key={title}
                    leading={<Icon name={icon} />}
                    supportingText={text}
                    supportingMaxLines={1}
                    onClick={() => pick(title)}
                  >
                    {title}
                  </ListItem>
                ))
              : [
                  <ListItem key="none" leading={<Icon name="search_off" />}>
                    {`No results for “${query.trim()}”`}
                  </ListItem>,
                ]}
        </SearchView>
      </div>
      <p {...stylex.props(typescale.bodyMedium, s.note)} aria-live="polite">
        {chosen ? `Opened: ${chosen}` : 'Click the bar, type to filter, pick a result. Escape closes.'}
      </p>
    </div>
  );
}

/** The bar as the search field itself, filtering a list in place. */
function InputModeDemo() {
  const [query, setQuery] = useState('');
  const results = query.trim() ? matching(query) : ITEMS;
  return (
    <div {...stylex.props(s.inputColumn)}>
      <SearchBar
        mode="input"
        placeholder="Filter help topics"
        value={query}
        onValueChange={setQuery}
        leading={
          <span {...stylex.props(s.glyphSlot)}>
            <Icon name="search" />
          </span>
        }
        trailing={
          query ? (
            <IconButton aria-label="Clear" onClick={() => setQuery('')}>
              <Icon name="close" />
            </IconButton>
          ) : undefined
        }
      />
      <List aria-label="Help topics">
        {results.map(({ title, text, icon }) => (
          <ListItem key={title} leading={<Icon name={icon} />} supportingText={text} supportingMaxLines={1}>
            {title}
          </ListItem>
        ))}
        {results.length === 0 && <ListItem leading={<Icon name="search_off" />}>No matching topics</ListItem>}
      </List>
    </div>
  );
}

function BarVariants() {
  const [last, setLast] = useState('—');
  return (
    <div {...stylex.props(s.stack)}>
      <div {...stylex.props(s.bars)}>
        <SearchBar placeholder="Search" aria-label="Search" onActivate={() => setLast('Plain bar')} />
        <SearchBar
          placeholder="Search messages"
          aria-label="Search messages"
          leading={
            <IconButton aria-label="Search" onClick={() => setLast('Leading icon')}>
              <Icon name="search" />
            </IconButton>
          }
          onActivate={() => setLast('Bar with a leading icon')}
        />
        <SearchBar
          placeholder="Search accounts"
          aria-label="Search accounts"
          leading={
            <IconButton aria-label="Menu" onClick={() => setLast('Menu')}>
              <Icon name="menu" />
            </IconButton>
          }
          trailing={
            <IconButton aria-label="Voice search" onClick={() => setLast('Voice search')}>
              <Icon name="mic" />
            </IconButton>
          }
          avatar={
            <Avatar size={30} sx={s.monogram}>
              A
            </Avatar>
          }
          onActivate={() => setLast('Bar with icons and an avatar')}
        />
      </div>
      <p {...stylex.props(typescale.bodyMedium, s.note)} aria-live="polite">
        Activated: {last}
      </p>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Page
      title="Search"
      summary="Search lets people enter a query and get relevant results. A search bar opens a search view — docked under the bar on large screens, or full screen on small ones — with motion that grows the view out of the bar."
    >
      <Section
        title="Search bar"
        description="In trigger mode (the default) the bar is a button that opens a search view; its icon buttons stay independent. Hover and press show the state layer and ripple."
      >
        <Demo
          title="Trigger bars"
          wide
          code={`
<SearchBar placeholder="Search" aria-label="Search" onActivate={openSearch} />

<SearchBar
  placeholder="Search accounts"
  aria-label="Search accounts"
  leading={<IconButton aria-label="Menu"><Icon name="menu" /></IconButton>}
  trailing={<IconButton aria-label="Voice search"><Icon name="mic" /></IconButton>}
  avatar={<Avatar size={30}>A</Avatar>}
  onActivate={openSearch}
/>`}
        >
          <BarVariants />
        </Demo>
      </Section>

      <Section
        title="Search view"
        description="Give the view the bar it expands from (expandedFrom): it grows out of it on open, moves focus into the input and returns focus to the bar on close. Escape asks to close."
      >
        <Demo
          title="Docked"
          code={`
const bar = useRef<HTMLDivElement>(null);
const [open, setOpen] = useState(false);
const [query, setQuery] = useState('');
const close = () => { setOpen(false); setQuery(''); };

<SearchBar ref={bar} placeholder="Search" aria-label="Search" onActivate={() => setOpen(true)} />
<SearchView
  layout="docked"
  open={open}
  onOpenChange={(next) => (next ? setOpen(true) : close())}
  expandedFrom={bar}
  value={query}
  onValueChange={setQuery}
  placeholder="Search"
  sx={styles.overBar} // position: absolute over the bar
  leading={<IconButton aria-label="Back" onClick={close}><Icon name="arrow_back" /></IconButton>}
  trailing={query && <IconButton aria-label="Clear" onClick={() => setQuery('')}><Icon name="close" /></IconButton>}
>
  {results.map((r) => (
    <ListItem key={r.title} supportingText={r.text} onClick={() => open(r)}>
      {r.title}
    </ListItem>
  ))}
</SearchView>`}
        >
          <SearchDemo layout="docked" />
        </Demo>
        <Demo
          title="Full screen"
          code={`
<SearchBar ref={bar} placeholder="Search" aria-label="Search" onActivate={() => setOpen(true)} />
{/* The full-screen view has no fill of its own: cover the content behind it. */}
<div aria-hidden {...stylex.props(styles.backdrop, open && styles.backdropOn)} />
<SearchView
  layout="fullScreen"
  open={open}
  onOpenChange={(next) => (next ? setOpen(true) : close())}
  expandedFrom={bar}
  value={query}
  onValueChange={setQuery}
  placeholder="Search"
  sx={styles.fullScreen} // position: absolute, inset: 0
  leading={<IconButton aria-label="Back" onClick={close}><Icon name="arrow_back" /></IconButton>}
>
  {results.map((r) => (
    <ListItem key={r.title} supportingText={r.text} onClick={() => open(r)}>
      {r.title}
    </ListItem>
  ))}
</SearchView>`}
        >
          <SearchDemo layout="fullScreen" />
        </Demo>
      </Section>

      <Section
        title="Input mode"
        description={
          'With mode="input" the bar is the search field itself — for filtering a list in place, without a separate view.'
        }
      >
        <Demo
          title="Filter in place"
          wide
          column
          code={`
const [query, setQuery] = useState('');

<SearchBar
  mode="input"
  placeholder="Filter help topics"
  value={query}
  onValueChange={setQuery}
  trailing={
    query && (
      <IconButton aria-label="Clear" onClick={() => setQuery('')}>
        <Icon name="close" />
      </IconButton>
    )
  }
/>
<List aria-label="Help topics">
  {topics.filter(matches(query)).map((t) => (
    <ListItem key={t.title} supportingText={t.text}>{t.title}</ListItem>
  ))}
</List>`}
        >
          <InputModeDemo />
        </Demo>
      </Section>
    </Page>
  );
}
