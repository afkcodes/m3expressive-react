import * as stylex from '@stylexjs/stylex';
import { COLOR_ROLES, M3Provider, typescale, type ColorRole } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';

/**
 * A tile: the role, and what to draw on it. `on` is a paired role, shown as a strip under the tile
 * (M3's "on" colour); `ink` is a label colour for roles without a pair (a role, or a literal for the
 * always-black shadow and scrim).
 */
interface Tile {
  role: ColorRole;
  on?: ColorRole;
  ink?: ColorRole | 'white';
}

interface Group {
  title: string;
  description: string;
  tiles: Tile[];
}

const GROUPS: Group[] = [
  {
    title: 'Primary',
    description: 'Key components: FABs, prominent buttons, active states.',
    tiles: [
      { role: 'primary', on: 'onPrimary' },
      { role: 'primaryContainer', on: 'onPrimaryContainer' },
      { role: 'inversePrimary', ink: 'inverseSurface' },
      { role: 'surfaceTint', ink: 'onPrimary' },
    ],
  },
  {
    title: 'Secondary',
    description: 'Less prominent components: filter chips, tonal buttons.',
    tiles: [
      { role: 'secondary', on: 'onSecondary' },
      { role: 'secondaryContainer', on: 'onSecondaryContainer' },
    ],
  },
  {
    title: 'Tertiary',
    description: 'Contrasting accents that balance primary and secondary.',
    tiles: [
      { role: 'tertiary', on: 'onTertiary' },
      { role: 'tertiaryContainer', on: 'onTertiaryContainer' },
    ],
  },
  {
    title: 'Error',
    description: 'Errors and destructive actions.',
    tiles: [
      { role: 'error', on: 'onError' },
      { role: 'errorContainer', on: 'onErrorContainer' },
    ],
  },
  {
    title: 'Surface',
    description: 'Backgrounds and containers, from lowest to highest emphasis.',
    tiles: [
      { role: 'surface', on: 'onSurface' },
      { role: 'surfaceVariant', on: 'onSurfaceVariant' },
      { role: 'background', on: 'onBackground' },
      { role: 'inverseSurface', on: 'inverseOnSurface' },
      { role: 'surfaceDim', ink: 'onSurface' },
      { role: 'surfaceBright', ink: 'onSurface' },
      { role: 'surfaceContainerLowest', ink: 'onSurface' },
      { role: 'surfaceContainerLow', ink: 'onSurface' },
      { role: 'surfaceContainer', ink: 'onSurface' },
      { role: 'surfaceContainerHigh', ink: 'onSurface' },
      { role: 'surfaceContainerHighest', ink: 'onSurface' },
    ],
  },
  {
    title: 'Outline',
    description: 'Strokes, dividers, shadows and scrims.',
    tiles: [
      { role: 'outline', ink: 'surface' },
      { role: 'outlineVariant', ink: 'onSurface' },
      { role: 'shadow', ink: 'white' },
      { role: 'scrim', ink: 'white' },
    ],
  },
  {
    title: 'Fixed',
    description: 'Accents that keep the same colour in light and dark themes.',
    tiles: [
      { role: 'primaryFixed', on: 'onPrimaryFixed' },
      { role: 'primaryFixedDim', on: 'onPrimaryFixedVariant' },
      { role: 'secondaryFixed', on: 'onSecondaryFixed' },
      { role: 'secondaryFixedDim', on: 'onSecondaryFixedVariant' },
      { role: 'tertiaryFixed', on: 'onTertiaryFixed' },
      { role: 'tertiaryFixedDim', on: 'onTertiaryFixedVariant' },
    ],
  },
];

// Every role must appear once, as a tile or as its pair's strip.
const shown = new Set(GROUPS.flatMap((g) => g.tiles.flatMap((t) => (t.on ? [t.role, t.on] : [t.role]))));
const missing = COLOR_ROLES.filter((role) => !shown.has(role));
if (missing.length > 0)
  GROUPS.push({
    title: 'Other',
    description: 'Remaining roles.',
    tiles: missing.map((role) => ({ role, ink: 'onSurface' })),
  });

const s = stylex.create({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12,
    width: '100%',
    paddingTop: 24,
  },
  tile: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: shape.cornerMedium,
    overflow: 'hidden',
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: color.outlineVariant,
    outlineOffset: -1,
  },
  block: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 16,
    flexGrow: 1,
    minHeight: 96,
    padding: 12,
  },
  strip: { paddingBlock: 8, paddingInline: 12 },
  name: { margin: 0, overflowWrap: 'anywhere' },
  paint: (background: string, ink: string) => ({ backgroundColor: background, color: ink }),
  pair: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
    gap: 16,
    width: '100%',
  },
  scheme: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 16,
    borderRadius: shape.cornerLarge,
    backgroundColor: color.surface,
    color: color.onSurface,
  },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexGrow: 1,
    paddingBlock: 12,
    paddingInline: 12,
    borderRadius: shape.cornerSmall,
  },
});

const ink = (t: Tile): string => (t.on ? color[t.on] : t.ink === 'white' ? '#FFFFFF' : color[t.ink ?? 'onSurface']);

function Swatch({ tile }: { tile: Tile }) {
  return (
    <div {...stylex.props(s.tile)}>
      <div {...stylex.props(s.block, s.paint(color[tile.role], ink(tile)))}>
        <p {...stylex.props(typescale.labelLarge, s.name)}>{tile.role}</p>
        <span {...stylex.props(typescale.bodySmall)}>{tile.on ? `on: ${tile.on}` : 'Aa'}</span>
      </div>
      {tile.on && (
        <div {...stylex.props(s.strip, s.paint(color[tile.on], color[tile.role]))}>
          <p {...stylex.props(typescale.labelMedium, s.name)}>{tile.on}</p>
        </div>
      )}
    </div>
  );
}

const SIDE_BY_SIDE: Tile[] = [
  { role: 'primary', on: 'onPrimary' },
  { role: 'secondaryContainer', on: 'onSecondaryContainer' },
  { role: 'tertiaryContainer', on: 'onTertiaryContainer' },
  { role: 'surfaceContainerHighest', on: 'onSurface' },
];

function SchemePreview({ mode }: { mode: 'light' | 'dark' }) {
  return (
    <M3Provider colorScheme={mode}>
      <div {...stylex.props(s.scheme)}>
        <span {...stylex.props(typescale.titleSmall)}>{mode === 'light' ? 'Light' : 'Dark'}</span>
        <div {...stylex.props(s.row)}>
          {SIDE_BY_SIDE.map((t) => (
            <span key={t.role} {...stylex.props(typescale.labelMedium, s.chip, s.paint(color[t.role], ink(t)))}>
              {t.role}
            </span>
          ))}
        </div>
      </div>
    </M3Provider>
  );
}

export default function ColorPage() {
  return (
    <Page
      title="Color"
      summary="49 colour roles, each with a light and a dark value. Change the mode, seed colour and contrast in the theme panel: every swatch, and every component, follows."
    >
      <Section
        title="Using roles"
        description="Roles are StyleX variables resolved with CSS light-dark(), so a subtree flips with its color-scheme."
      >
        <Demo
          title="Light and dark, side by side"
          code={`
import { M3Provider } from '@m3x/react';

<M3Provider colorScheme="light">…</M3Provider>
<M3Provider colorScheme="dark">…</M3Provider>`}
          column
        >
          <div {...stylex.props(s.pair)}>
            <SchemePreview mode="light" />
            <SchemePreview mode="dark" />
          </div>
        </Demo>
        <Demo
          title="In your styles"
          code={`
import * as stylex from '@stylexjs/stylex';
import { color } from '@m3x/react/tokens/color.stylex';

const styles = stylex.create({
  banner: {
    backgroundColor: color.primaryContainer,
    color: color.onPrimaryContainer,
  },
});`}
        >
          <Swatch tile={{ role: 'primaryContainer', on: 'onPrimaryContainer' }} />
        </Demo>
      </Section>

      {GROUPS.map((group) => (
        <Section key={group.title} title={group.title} description={group.description}>
          <Demo wide start>
            <div {...stylex.props(s.grid)}>
              {group.tiles.map((tile) => (
                <Swatch key={tile.role} tile={tile} />
              ))}
            </div>
          </Demo>
        </Section>
      ))}
    </Page>
  );
}
