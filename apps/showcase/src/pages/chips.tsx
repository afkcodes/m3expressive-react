import { useState, type KeyboardEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  AssistChip,
  Avatar,
  Button,
  ChipGroup,
  FilterChip,
  InputChip,
  Menu,
  MenuRadioGroup,
  MenuRadioItem,
  SuggestionChip,
  TextField,
  typescale,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const s = stylex.create({
  note: { margin: 0, color: color.onSurfaceVariant, textAlign: 'center' },
  group: { justifyContent: 'center' },
  scroller: { maxWidth: '100%' },
  // A monogram sized for the chip's 24px avatar slot.
  monogram: { fontSize: 12, lineHeight: '24px' },
  monogramAlt: { backgroundColor: color.tertiaryContainer, color: color.onTertiaryContainer },
  message: {
    margin: 0,
    paddingBlock: 12,
    paddingInline: 16,
    borderRadius: 16,
    backgroundColor: color.surfaceContainerHighest,
    color: color.onSurface,
    alignSelf: 'stretch',
    minHeight: 24,
  },
  placeholder: { color: color.onSurfaceVariant },
  center: { display: 'flex', justifyContent: 'center' },
});

/** Status line under a demo: what the chips did. */
function Note({ children }: { children: string }) {
  return (
    <p {...stylex.props(typescale.bodyMedium, s.note)} aria-live="polite">
      {children}
    </p>
  );
}

const PEOPLE = ['Ada Lovelace', 'Grace Hopper', 'Katherine Johnson', 'Margaret Hamilton'];
const FILTERS = ['Under £50', 'Free delivery', 'In stock', 'On sale'];
const RANGES = ['Any time', 'Past week', 'Past month', 'Past year'];
const SORTS = ['Relevance', 'Newest', 'Price: low to high', 'Price: high to low'];
const REPLIES = ['Sounds good', 'See you then', 'On my way', 'Thanks!', 'Running late', 'Call me later'];

function AssistDemo() {
  const [last, setLast] = useState('Tap a chip.');
  return (
    <>
      <ChipGroup aria-label="Trip actions" sx={s.group}>
        <AssistChip icon={<Icon name="local_taxi" size={18} />} onClick={() => setLast('Booking a ride…')}>
          Book a ride
        </AssistChip>
        <AssistChip icon={<Icon name="event" size={18} />} onClick={() => setLast('Added to calendar.')}>
          Add to calendar
        </AssistChip>
        <AssistChip onClick={() => setLast('Opening directions…')}>Directions</AssistChip>
      </ChipGroup>
      <Note>{last}</Note>
    </>
  );
}

function FilterDemo({ elevated = false }: { elevated?: boolean }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(['Free delivery']));
  const toggle = (label: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(label);
      else next.delete(label);
      return next;
    });
  return (
    <>
      <ChipGroup aria-label="Filters" sx={s.group}>
        {FILTERS.map((label) => (
          <FilterChip
            key={label}
            elevated={elevated}
            selected={selected.has(label)}
            onSelectedChange={(on) => toggle(label, on)}
          >
            {label}
          </FilterChip>
        ))}
      </ChipGroup>
      <Note>{selected.size ? `Filtering by: ${[...selected].join(', ')}` : 'No filters.'}</Note>
    </>
  );
}

function SingleFilterDemo() {
  const [range, setRange] = useState('Any time');
  return (
    <>
      <ChipGroup aria-label="Date range" sx={s.group}>
        {RANGES.map((label) => (
          <FilterChip
            key={label}
            icon={label === 'Any time' ? <Icon name="schedule" size={18} /> : undefined}
            selected={range === label}
            onSelectedChange={(on) => on && setRange(label)}
          >
            {label}
          </FilterChip>
        ))}
      </ChipGroup>
      <Note>{`Showing: ${range.toLowerCase()}`}</Note>
    </>
  );
}

function DropdownFilterDemo() {
  const [sort, setSort] = useState('Relevance');
  return (
    <>
      <div {...stylex.props(s.center)}>
        <Menu
          trigger={
            <FilterChip dropdown selected={sort !== 'Relevance'} icon={<Icon name="sort" size={18} />}>
              {sort === 'Relevance' ? 'Sort' : sort}
            </FilterChip>
          }
        >
          <MenuRadioGroup label="Sort by" value={sort} onValueChange={(v) => setSort(v as string)}>
            {SORTS.map((label) => (
              <MenuRadioItem key={label} value={label} closeOnClick>
                {label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </Menu>
      </div>
      <Note>{`Sorted by ${sort.toLowerCase()}`}</Note>
    </>
  );
}

const initial = (name: string) => name.charAt(0);

function InputDemo() {
  const [people, setPeople] = useState(PEOPLE);
  const [draft, setDraft] = useState('');
  const add = (e: KeyboardEvent<HTMLInputElement>) => {
    const name = draft.trim();
    if (e.key !== 'Enter' || !name) return;
    e.preventDefault();
    if (!people.includes(name)) setPeople([...people, name]);
    setDraft('');
  };
  return (
    <>
      <TextField
        variant="outlined"
        label="Add a recipient"
        supportingText="Type a name and press Enter"
        value={draft}
        onValueChange={setDraft}
        onKeyDown={add}
      />
      <ChipGroup aria-label="Recipients">
        {people.map((name, i) => (
          <InputChip
            key={name}
            avatar={
              <Avatar size={24} sx={[s.monogram, i % 2 === 1 && s.monogramAlt]}>
                {initial(name)}
              </Avatar>
            }
            onRemove={() => setPeople(people.filter((p) => p !== name))}
          >
            {name}
          </InputChip>
        ))}
      </ChipGroup>
      {people.length === 0 && (
        <Button variant="text" icon={<Icon name="undo" size={20} />} onClick={() => setPeople(PEOPLE)}>
          Restore recipients
        </Button>
      )}
    </>
  );
}

function SuggestionDemo() {
  const [message, setMessage] = useState('');
  return (
    <>
      <p {...stylex.props(typescale.bodyLarge, s.message, !message && s.placeholder)} aria-live="polite">
        {message || 'Tap a suggested reply'}
      </p>
      <ChipGroup layout="scroll" aria-label="Suggested replies" sx={s.scroller}>
        {REPLIES.map((reply) => (
          <SuggestionChip key={reply} selected={message === reply} onSelectedChange={() => setMessage(reply)}>
            {reply}
          </SuggestionChip>
        ))}
      </ChipGroup>
    </>
  );
}

export default function ChipsPage() {
  return (
    <Page
      title="Chips"
      summary="Chips help people enter information, make selections, filter content or trigger actions. Four types — assist, filter, input and suggestion — outlined or elevated, laid out in wrapping or scrolling groups."
    >
      <Section title="Assist chips" description="Smart or automated actions that appear dynamically in context.">
        <Demo
          title="Outlined"
          column
          code={`
<ChipGroup aria-label="Trip actions">
  <AssistChip icon={<Icon name="local_taxi" size={18} />} onClick={bookRide}>
    Book a ride
  </AssistChip>
  <AssistChip icon={<Icon name="event" size={18} />}>Add to calendar</AssistChip>
  <AssistChip>Directions</AssistChip>
</ChipGroup>`}
        >
          <AssistDemo />
        </Demo>
        <Demo
          title="Elevated and disabled"
          code={`
<AssistChip elevated icon={<Icon name="local_taxi" size={18} />}>Book a ride</AssistChip>
<AssistChip disabled icon={<Icon name="event" size={18} />}>Add to calendar</AssistChip>`}
        >
          <AssistChip elevated icon={<Icon name="local_taxi" size={18} />}>
            Book a ride
          </AssistChip>
          <AssistChip elevated>Directions</AssistChip>
          <AssistChip disabled icon={<Icon name="event" size={18} />}>
            Add to calendar
          </AssistChip>
          <AssistChip elevated disabled>
            Share
          </AssistChip>
        </Demo>
      </Section>

      <Section
        title="Filter chips"
        description="Tags or descriptive words that filter content. Selecting one springs a check in front of the label (or swaps it for the icon)."
      >
        <Demo
          title="Multiple selection"
          column
          code={`
const [selected, setSelected] = useState(new Set(['Free delivery']));

<ChipGroup aria-label="Filters">
  {filters.map((label) => (
    <FilterChip
      key={label}
      selected={selected.has(label)}
      onSelectedChange={(on) => toggle(label, on)}
    >
      {label}
    </FilterChip>
  ))}
</ChipGroup>`}
        >
          <FilterDemo />
        </Demo>
        <Demo
          title="Single selection"
          column
          code={`
<ChipGroup aria-label="Date range">
  {ranges.map((label) => (
    <FilterChip
      key={label}
      selected={range === label}
      onSelectedChange={(on) => on && setRange(label)}
    >
      {label}
    </FilterChip>
  ))}
</ChipGroup>`}
        >
          <SingleFilterDemo />
        </Demo>
        <Demo
          title="Elevated"
          column
          code={`<FilterChip elevated selected={selected} onSelectedChange={setSelected}>In stock</FilterChip>`}
        >
          <FilterDemo elevated />
        </Demo>
        <Demo
          title="Drop-down menu"
          column
          code={`
<Menu
  trigger={
    <FilterChip dropdown selected={sort !== 'Relevance'} icon={<Icon name="sort" size={18} />}>
      {sort === 'Relevance' ? 'Sort' : sort}
    </FilterChip>
  }
>
  <MenuRadioGroup label="Sort by" value={sort} onValueChange={setSort}>
    <MenuRadioItem value="Relevance" closeOnClick>Relevance</MenuRadioItem>
    <MenuRadioItem value="Newest" closeOnClick>Newest</MenuRadioItem>
  </MenuRadioGroup>
</Menu>`}
        >
          <DropdownFilterDemo />
        </Demo>
        <Demo
          title="Disabled"
          wide
          code={`
<FilterChip disabled>Under £50</FilterChip>
<FilterChip disabled defaultSelected>Free delivery</FilterChip>`}
        >
          <FilterChip disabled>Under £50</FilterChip>
          <FilterChip disabled defaultSelected>
            Free delivery
          </FilterChip>
          <FilterChip elevated disabled>
            In stock
          </FilterChip>
        </Demo>
      </Section>

      <Section
        title="Input chips"
        description="Discrete pieces of information entered by a user, such as recipients. Each one can be removed; selecting one swaps its avatar for a check."
      >
        <Demo
          title="Removable, with avatars"
          wide
          column
          code={`
<ChipGroup aria-label="Recipients">
  {people.map((name) => (
    <InputChip
      key={name}
      avatar={<Avatar size={24}>{name[0]}</Avatar>}
      onRemove={() => setPeople(people.filter((p) => p !== name))}
    >
      {name}
    </InputChip>
  ))}
</ChipGroup>`}
        >
          <InputDemo />
        </Demo>
        <Demo
          title="Icon, selected and disabled"
          wide
          code={`
<InputChip icon={<Icon name="description" size={18} />} onRemove={remove}>report.pdf</InputChip>
<InputChip defaultSelected avatar={<Avatar size={24}>G</Avatar>} onRemove={remove}>Grace</InputChip>
<InputChip disabled onRemove={remove}>Archived</InputChip>`}
        >
          <InputChip icon={<Icon name="description" size={18} />} onRemove={() => {}}>
            report.pdf
          </InputChip>
          <InputChip
            defaultSelected
            avatar={
              <Avatar size={24} sx={s.monogram}>
                G
              </Avatar>
            }
            onRemove={() => {}}
          >
            Grace
          </InputChip>
          <InputChip>No remove button</InputChip>
          <InputChip disabled onRemove={() => {}}>
            Archived
          </InputChip>
        </Demo>
      </Section>

      <Section
        title="Suggestion chips"
        description="Dynamically generated suggestions, such as possible responses. Here in a single scrolling row."
      >
        <Demo
          title="Suggested replies"
          column
          code={`
<ChipGroup layout="scroll" aria-label="Suggested replies">
  {replies.map((reply) => (
    <SuggestionChip
      key={reply}
      selected={message === reply}
      onSelectedChange={() => setMessage(reply)}
    >
      {reply}
    </SuggestionChip>
  ))}
</ChipGroup>`}
        >
          <SuggestionDemo />
        </Demo>
        <Demo
          title="Elevated, with an icon, disabled"
          code={`
<SuggestionChip elevated>Sounds good</SuggestionChip>
<SuggestionChip icon={<Icon name="schedule" size={18} />}>Tomorrow at 9</SuggestionChip>
<SuggestionChip disabled>Running late</SuggestionChip>`}
        >
          <SuggestionChip elevated>Sounds good</SuggestionChip>
          <SuggestionChip icon={<Icon name="schedule" size={18} />}>Tomorrow at 9</SuggestionChip>
          <SuggestionChip disabled>Running late</SuggestionChip>
        </Demo>
      </Section>

      <Section
        title="Chip groups"
        description="ChipGroup spaces chips 8px apart, in wrapping rows (default) or one horizontally scrolling row."
      >
        <Demo
          title="Wrap"
          column
          code={`
<ChipGroup layout="wrap" aria-label="Topics">
  <FilterChip>Design</FilterChip>
  …
</ChipGroup>`}
        >
          <ChipGroup layout="wrap" aria-label="Topics">
            {['Design', 'Engineering', 'Research', 'Product', 'Marketing', 'Operations', 'Finance', 'Legal'].map(
              (t) => (
                <FilterChip key={t}>{t}</FilterChip>
              ),
            )}
          </ChipGroup>
        </Demo>
        <Demo
          title="Scroll"
          column
          code={`
<ChipGroup layout="scroll" aria-label="Topics">
  <FilterChip>Design</FilterChip>
  …
</ChipGroup>`}
        >
          <ChipGroup layout="scroll" aria-label="More topics" sx={s.scroller}>
            {['Design', 'Engineering', 'Research', 'Product', 'Marketing', 'Operations', 'Finance', 'Legal'].map(
              (t) => (
                <FilterChip key={t}>{t}</FilterChip>
              ),
            )}
          </ChipGroup>
        </Demo>
      </Section>
    </Page>
  );
}
