import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Avatar,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  CardHeadline,
  CardMedia,
  CardText,
  IconButton,
  Switch,
  typescale,
  type CardVariant,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const VARIANTS: { variant: CardVariant; label: string; note: string }[] = [
  { variant: 'elevated', label: 'Elevated', note: 'A shadow separates it from the background.' },
  { variant: 'filled', label: 'Filled', note: 'A tonal fill; the subtlest separation.' },
  { variant: 'outlined', label: 'Outlined', note: 'A visual boundary around the content.' },
];

const s = stylex.create({
  stack: { width: 'min(100%, 360px)' },
  small: {
    width: 220,
    minHeight: 132,
    padding: 16,
    rowGap: 8,
  },
  list: { display: 'flex', flexDirection: 'column', rowGap: 16, width: 'min(100%, 360px)' },
  horizontal: { width: '100%' },
  grow: { flexGrow: 1, minWidth: 0 },
  title: { margin: 0, color: color.onSurface },
  muted: { margin: 0, color: color.onSurfaceVariant },
  tile: {
    padding: 16,
    rowGap: 12,
    minHeight: 148,
    justifyContent: 'space-between',
  },
  tileIcon: { color: color.primary },
  grid: {
    display: 'grid',
    gap: 12,
    width: '100%',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  },
  status: { margin: 0, width: '100%', textAlign: 'center', color: color.onSurfaceVariant },
  control: { display: 'flex', alignItems: 'center', columnGap: 12, color: color.onSurface, cursor: 'pointer' },
});

/** Picture-like media drawn from the colour tokens (a sky, a sun and two hills), so it follows the theme. */
const scene = stylex.create({
  base: { width: '100%', height: '100%' },
  dawn: {
    backgroundImage: `radial-gradient(ellipse 80% 42% at 85% 100%, ${color.primary} 0 98%, transparent 100%), radial-gradient(ellipse 75% 55% at 15% 100%, ${color.onPrimaryContainer} 0 98%, transparent 100%), radial-gradient(circle at 72% 32%, ${color.tertiaryFixedDim} 0 22px, transparent 23px), linear-gradient(180deg, ${color.tertiaryContainer}, ${color.primaryContainer})`,
  },
  lagoon: {
    backgroundImage: `radial-gradient(ellipse 70% 40% at 20% 100%, ${color.secondary} 0 98%, transparent 100%), radial-gradient(ellipse 90% 52% at 90% 100%, ${color.onSecondaryContainer} 0 98%, transparent 100%), radial-gradient(circle at 28% 30%, ${color.primaryFixed} 0 18px, transparent 19px), linear-gradient(180deg, ${color.secondaryContainer}, ${color.surfaceContainerHigh})`,
  },
  desert: {
    backgroundImage: `radial-gradient(ellipse 85% 38% at 80% 100%, ${color.tertiary} 0 98%, transparent 100%), radial-gradient(ellipse 70% 58% at 10% 100%, ${color.onTertiaryContainer} 0 98%, transparent 100%), radial-gradient(circle at 60% 26%, ${color.primaryFixedDim} 0 20px, transparent 21px), linear-gradient(180deg, ${color.tertiaryFixed}, ${color.tertiaryContainer})`,
  },
});

function MoreButton() {
  return (
    <IconButton aria-label="More options">
      <Icon name="more_vert" />
    </IconButton>
  );
}

export default function CardsPage() {
  const [clicks, setClicks] = useState<Record<CardVariant, number>>({ elevated: 0, filled: 0, outlined: 0 });
  const [dragged, setDragged] = useState(true);
  const [opened, setOpened] = useState<string | null>(null);

  return (
    <Page
      title="Cards"
      summary="Cards hold content and actions about a single subject. Three styles — elevated, filled and outlined — stacked or horizontal, static or one big tap target."
    >
      <Section
        title="Variants"
        description="Pick the style by how much the card needs to stand out from its surroundings."
      >
        <Demo
          wide
          title="Elevated, filled and outlined"
          code={`
<Card variant="elevated">…</Card>
<Card variant="filled">…</Card>
<Card variant="outlined">…</Card>`}
        >
          {VARIANTS.map(({ variant, label, note }) => (
            <Card key={variant} variant={variant} sx={s.small}>
              <h3 {...stylex.props(typescale.titleMedium, s.title)}>{label}</h3>
              <p {...stylex.props(typescale.bodyMedium, s.muted)}>{note}</p>
            </Card>
          ))}
        </Demo>
      </Section>

      <Section
        title="Layouts"
        description="Cards are built from parts: a header with an avatar and an action, media, a headline, text and actions."
      >
        <Demo
          title="Stacked"
          code={`
<Card variant="outlined">
  <CardHeader
    avatar={<Avatar>M</Avatar>}
    headline="Mara Lindqvist"
    subhead="Shared an album"
    action={
      <IconButton aria-label="More options">
        <Icon name="more_vert" />
      </IconButton>
    }
  />
  <CardMedia>{/* an image, video or canvas */}</CardMedia>
  <CardContent>
    <CardHeadline headline="Lofoten in October" subhead="42 photos" />
    <CardText>Low sun over the fjords, the first snow on the peaks and a week of northern lights.</CardText>
    <CardActions>
      <Button variant="outlined">Save</Button>
      <Button>Open album</Button>
    </CardActions>
  </CardContent>
</Card>`}
        >
          <Card variant="outlined" sx={s.stack}>
            <CardHeader
              avatar={<Avatar>M</Avatar>}
              headline="Mara Lindqvist"
              subhead="Shared an album"
              action={<MoreButton />}
            />
            <CardMedia>
              <div aria-hidden {...stylex.props(scene.base, scene.dawn)} />
            </CardMedia>
            <CardContent>
              <CardHeadline headline="Lofoten in October" subhead="42 photos" />
              <CardText>Low sun over the fjords, the first snow on the peaks and a week of northern lights.</CardText>
              <CardActions>
                <Button variant="outlined">Save</Button>
                <Button>Open album</Button>
              </CardActions>
            </CardContent>
          </Card>
        </Demo>
        <Demo
          title="Horizontal"
          code={`
<Card variant="filled" orientation="horizontal">
  <CardHeader avatar={<Avatar>R</Avatar>} headline="Rooftop garden" subhead="Saturday · 10:00" sx={grow} />
  <CardMedia width={80} height={80}>{/* thumbnail */}</CardMedia>
</Card>`}
        >
          <div {...stylex.props(s.list)}>
            {(
              [
                ['R', 'Rooftop garden', 'Saturday · 10:00', 'filled', scene.lagoon],
                ['T', 'Trail run, 12 km', 'Sunday · 08:30', 'elevated', scene.desert],
                ['J', 'Jazz on the quay', 'Friday · 19:00', 'outlined', scene.dawn],
              ] as const
            ).map(([initial, headline, subhead, variant, art]) => (
              <Card key={headline} variant={variant} orientation="horizontal" sx={s.horizontal}>
                <CardHeader avatar={<Avatar>{initial}</Avatar>} headline={headline} subhead={subhead} sx={s.grow} />
                <CardMedia width={80} height={80}>
                  <div aria-hidden {...stylex.props(scene.base, art)} />
                </CardMedia>
              </Card>
            ))}
          </div>
        </Demo>
      </Section>

      <Section
        title="Interactive"
        description="With onClick the whole card is one action: hover, press, Tab to focus and Enter or Space to activate. Don't nest other controls in it."
      >
        <Demo
          wide
          title="Clickable"
          code={`
const [clicks, setClicks] = useState(0);

<Card variant="elevated" onClick={() => setClicks((c) => c + 1)}>
  <h3>Elevated</h3>
  <p>Opened {clicks} times</p>
</Card>`}
        >
          {VARIANTS.map(({ variant, label }) => (
            <Card
              key={variant}
              variant={variant}
              onClick={() => setClicks((c) => ({ ...c, [variant]: c[variant] + 1 }))}
              sx={s.small}
            >
              <h3 {...stylex.props(typescale.titleMedium, s.title)}>{label}</h3>
              <p {...stylex.props(typescale.bodyMedium, s.muted)}>
                Opened {clicks[variant]} {clicks[variant] === 1 ? 'time' : 'times'}
              </p>
            </Card>
          ))}
        </Demo>
        <Demo
          title="Drag state"
          column
          code={`
<Card variant="outlined" interactive dragged={isDragging}>
  …
</Card>`}
        >
          <label {...stylex.props(typescale.bodyLarge, s.control)}>
            <Switch checked={dragged} onCheckedChange={setDragged} />
            Dragged
          </label>
          <Card variant="outlined" interactive dragged={dragged} sx={s.tile}>
            <Icon name="drag_indicator" />
            <div>
              <h3 {...stylex.props(typescale.titleMedium, s.title)}>Quarterly report</h3>
              <p {...stylex.props(typescale.bodyMedium, s.muted)}>
                Your drag-and-drop layer sets <code>dragged</code>: the card lifts and takes the 16% drag layer.
              </p>
            </div>
          </Card>
        </Demo>
        <Demo
          title="A grid of cards"
          column
          code={`
<div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
  {folders.map((f) => (
    <Card key={f.name} variant="filled" onClick={() => open(f)}>
      <Icon name={f.icon} />
      <h3>{f.name}</h3>
      <p>{f.count} files</p>
    </Card>
  ))}
</div>`}
        >
          <div {...stylex.props(s.grid)}>
            {(
              [
                ['description', 'Invoices', 128],
                ['receipt_long', 'Receipts', 342],
                ['contract', 'Contracts', 16],
                ['photo_library', 'Photos', 1024],
                ['savings', 'Tax', 9],
                ['folder_shared', 'Shared', 57],
              ] as const
            ).map(([icon, name, count]) => (
              <Card key={name} variant="filled" onClick={() => setOpened(name)} sx={s.tile}>
                <span {...stylex.props(s.tileIcon)}>
                  <Icon name={icon} />
                </span>
                <div>
                  <h3 {...stylex.props(typescale.titleMedium, s.title)}>{name}</h3>
                  <p {...stylex.props(typescale.bodySmall, s.muted)}>{count} files</p>
                </div>
              </Card>
            ))}
          </div>
          <p {...stylex.props(typescale.bodyMedium, s.status)} aria-live="polite">
            {opened ? `Opened ${opened}` : 'Choose a folder'}
          </p>
        </Demo>
      </Section>
    </Page>
  );
}
