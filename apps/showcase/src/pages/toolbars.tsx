import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Fab,
  IconButton,
  Switch,
  ToggleButton,
  ToggleIconButton,
  Toolbar,
  typescale,
  useFloatingToolbarExitAlways,
  useFloatingToolbarNestedScroll,
  type ToolbarVariant,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const s = stylex.create({
  row: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 24 },
  stack: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%' },
  control: { display: 'flex', alignItems: 'center', gap: 12, color: color.onSurface, cursor: 'pointer' },
  // A small screen: content on Surface with the toolbar at an edge.
  frame: {
    position: 'relative',
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
  dockedFrame: { height: 200 },
  scrollFrame: { maxWidth: 412, height: 440 },
  content: { flexGrow: 1, padding: 24, color: color.onSurfaceVariant },
  heading: { margin: 0, marginBottom: 4, color: color.onSurface },
  text: { margin: 0 },
  scroller: { flexGrow: 1, overflowY: 'auto', outlineStyle: 'none' },
  scrollRow: {
    margin: 0,
    paddingBlock: 12,
    paddingInline: 20,
    color: color.onSurfaceVariant,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: color.outlineVariant,
  },
  // Floating toolbars float over the content: the wrapper ignores the pointer, the toolbar takes it.
  floatBottom: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  floatEnd: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 16,
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  hit: { pointerEvents: 'auto' },
});

/** Text formatting toggles: the toolbar's main content. */
function FormattingItems() {
  return (
    <>
      <ToggleIconButton aria-label="Bold" defaultPressed>
        <Icon name="format_bold" />
      </ToggleIconButton>
      <ToggleIconButton aria-label="Italic">
        <Icon name="format_italic" />
      </ToggleIconButton>
      <ToggleIconButton aria-label="Underline">
        <Icon name="format_underlined" />
      </ToggleIconButton>
      <IconButton aria-label="Insert link">
        <Icon name="link" />
      </IconButton>
    </>
  );
}

const fabColor = (variant: ToolbarVariant) => (variant === 'vibrant' ? 'primaryContainer' : 'tertiaryContainer');

function WithFab() {
  const [expanded, setExpanded] = useState(true);
  return (
    <div {...stylex.props(s.stack)}>
      {(['standard', 'vibrant'] as const).map((variant) => (
        <Toolbar
          key={variant}
          variant={variant}
          expanded={expanded}
          aria-label={`Formatting, ${variant}`}
          fab={
            <Fab aria-label="Add" color={fabColor(variant)}>
              <Icon name="add" />
            </Fab>
          }
        >
          <FormattingItems />
        </Toolbar>
      ))}
      <label {...stylex.props(typescale.bodyLarge, s.control)}>
        <Switch checked={expanded} onCheckedChange={setExpanded} />
        Expanded
      </label>
    </div>
  );
}

function LeadingTrailing() {
  const [expanded, setExpanded] = useState(true);
  return (
    <div {...stylex.props(s.stack)}>
      <Toolbar
        expanded={expanded}
        aria-label="Message actions"
        leading={
          <IconButton aria-label="Back">
            <Icon name="arrow_back" />
          </IconButton>
        }
        trailing={
          <IconButton aria-label="More options">
            <Icon name="more_vert" />
          </IconButton>
        }
      >
        <IconButton aria-label="Archive">
          <Icon name="archive" />
        </IconButton>
        <IconButton aria-label="Mark as unread">
          <Icon name="mark_email_unread" />
        </IconButton>
        <IconButton variant="filled" width="wide" aria-label="Reply">
          <Icon name="reply" />
        </IconButton>
      </Toolbar>
      <label {...stylex.props(typescale.bodyLarge, s.control)}>
        <Switch checked={expanded} onCheckedChange={setExpanded} />
        Expanded
      </label>
    </div>
  );
}

const VIEWS = ['photos', 'albums', 'search'] as const;
const VIEW_ICONS = { photos: 'photo_library', albums: 'photo_album', search: 'search' } as const;

function Docked({ variant }: { variant: ToolbarVariant }) {
  const [view, setView] = useState<(typeof VIEWS)[number]>('photos');
  return (
    <div {...stylex.props(s.frame, s.dockedFrame)}>
      <div {...stylex.props(s.content)}>
        <h4 {...stylex.props(typescale.titleLarge, s.heading)}>{view[0]!.toUpperCase() + view.slice(1)}</h4>
        <p {...stylex.props(typescale.bodyMedium, s.text)}>
          A docked toolbar spans the bottom of the window, 64px high, with no elevation.
        </p>
      </div>
      <Toolbar layout="docked" variant={variant} aria-label="Views">
        {VIEWS.map((v) => (
          <ToggleButton
            key={v}
            pressed={view === v}
            onPressedChange={() => setView(v)}
            icon={<Icon name={VIEW_ICONS[v]} size={20} />}
            selectedIcon={<Icon name={VIEW_ICONS[v]} size={20} filled />}
          >
            {v[0]!.toUpperCase() + v.slice(1)}
          </ToggleButton>
        ))}
      </Toolbar>
    </div>
  );
}

function DockedIcons() {
  return (
    <div {...stylex.props(s.frame, s.dockedFrame)}>
      <div {...stylex.props(s.content)}>
        <h4 {...stylex.props(typescale.titleLarge, s.heading)}>Reading view</h4>
        <p {...stylex.props(typescale.bodyMedium, s.text)}>Icon buttons spread across the docked bar.</p>
      </div>
      <Toolbar layout="docked" aria-label="Page actions">
        <IconButton aria-label="Back">
          <Icon name="arrow_back" />
        </IconButton>
        <IconButton aria-label="Forward">
          <Icon name="arrow_forward" />
        </IconButton>
        <IconButton variant="filled" width="wide" aria-label="New tab">
          <Icon name="add" />
        </IconButton>
        <IconButton aria-label="Share">
          <Icon name="share" />
        </IconButton>
        <IconButton aria-label="More options">
          <Icon name="more_vert" />
        </IconButton>
      </Toolbar>
    </div>
  );
}

const ROWS = Array.from({ length: 24 }, (_, i) => `Note ${i + 1}`);

function ScrollRows() {
  return ROWS.map((r) => (
    <p key={r} {...stylex.props(typescale.bodyLarge, s.scrollRow)}>
      {r}
    </p>
  ));
}

/** Scrolling down 40px collapses the toolbar into its FAB; scrolling back up 40px expands it. */
function CollapseOnScroll() {
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useFloatingToolbarNestedScroll({ expanded, onExpandedChange: setExpanded });
  return (
    <div {...stylex.props(s.frame, s.scrollFrame)}>
      <div
        ref={scrollRef}
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must take focus
        tabIndex={0}
        role="region"
        aria-label="Notes"
        {...stylex.props(s.scroller)}
      >
        <ScrollRows />
      </div>
      <div {...stylex.props(s.floatBottom)}>
        <div {...stylex.props(s.hit)}>
          <Toolbar
            variant="vibrant"
            expanded={expanded}
            aria-label="Formatting"
            fab={
              <Fab aria-label="New note" color="primaryContainer">
                <Icon name="edit" />
              </Fab>
            }
          >
            <FormattingItems />
          </Toolbar>
        </div>
      </div>
    </div>
  );
}

/** The toolbar follows the scroll off the bottom edge and settles in or out when it stops. */
function ExitOnScroll() {
  const { ref, scrollRef } = useFloatingToolbarExitAlways('bottom');
  return (
    <div {...stylex.props(s.frame, s.scrollFrame)}>
      <div
        ref={scrollRef}
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must take focus
        tabIndex={0}
        role="region"
        aria-label="Notes"
        {...stylex.props(s.scroller)}
      >
        <ScrollRows />
      </div>
      <div ref={ref} {...stylex.props(s.floatBottom)}>
        <div {...stylex.props(s.hit)}>
          <Toolbar aria-label="Formatting">
            <FormattingItems />
          </Toolbar>
        </div>
      </div>
    </div>
  );
}

/** A vertical toolbar that leaves by the end edge. */
function ExitVertical() {
  const { ref, scrollRef } = useFloatingToolbarExitAlways('end');
  return (
    <div {...stylex.props(s.frame, s.scrollFrame)}>
      <div
        ref={scrollRef}
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must take focus
        tabIndex={0}
        role="region"
        aria-label="Notes"
        {...stylex.props(s.scroller)}
      >
        <ScrollRows />
      </div>
      <div ref={ref} {...stylex.props(s.floatEnd)}>
        <div {...stylex.props(s.hit)}>
          <Toolbar orientation="vertical" variant="vibrant" aria-label="Formatting">
            <FormattingItems />
          </Toolbar>
        </div>
      </div>
    </div>
  );
}

export default function ToolbarsPage() {
  return (
    <Page
      title="Toolbars"
      summary="Toolbars hold frequently used actions for the current page. Floating toolbars hover over the content, horizontally or vertically, and can pair with a FAB; docked toolbars span the bottom of the window."
    >
      <Section
        title="Floating toolbar"
        description="A rounded, elevated bar. Standard uses Surface Container; vibrant uses Primary Container for more emphasis. Arrow keys move between the items."
      >
        <Demo
          title="Standard"
          code={`
<Toolbar aria-label="Formatting">
  <ToggleIconButton aria-label="Bold" defaultPressed><Icon name="format_bold" /></ToggleIconButton>
  <ToggleIconButton aria-label="Italic"><Icon name="format_italic" /></ToggleIconButton>
  <ToggleIconButton aria-label="Underline"><Icon name="format_underlined" /></ToggleIconButton>
  <IconButton aria-label="Insert link"><Icon name="link" /></IconButton>
</Toolbar>`}
        >
          <Toolbar aria-label="Formatting, standard">
            <FormattingItems />
          </Toolbar>
        </Demo>
        <Demo
          title="Vibrant"
          code={`
<Toolbar variant="vibrant" aria-label="Formatting">
  <ToggleIconButton aria-label="Bold" defaultPressed><Icon name="format_bold" /></ToggleIconButton>
  {/* … */}
</Toolbar>`}
        >
          <Toolbar variant="vibrant" aria-label="Formatting, vibrant">
            <FormattingItems />
          </Toolbar>
        </Demo>
        <Demo
          title="Vertical"
          code={`
<Toolbar orientation="vertical" aria-label="Formatting">
  {/* … */}
</Toolbar>
<Toolbar orientation="vertical" variant="vibrant" aria-label="Formatting">
  {/* … */}
</Toolbar>`}
        >
          <div {...stylex.props(s.row)}>
            <Toolbar orientation="vertical" aria-label="Formatting, vertical standard">
              <FormattingItems />
            </Toolbar>
            <Toolbar orientation="vertical" variant="vibrant" aria-label="Formatting, vertical vibrant">
              <FormattingItems />
            </Toolbar>
          </div>
        </Demo>
        <Demo
          title="Vertical with a FAB"
          code={`
<Toolbar
  orientation="vertical"
  aria-label="Formatting"
  fab={<Fab aria-label="Add" color="tertiaryContainer"><Icon name="add" /></Fab>}
>
  {/* … */}
</Toolbar>`}
        >
          <div {...stylex.props(s.row)}>
            {(['standard', 'vibrant'] as const).map((variant) => (
              <Toolbar
                key={variant}
                orientation="vertical"
                variant={variant}
                aria-label={`Formatting, vertical ${variant} with FAB`}
                fab={
                  <Fab aria-label="Add" color={fabColor(variant)}>
                    <Icon name="add" />
                  </Fab>
                }
              >
                <FormattingItems />
              </Toolbar>
            ))}
          </div>
        </Demo>
        <Demo
          title="With a FAB"
          code={`
const [expanded, setExpanded] = useState(true);

<Toolbar
  variant="vibrant"
  expanded={expanded}
  aria-label="Formatting"
  fab={<Fab aria-label="Add" color="primaryContainer"><Icon name="add" /></Fab>}
>
  {/* … */}
</Toolbar>`}
        >
          <WithFab />
        </Demo>
        <Demo
          title="Leading and trailing content"
          code={`
<Toolbar
  expanded={expanded}
  aria-label="Message actions"
  leading={<IconButton aria-label="Back"><Icon name="arrow_back" /></IconButton>}
  trailing={<IconButton aria-label="More options"><Icon name="more_vert" /></IconButton>}
>
  <IconButton aria-label="Archive"><Icon name="archive" /></IconButton>
  <IconButton aria-label="Mark as unread"><Icon name="mark_email_unread" /></IconButton>
  <IconButton variant="filled" width="wide" aria-label="Reply"><Icon name="reply" /></IconButton>
</Toolbar>`}
        >
          <LeadingTrailing />
        </Demo>
      </Section>

      <Section
        title="Docked toolbar"
        description="Full width at the bottom of the window, flat, 64px high. Items spread across the bar."
      >
        <Demo
          title="Standard, with toggle buttons"
          code={`
const [view, setView] = useState('photos');

<Toolbar layout="docked" aria-label="Views">
  <ToggleButton pressed={view === 'photos'} onPressedChange={() => setView('photos')}
    icon={<Icon name="photo_library" />} selectedIcon={<Icon name="photo_library" filled />}>
    Photos
  </ToggleButton>
  {/* … */}
</Toolbar>`}
        >
          <Docked variant="standard" />
        </Demo>
        <Demo
          title="Vibrant"
          code={`
<Toolbar layout="docked" variant="vibrant" aria-label="Views">
  {/* … */}
</Toolbar>`}
        >
          <Docked variant="vibrant" />
        </Demo>
        <Demo
          title="Icon buttons"
          code={`
<Toolbar layout="docked" aria-label="Page actions">
  <IconButton aria-label="Back"><Icon name="arrow_back" /></IconButton>
  <IconButton aria-label="Forward"><Icon name="arrow_forward" /></IconButton>
  <IconButton variant="filled" width="wide" aria-label="New tab"><Icon name="add" /></IconButton>
  <IconButton aria-label="Share"><Icon name="share" /></IconButton>
  <IconButton aria-label="More options"><Icon name="more_vert" /></IconButton>
</Toolbar>`}
        >
          <DockedIcons />
        </Demo>
      </Section>

      <Section
        title="Scroll behaviour"
        description="Floating toolbars get out of the way of the content. Scroll inside each box."
      >
        <Demo
          title="Collapse into the FAB"
          code={`
const [expanded, setExpanded] = useState(true);
// 40px down collapses, 40px back up expands (Compose floatingToolbarVerticalNestedScroll).
const scrollRef = useFloatingToolbarNestedScroll({ expanded, onExpandedChange: setExpanded });

<div ref={scrollRef} style={{ overflowY: 'auto' }}>{content}</div>
<Toolbar
  variant="vibrant"
  expanded={expanded}
  aria-label="Formatting"
  fab={<Fab aria-label="New note" color="primaryContainer"><Icon name="edit" /></Fab>}
>
  {/* … */}
</Toolbar>`}
        >
          <CollapseOnScroll />
        </Demo>
        <Demo
          title="Exit always"
          code={`
// ref: the element that moves; scrollRef: the scroller. Settles in or out when the scroll ends.
const { ref, scrollRef } = useFloatingToolbarExitAlways('bottom');

<div ref={scrollRef} style={{ overflowY: 'auto' }}>{content}</div>
<div ref={ref} style={{ position: 'absolute', bottom: 16 }}>
  <Toolbar aria-label="Formatting">{/* … */}</Toolbar>
</div>`}
        >
          <ExitOnScroll />
        </Demo>
        <Demo
          title="Vertical, exits by the end edge"
          code={`
const { ref, scrollRef } = useFloatingToolbarExitAlways('end');

<div ref={scrollRef} style={{ overflowY: 'auto' }}>{content}</div>
<div ref={ref} style={{ position: 'absolute', insetBlock: 0, right: 16, display: 'flex', alignItems: 'center' }}>
  <Toolbar orientation="vertical" variant="vibrant" aria-label="Formatting">{/* … */}</Toolbar>
</div>`}
        >
          <ExitVertical />
        </Demo>
      </Section>
    </Page>
  );
}
