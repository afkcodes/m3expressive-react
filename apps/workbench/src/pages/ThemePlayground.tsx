import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Fab,
  FilterChip,
  IconButton,
  LinearProgress,
  M3Provider,
  NavigationBar,
  NavigationItem,
  Radio,
  RadioGroup,
  SegmentedButton,
  SegmentedButtonItem,
  Slider,
  Switch,
  TextField,
  COLOR_ROLES,
  typescale,
  type ColorSchemeMode,
  type ContrastLevel,
} from '@m3x/react';
import {
  useDynamicScheme,
  useSeedColorsFromImage,
  type ImageSeedSource,
  type SchemeVariant,
} from '@m3x/react/dynamic-color';
import { color } from '@m3x/react/tokens/color.stylex';
import assets from '../../../../figma/navigation/assets.json';

const s = stylex.create({
  page: {
    minHeight: '100vh',
    backgroundColor: color.surface,
    color: color.onSurface,
    padding: 32,
    display: 'grid',
    gap: 24,
    alignContent: 'start',
  },
  panel: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 20,
    alignItems: 'end',
    padding: 16,
    borderRadius: 16,
    backgroundColor: color.surfaceContainer,
  },
  stage: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: color.surfaceContainerLow,
  },
  muted: { color: color.onSurfaceVariant },
  swatches: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  row: { display: 'flex', flexDirection: 'row', gap: 8 },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: { default: 'transparent', ':focus-visible': color.secondary },
    cursor: 'pointer',
    outlineStyle: 'none',
    padding: 0,
  },
  swatchOn: { borderColor: color.onSurface, boxShadow: `inset 0 0 0 2px ${color.surface}` },
  wallpapers: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  wallpaper: {
    width: 96,
    height: 64,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'transparent',
    cursor: 'pointer',
    padding: 0,
    overflow: 'hidden',
  },
  wallpaperOn: { borderColor: color.onSurface },
  drop: {
    display: 'grid',
    placeItems: 'center',
    width: 160,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.outline,
    color: color.onSurfaceVariant,
    cursor: 'pointer',
  },
  preview: { width: 96, height: 64, borderRadius: 12, objectFit: 'cover' },
  roles: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 },
  role: { display: 'grid', gridTemplateColumns: '1fr 1fr', borderRadius: 8, overflow: 'hidden', fontSize: 11 },
  roleName: { gridColumn: '1 / -1', padding: '4px 8px', backgroundColor: color.surfaceContainerHighest },
  roleChip: { padding: '10px 8px', fontFamily: 'ui-monospace, monospace' },
});

const field = { font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8 } as const;

/** Hard-coded seed presets (generic hues; the first is the M3 baseline seed). */
const PRESETS = ['#6750A4', '#006A6A', '#B33B15', '#386A20', '#0061A4', '#6D5E0F', '#984061'];

const VARIANTS: SchemeVariant[] = [
  'tonal-spot',
  'neutral',
  'vibrant',
  'expressive',
  'fidelity',
  'content',
  'rainbow',
  'fruit-salad',
  'monochrome',
];

/** Procedural "wallpapers" (canvas gradients) to seed from without shipping photos. */
const WALLPAPERS: Record<string, Array<[number, string]>> = {
  Sunset: [
    [0, '#2B1055'],
    [0.45, '#D53369'],
    [0.8, '#F2A65A'],
    [1, '#FFE29F'],
  ],
  Forest: [
    [0, '#0B3D2E'],
    [0.5, '#2F6B3B'],
    [0.85, '#A7C957'],
    [1, '#F2E8CF'],
  ],
  Ocean: [
    [0, '#03045E'],
    [0.4, '#0077B6'],
    [0.75, '#48CAE4'],
    [1, '#CAF0F8'],
  ],
  Desert: [
    [0, '#5E3023'],
    [0.4, '#C08552'],
    [0.8, '#E9C46A'],
    [1, '#F4E9CD'],
  ],
};

function paintWallpaper(canvas: HTMLCanvasElement, stops: Array<[number, string]>) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const g = ctx.createLinearGradient(0, 0, canvas.width * 0.4, canvas.height);
  for (const [at, c] of stops) g.addColorStop(at, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // A sun / highlight so the image isn't a pure gradient.
  ctx.fillStyle = stops.at(-1)![1];
  ctx.beginPath();
  ctx.arc(canvas.width * 0.72, canvas.height * 0.35, canvas.height * 0.14, 0, Math.PI * 2);
  ctx.fill();
}

function Wallpaper({
  name,
  selected,
  onPick,
}: {
  name: string;
  selected: boolean;
  onPick: (canvas: HTMLCanvasElement) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) paintWallpaper(ref.current, WALLPAPERS[name]!);
  }, [name]);
  return (
    <button
      type="button"
      aria-label={`${name} wallpaper`}
      aria-pressed={selected}
      onClick={() => ref.current && onPick(ref.current)}
      {...stylex.props(s.wallpaper, selected && s.wallpaperOn)}
    >
      <canvas ref={ref} width={192} height={128} style={{ display: 'block', width: '100%', height: '100%' }} />
    </button>
  );
}

const Icon = ({ name }: { name: keyof typeof assets.icons }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={assets.icons[name]} />
  </svg>
);

function Preview() {
  const [nav, setNav] = useState(0);
  return (
    <>
      <div {...stylex.props(s.stage)}>
        <Button>Filled</Button>
        <Button variant="tonal">Tonal</Button>
        <Button variant="outlined">Outlined</Button>
        <Button variant="elevated">Elevated</Button>
        <Button variant="text">Text</Button>
        <IconButton aria-label="Favourite" variant="filled">
          <Icon name="stars-24" />
        </IconButton>
        <Fab aria-label="Compose">
          <Icon name="stars_filled-24" />
        </Fab>
        <Fab aria-label="Compose tertiary" color="tertiaryContainer">
          <Icon name="stars_filled-24" />
        </Fab>
      </div>
      <div {...stylex.props(s.stage)}>
        <FilterChip defaultSelected>Selected</FilterChip>
        <FilterChip>Filter</FilterChip>
        <Switch aria-label="Wi-Fi" defaultChecked />
        <Checkbox aria-label="Agree" defaultChecked />
        <RadioGroup defaultValue="a" aria-label="Plan" sx={s.row}>
          <Radio value="a" aria-label="Plan A" />
          <Radio value="b" aria-label="Plan B" />
        </RadioGroup>
        <SegmentedButton defaultValue={['week']} aria-label="Range">
          <SegmentedButtonItem value="day">Day</SegmentedButtonItem>
          <SegmentedButtonItem value="week">Week</SegmentedButtonItem>
          <SegmentedButtonItem value="month">Month</SegmentedButtonItem>
        </SegmentedButton>
      </div>
      <div {...stylex.props(s.stage)}>
        <div style={{ width: 280, display: 'grid', gap: 16 }}>
          <Slider defaultValue={60} aria-label="Volume" />
          <LinearProgress value={65} shape="wavy" aria-label="Upload" />
        </div>
        <CircularProgress value={70} shape="wavy" aria-label="Sync" />
        <CircularProgress aria-label="Loading" />
        <TextField label="Account name" defaultValue="Everyday account" supportingText="Shown on your statements" />
      </div>
      <div {...stylex.props(s.stage)}>
        <Card variant="filled">
          <CardContent>
            <div {...stylex.props(typescale.titleMedium)}>Filled card</div>
            <div {...stylex.props(typescale.bodyMedium, s.muted)}>Surface container highest</div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardContent>
            <div {...stylex.props(typescale.titleMedium)}>Elevated card</div>
            <div {...stylex.props(typescale.bodyMedium, s.muted)}>Surface container low</div>
          </CardContent>
        </Card>
        <div style={{ width: 360 }}>
          <NavigationBar value={nav} onValueChange={(v) => setNav(v as number)} aria-label="Sections">
            {['Home', 'Activity', 'Saved'].map((t, i) => (
              <NavigationItem
                key={t}
                value={i}
                icon={<Icon name="stars-24" />}
                selectedIcon={<Icon name="stars_filled-24" />}
                label={t}
              />
            ))}
          </NavigationBar>
        </div>
      </div>
    </>
  );
}

/** Every generated role, light and dark, with its hex. */
function RoleTable({ colors }: { colors: ReturnType<typeof useDynamicScheme> }) {
  if (!colors)
    return (
      <p {...stylex.props(typescale.bodyMedium, s.muted)}>
        Baseline (Figma kit) colours — pick a seed to generate a scheme.
      </p>
    );
  return (
    <div {...stylex.props(s.roles)}>
      {COLOR_ROLES.map((role) => (
        <div key={role} {...stylex.props(s.role)}>
          <span {...stylex.props(s.roleName)}>{role}</span>
          {(['light', 'dark'] as const).map((mode) => (
            <span
              key={mode}
              {...stylex.props(s.roleChip)}
              style={{ backgroundColor: colors[role][mode], color: contrastText(colors[role][mode]) }}
            >
              {colors[role][mode]}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Black or white label for a swatch (relative luminance). */
function contrastText(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return l > 0.4 ? '#000' : '#FFF';
}

/** Dynamic colour: seed the whole scheme from a colour or from an image (Material You). */
export function ThemePlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [contrast, setContrast] = useState<ContrastLevel>('standard');
  const [variant, setVariant] = useState<SchemeVariant>('tonal-spot');
  const [spec, setSpec] = useState<'2021' | '2025'>('2025');
  const [seed, setSeed] = useState<string | null>(PRESETS[1]!);
  const [image, setImage] = useState<{ source: ImageSeedSource; label: string; preview?: string } | null>(null);
  const extracted = useSeedColorsFromImage(image?.source);
  const colors = useDynamicScheme(seed, { variant, contrast, specVersion: spec });

  // Use the image's best colour as soon as it is extracted (Android picks the top-ranked seed);
  // adjusted during render, not in an effect (the hook's result is memoised).
  const [adopted, setAdopted] = useState(extracted);
  if (adopted !== extracted) {
    setAdopted(extracted);
    if (extracted.status === 'ready' && extracted.colors[0]) setSeed(extracted.colors[0]);
  }

  const preview = image?.preview;
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const pickFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImage({ source: file, label: file.name, preview: URL.createObjectURL(file) });
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    pickFile(e.dataTransfer.files[0]);
  };
  const candidates = useMemo(() => (image ? extracted.colors : []), [image, extracted.colors]);

  return (
    <M3Provider colorScheme={scheme} contrast={contrast} colors={colors}>
      <main {...stylex.props(s.page)}>
        <p style={{ margin: 0 }}>
          <a href="/" style={{ color: 'inherit' }}>
            ← all
          </a>
        </p>
        <h1 {...stylex.props(typescale.headlineMedium)} style={{ margin: 0 }}>
          Dynamic colour
        </h1>
        <p {...stylex.props(typescale.bodyMedium, s.muted)} style={{ margin: 0, maxWidth: 720 }}>
          Every colour role is generated from one seed with Google&apos;s material-color-utilities — the system behind
          Android&apos;s wallpaper colours. Seed from a colour, or from a picture: its colours are quantised and scored,
          and the best one seeds the scheme.
        </p>

        <section {...stylex.props(s.panel)}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>colour scheme</span>
            <select value={scheme} onChange={(e) => setScheme(e.target.value as ColorSchemeMode)} style={field}>
              <option>light</option>
              <option>dark</option>
              <option>system</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>variant</span>
            <select value={variant} onChange={(e) => setVariant(e.target.value as SchemeVariant)} style={field}>
              {VARIANTS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>contrast</span>
            <select value={contrast} onChange={(e) => setContrast(e.target.value as ContrastLevel)} style={field}>
              <option>standard</option>
              <option>medium</option>
              <option>high</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>colour spec</span>
            <select value={spec} onChange={(e) => setSpec(e.target.value as '2021' | '2025')} style={field}>
              <option value="2025">2025 (M3 Expressive)</option>
              <option value="2021">2021</option>
            </select>
          </label>
        </section>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>
          Seed colour
        </h2>
        <section {...stylex.props(s.panel)}>
          <div {...stylex.props(s.swatches)} role="group" aria-label="Seed presets">
            {PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Seed ${c}`}
                aria-pressed={seed === c && !image}
                onClick={() => {
                  setImage(null);
                  setSeed(c);
                }}
                style={{ backgroundColor: c }}
                {...stylex.props(s.swatch, seed === c && !image && s.swatchOn)}
              />
            ))}
          </div>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>any colour</span>
            <input
              type="color"
              value={seed ?? '#6750A4'}
              onChange={(e) => {
                setImage(null);
                setSeed(e.target.value.toUpperCase());
              }}
              style={{ width: 56, height: 36, padding: 0, border: 0, background: 'none' }}
            />
          </label>
          <Button
            variant="text"
            onClick={() => {
              setImage(null);
              setSeed(null);
            }}
          >
            Baseline colours
          </Button>
          <span {...stylex.props(typescale.labelLarge, s.muted)}>seed: {seed ?? 'none (Figma kit)'}</span>
        </section>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>
          Seed from a picture
        </h2>
        <section {...stylex.props(s.panel)}>
          <div {...stylex.props(s.wallpapers)}>
            {Object.keys(WALLPAPERS).map((name) => (
              <Wallpaper
                key={name}
                name={name}
                selected={image?.label === name}
                onPick={(canvas) => setImage({ source: canvas, label: name })}
              />
            ))}
            {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- drag-and-drop is an extra; the file input is the accessible path */}
            <label
              {...stylex.props(s.drop, typescale.labelMedium)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
            >
              <input type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
              Upload or drop a picture
            </label>
            {preview && <img src={preview} alt={image?.label ?? ''} {...stylex.props(s.preview)} />}
          </div>
          {image && (
            <div style={{ display: 'grid', gap: 6 }}>
              <span {...stylex.props(typescale.labelMedium, s.muted)}>
                {extracted.status === 'loading'
                  ? 'extracting…'
                  : extracted.status === 'error'
                    ? `couldn't read the image: ${extracted.error?.message}`
                    : 'colours from the picture (best first)'}
              </span>
              <div {...stylex.props(s.swatches)} role="group" aria-label="Seed colours from the picture">
                {candidates.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Seed ${c}`}
                    aria-pressed={seed === c}
                    onClick={() => setSeed(c)}
                    style={{ backgroundColor: c }}
                    {...stylex.props(s.swatch, seed === c && s.swatchOn)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>
          Components
        </h2>
        <Preview />

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>
          Generated roles
        </h2>
        <RoleTable colors={colors} />
      </main>
    </M3Provider>
  );
}
