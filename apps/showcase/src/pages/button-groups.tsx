import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Button,
  ButtonGroup,
  ConnectedButtonGroup,
  ConnectedButtonGroupItem,
  IconButton,
  ToggleButton,
  ToggleIconButton,
  typescale,
  type ButtonSize,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const SIZES: ButtonSize[] = ['xsmall', 'small', 'medium', 'large', 'xlarge'];
const BUTTON_ICON: Record<ButtonSize, number> = { xsmall: 20, small: 20, medium: 24, large: 32, xlarge: 40 };
const ICON_BUTTON_ICON: Record<ButtonSize, number> = { xsmall: 20, small: 24, medium: 24, large: 32, xlarge: 40 };

const cap = (v: string) => v[0]!.toUpperCase() + v.slice(1);
const sizeName = (v: ButtonSize) => (v === 'xsmall' ? 'Extra small' : v === 'xlarge' ? 'Extra large' : cap(v));

const s = stylex.create({
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  // Wide groups scroll sideways on narrow screens; 'safe center' keeps their start reachable.
  stack: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'safe center',
    gap: 20,
    width: '100%',
    overflowX: 'auto',
    paddingTop: 24,
    paddingBottom: 8,
    paddingInline: 8,
  },
  scroll: {
    display: 'flex',
    justifyContent: 'safe center',
    width: '100%',
    overflowX: 'auto',
    paddingBlock: 8,
    paddingInline: 8,
  },
  labelled: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 'max-content' },
  // Keep the natural width in the scrolling stack (a fit-content flex item would squeeze the group).
  natural: { width: 'max-content' },
  caption: { color: color.onSurfaceVariant },
  status: { margin: 0, color: color.onSurfaceVariant, textAlign: 'center' },
});

const RANGES = ['day', 'week', 'month', 'year'];

function ViewSwitcher() {
  const [view, setView] = useState<string[]>(['week']);
  return (
    <div {...stylex.props(s.center)}>
      <ConnectedButtonGroup
        aria-label="Range"
        value={view}
        // Keep one segment selected: ignore the click that would clear it.
        onValueChange={(next) => next.length > 0 && setView(next)}
      >
        {RANGES.map((r) => (
          <ConnectedButtonGroupItem key={r} value={r}>
            {cap(r)}
          </ConnectedButtonGroupItem>
        ))}
      </ConnectedButtonGroup>
      <p {...stylex.props(typescale.bodyMedium, s.status)}>value = [{view.map((v) => `'${v}'`).join(', ')}]</p>
    </div>
  );
}

const STYLES = [
  { value: 'bold', icon: 'format_bold' },
  { value: 'italic', icon: 'format_italic' },
  { value: 'underline', icon: 'format_underlined' },
];

function TextStyles() {
  const [styles, setStyles] = useState<string[]>(['bold']);
  return (
    <div {...stylex.props(s.center)}>
      <ConnectedButtonGroup aria-label="Text style" multiple value={styles} onValueChange={setStyles} size="medium">
        {STYLES.map((st) => (
          <ConnectedButtonGroupItem
            key={st.value}
            value={st.value}
            aria-label={cap(st.value)}
            icon={<Icon name={st.icon} size={24} />}
          />
        ))}
      </ConnectedButtonGroup>
      <p {...stylex.props(typescale.bodyMedium, s.status)}>{styles.length ? styles.join(' + ') : 'No style'}</p>
    </div>
  );
}

export default function ButtonGroupsPage() {
  return (
    <Page
      title="Button groups"
      summary="Standard groups put related buttons side by side: pressing one widens it at its neighbours' expense. Connected groups join segments for selection."
    >
      <Section title="Standard" description="Press and hold a button: it springs wider while its neighbours give way.">
        <Demo
          wide
          title="Buttons"
          code={`
<ButtonGroup aria-label="Actions" size="medium">
  <Button variant="tonal" size="medium">Archive</Button>
  <Button variant="tonal" size="medium">Move</Button>
  <Button variant="filled" size="medium">Delete</Button>
</ButtonGroup>`}
        >
          <div {...stylex.props(s.scroll)}>
            <ButtonGroup aria-label="Actions" size="medium">
              <Button variant="tonal" size="medium" icon={<Icon name="archive" size={24} />}>
                Archive
              </Button>
              <Button variant="tonal" size="medium" icon={<Icon name="drive_file_move" size={24} />}>
                Move
              </Button>
              <Button variant="filled" size="medium" icon={<Icon name="delete" size={24} />}>
                Delete
              </Button>
            </ButtonGroup>
          </div>
        </Demo>
        <Demo
          title="Icon buttons"
          code={`
<ButtonGroup aria-label="Playback">
  <IconButton aria-label="Previous" variant="tonal"><Icon name="skip_previous" /></IconButton>
  <IconButton aria-label="Play" variant="filled" width="wide"><Icon name="play_arrow" /></IconButton>
  <IconButton aria-label="Next" variant="tonal"><Icon name="skip_next" /></IconButton>
</ButtonGroup>`}
        >
          <ButtonGroup aria-label="Playback">
            <IconButton aria-label="Previous" variant="tonal">
              <Icon name="skip_previous" />
            </IconButton>
            <IconButton aria-label="Play" variant="filled" width="wide">
              <Icon name="play_arrow" />
            </IconButton>
            <IconButton aria-label="Next" variant="tonal">
              <Icon name="skip_next" />
            </IconButton>
          </ButtonGroup>
        </Demo>
        <Demo
          title="Toggles"
          code={`
<ButtonGroup aria-label="Formatting">
  <ToggleIconButton aria-label="Bold" variant="tonal" width="wide">…</ToggleIconButton>
  <ToggleIconButton aria-label="Italic" variant="tonal" width="wide">…</ToggleIconButton>
  <ToggleButton variant="tonal">Highlight</ToggleButton>
</ButtonGroup>`}
        >
          <ButtonGroup aria-label="Formatting">
            <ToggleIconButton aria-label="Bold" variant="tonal" width="wide" defaultPressed>
              <Icon name="format_bold" />
            </ToggleIconButton>
            <ToggleIconButton aria-label="Italic" variant="tonal" width="wide">
              <Icon name="format_italic" />
            </ToggleIconButton>
            <ToggleButton variant="tonal">Highlight</ToggleButton>
          </ButtonGroup>
        </Demo>
        <Demo
          wide
          title="Sizes"
          code={`
<ButtonGroup aria-label="Edit" size="large">
  <Button variant="outlined" size="large">Cut</Button>
  <Button variant="outlined" size="large">Copy</Button>
  <Button variant="outlined" size="large">Paste</Button>
</ButtonGroup>`}
        >
          <div {...stylex.props(s.stack)}>
            {SIZES.map((size) => (
              <div key={size} {...stylex.props(s.labelled)}>
                <ButtonGroup aria-label={`Edit (${size})`} size={size}>
                  {['Cut', 'Copy', 'Paste'].map((l) => (
                    <Button key={l} variant="outlined" size={size}>
                      {l}
                    </Button>
                  ))}
                </ButtonGroup>
                <span {...stylex.props(typescale.labelMedium, s.caption)}>{sizeName(size)}</span>
              </div>
            ))}
          </div>
        </Demo>
      </Section>

      <Section
        title="Connected"
        description="Segments joined with tight inner corners; the selected one turns round (or square) on a spring. Single or multiple selection."
      >
        <Demo
          title="Single selection"
          code={`
const [view, setView] = useState(['week']);

<ConnectedButtonGroup
  aria-label="Range"
  value={view}
  onValueChange={(next) => next.length > 0 && setView(next)}
>
  <ConnectedButtonGroupItem value="day">Day</ConnectedButtonGroupItem>
  <ConnectedButtonGroupItem value="week">Week</ConnectedButtonGroupItem>
  <ConnectedButtonGroupItem value="month">Month</ConnectedButtonGroupItem>
  <ConnectedButtonGroupItem value="year">Year</ConnectedButtonGroupItem>
</ConnectedButtonGroup>`}
        >
          <ViewSwitcher />
        </Demo>
        <Demo
          title="Multiple selection"
          code={`
const [styles, setStyles] = useState(['bold']);

<ConnectedButtonGroup aria-label="Text style" multiple value={styles} onValueChange={setStyles}>
  <ConnectedButtonGroupItem value="bold" aria-label="Bold" icon={<Icon name="format_bold" />} />
  <ConnectedButtonGroupItem value="italic" aria-label="Italic" icon={<Icon name="format_italic" />} />
  <ConnectedButtonGroupItem value="underline" aria-label="Underline" icon={<Icon name="format_underlined" />} />
</ConnectedButtonGroup>`}
        >
          <TextStyles />
        </Demo>
        <Demo
          title="Shape"
          code={`
<ConnectedButtonGroup aria-label="Sort" shape="round" defaultValue={['new']}>…</ConnectedButtonGroup>
<ConnectedButtonGroup aria-label="Sort" shape="square" defaultValue={['new']}>…</ConnectedButtonGroup>`}
        >
          {(['round', 'square'] as const).map((shape) => (
            <div key={shape} {...stylex.props(s.labelled)}>
              <ConnectedButtonGroup aria-label={`Sort (${shape})`} shape={shape} defaultValue={['new']}>
                <ConnectedButtonGroupItem value="new">Newest</ConnectedButtonGroupItem>
                <ConnectedButtonGroupItem value="top">Top</ConnectedButtonGroupItem>
                <ConnectedButtonGroupItem value="old">Oldest</ConnectedButtonGroupItem>
              </ConnectedButtonGroup>
              <span {...stylex.props(typescale.labelMedium, s.caption)}>{cap(shape)}</span>
            </div>
          ))}
        </Demo>
        <Demo
          title="With icons"
          code={`
<ConnectedButtonGroup aria-label="Transport" defaultValue={['car']}>
  <ConnectedButtonGroupItem
    value="car"
    icon={<Icon name="directions_car" size={20} />}
    selectedIcon={<Icon name="directions_car" size={20} filled />}
  >
    Drive
  </ConnectedButtonGroupItem>
  …
</ConnectedButtonGroup>`}
        >
          <ConnectedButtonGroup aria-label="Transport" defaultValue={['car']}>
            {[
              { value: 'car', icon: 'directions_car', label: 'Drive' },
              { value: 'bus', icon: 'directions_bus', label: 'Transit' },
              { value: 'walk', icon: 'directions_walk', label: 'Walk' },
            ].map((t) => (
              <ConnectedButtonGroupItem
                key={t.value}
                value={t.value}
                icon={<Icon name={t.icon} size={20} />}
                selectedIcon={<Icon name={t.icon} size={20} filled />}
              >
                {t.label}
              </ConnectedButtonGroupItem>
            ))}
          </ConnectedButtonGroup>
        </Demo>
        <Demo
          wide
          title="Sizes"
          code={`<ConnectedButtonGroup aria-label="Range" size="large" defaultValue={['week']}>…</ConnectedButtonGroup>`}
        >
          <div {...stylex.props(s.stack)}>
            {SIZES.map((size) => (
              <div key={size} {...stylex.props(s.labelled)}>
                <ConnectedButtonGroup aria-label={`Range (${size})`} size={size} defaultValue={['week']}>
                  {['day', 'week', 'month'].map((r) => (
                    <ConnectedButtonGroupItem
                      key={r}
                      value={r}
                      icon={<Icon name="calendar_today" size={BUTTON_ICON[size]} />}
                    >
                      {cap(r)}
                    </ConnectedButtonGroupItem>
                  ))}
                </ConnectedButtonGroup>
                <span {...stylex.props(typescale.labelMedium, s.caption)}>{sizeName(size)}</span>
              </div>
            ))}
          </div>
        </Demo>
        <Demo
          title="Disabled"
          code={`<ConnectedButtonGroup aria-label="Range" disabled defaultValue={['week']}>…</ConnectedButtonGroup>`}
        >
          <ConnectedButtonGroup aria-label="Range (disabled)" disabled defaultValue={['week']}>
            {['day', 'week', 'month'].map((r) => (
              <ConnectedButtonGroupItem key={r} value={r}>
                {cap(r)}
              </ConnectedButtonGroupItem>
            ))}
          </ConnectedButtonGroup>
        </Demo>
        <Demo
          title="Disabled segment"
          code={`<ConnectedButtonGroupItem value="year" disabled>Year</ConnectedButtonGroupItem>`}
        >
          <ConnectedButtonGroup aria-label="Range (one disabled)" defaultValue={['day']}>
            {['day', 'week', 'month'].map((r) => (
              <ConnectedButtonGroupItem key={r} value={r}>
                {cap(r)}
              </ConnectedButtonGroupItem>
            ))}
            <ConnectedButtonGroupItem value="year" disabled>
              Year
            </ConnectedButtonGroupItem>
          </ConnectedButtonGroup>
        </Demo>
      </Section>

      <Section title="Icon button sizes" description="Standard groups of icon buttons scale with the group.">
        <Demo
          wide
          title="Extra small to extra large"
          code={`<ButtonGroup aria-label="Zoom" size="xlarge">…</ButtonGroup>`}
        >
          <div {...stylex.props(s.stack)}>
            {SIZES.map((size) => (
              <ButtonGroup key={size} aria-label={`Zoom (${size})`} size={size} sx={s.natural}>
                {['zoom_out', 'zoom_in', 'fit_screen'].map((icon) => (
                  <IconButton key={icon} aria-label={icon.replace('_', ' ')} variant="tonal" size={size}>
                    <Icon name={icon} size={ICON_BUTTON_ICON[size]} />
                  </IconButton>
                ))}
              </ButtonGroup>
            ))}
          </div>
        </Demo>
      </Section>
    </Page>
  );
}
