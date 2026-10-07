import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Button,
  ButtonGroup,
  ConnectedButtonGroup,
  ConnectedButtonGroupItem,
  ExtendedFab,
  Fab,
  FabMenu,
  FabMenuItem,
  IconButton,
  M3Provider,
  Menu,
  MenuItem,
  SegmentedButton,
  SegmentedButtonItem,
  SplitButton,
  SplitButtonLeading,
  SplitButtonTrailing,
  ToggleButton,
  ToggleIconButton,
  typescale,
  type ButtonShape,
  type ButtonSize,
  type ButtonVariant,
  type FabColor,
  type ColorSchemeMode,
  type ContrastLevel,
  type IconButtonVariant,
  type IconButtonWidth,
  type ToggleButtonVariant,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import assets from '../../../../figma/button/assets.json';
import toggleAssets from '../../../../figma/toggle-icon-button/assets.json';

const VARIANTS: ButtonVariant[] = ['filled', 'tonal', 'outlined', 'elevated', 'text'];
const SIZES: ButtonSize[] = ['xsmall', 'small', 'medium', 'large', 'xlarge'];
const SHAPES: ButtonShape[] = ['round', 'square'];
const ICON_VARIANTS: IconButtonVariant[] = ['filled', 'tonal', 'outlined', 'standard'];
const WIDTHS: IconButtonWidth[] = ['narrow', 'default', 'wide'];
const TOGGLE_VARIANTS: ToggleButtonVariant[] = ['filled', 'tonal', 'outlined', 'elevated'];
const FAB_COLORS: FabColor[] = [
  'primary-container',
  'secondary-container',
  'tertiary-container',
  'primary',
  'secondary',
  'tertiary',
];

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
    display: 'grid',
    placeItems: 'center',
    minHeight: 220,
    borderRadius: 24,
    backgroundColor: color.surfaceContainerLow,
    gap: 16,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'max-content repeat(5, max-content)',
    gap: 16,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: color.surfaceContainerLow,
    overflowX: 'auto',
  },
  muted: { color: color.onSurfaceVariant },
  code: {
    fontFamily: 'ui-monospace, Menlo, monospace',
    fontSize: 13,
    padding: 12,
    borderRadius: 12,
    backgroundColor: color.surfaceContainerHighest,
    whiteSpace: 'pre',
    margin: 0,
  },
});

function StarsFilled() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d={assets.icon} />
    </svg>
  );
}

/** The kit's toggle icons: outlined "stars" when off, "stars_filled" when selected. */
function Stars({ selected = false }: { selected?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
      <path d={selected ? toggleAssets.selectedIcon : toggleAssets.icon} />
    </svg>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
      <span {...stylex.props(s.muted)}>{label}</span>
      {children}
    </label>
  );
}

function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      style={{ font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8 }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function ButtonPlayground() {
  const [variant, setVariant] = useState<ButtonVariant>('filled');
  const [size, setSize] = useState<ButtonSize>('small');
  const [shape, setShape] = useState<ButtonShape>('round');
  const [label, setLabel] = useState('Label');
  const [withIcon, setWithIcon] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [contrast, setContrast] = useState<ContrastLevel>('standard');
  const [motion, setMotion] = useState<'expressive' | 'standard'>('expressive');
  const [clicks, setClicks] = useState(0);
  const [fabExpanded, setFabExpanded] = useState(true);

  const props = [
    variant !== 'filled' && `variant="${variant}"`,
    size !== 'small' && `size="${size}"`,
    shape !== 'round' && `shape="${shape}"`,
    withIcon && 'icon={<Icon />}',
    disabled && 'disabled',
  ].filter(Boolean);
  const snippet = `<Button${props.length ? ' ' + props.join(' ') : ''}>${label}</Button>`;

  return (
    <M3Provider colorScheme={scheme} contrast={contrast} motionScheme={motion}>
      <main {...stylex.props(s.page)}>
        <p style={{ margin: 0 }}>
          <a href="/" style={{ color: 'inherit' }}>
            ← all
          </a>
        </p>
        <h1 {...stylex.props(typescale.headlineMedium)} style={{ margin: 0 }}>
          Button playground
        </h1>
        <p {...stylex.props(typescale.bodyMedium, s.muted)} style={{ margin: 0 }}>
          Hover it, press and hold to see the shape morph and ripple, and use Tab to see the focus ring. Everything here
          is the real component, not a picture.
        </p>

        <section {...stylex.props(s.panel)}>
          <Field label="Variant">
            <Select value={variant} options={VARIANTS} onChange={setVariant} />
          </Field>
          <Field label="Size">
            <Select value={size} options={SIZES} onChange={setSize} />
          </Field>
          <Field label="Shape">
            <Select value={shape} options={SHAPES} onChange={setShape} />
          </Field>
          <Field label="Label">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{ font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8, width: 140 }}
            />
          </Field>
          <Field label="Icon">
            <input type="checkbox" checked={withIcon} onChange={(e) => setWithIcon(e.target.checked)} />
          </Field>
          <Field label="Disabled">
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
          </Field>
          <Field label="Colour scheme">
            <Select value={scheme} options={['light', 'dark', 'system'] as const} onChange={setScheme} />
          </Field>
          <Field label="Contrast">
            <Select value={contrast} options={['standard', 'medium', 'high'] as const} onChange={setContrast} />
          </Field>
          <Field label="Motion">
            <Select value={motion} options={['expressive', 'standard'] as const} onChange={setMotion} />
          </Field>
        </section>

        <section {...stylex.props(s.stage)}>
          <Button
            variant={variant}
            size={size}
            shape={shape}
            icon={withIcon ? <StarsFilled /> : undefined}
            disabled={disabled}
            onClick={() => setClicks((c) => c + 1)}
          >
            {label || undefined}
          </Button>
          <span {...stylex.props(typescale.labelMedium, s.muted)}>clicked {clicks}×</span>
        </section>

        <pre {...stylex.props(s.code)}>{snippet}</pre>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: '8px 0 0' }}>
          Icon buttons ({shape}, {size})
        </h2>
        <section {...stylex.props(s.grid)} style={{ gridTemplateColumns: 'max-content repeat(3, max-content)' }}>
          <span />
          {WIDTHS.map((w) => (
            <span key={w} {...stylex.props(typescale.labelMedium, s.muted)}>
              {w}
            </span>
          ))}
          {ICON_VARIANTS.map((v) => (
            <Row key={v} label={v}>
              {WIDTHS.map((w) => (
                <IconButton
                  key={w}
                  aria-label={`${v} ${w}`}
                  variant={v}
                  size={size}
                  width={w}
                  shape={shape}
                  disabled={disabled}
                >
                  <StarsFilled />
                </IconButton>
              ))}
            </Row>
          ))}
        </section>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: '8px 0 0' }}>
          Toggle buttons ({shape} when off, {size}) — click to select
        </h2>
        <section {...stylex.props(s.grid)} style={{ gridTemplateColumns: 'max-content repeat(2, max-content)' }}>
          <span />
          <span {...stylex.props(typescale.labelMedium, s.muted)}>button</span>
          <span {...stylex.props(typescale.labelMedium, s.muted)}>icon button (narrow · default · wide)</span>
          {TOGGLE_VARIANTS.map((v) => (
            <Row key={v} label={v}>
              <ToggleButton
                variant={v}
                size={size}
                shape={shape}
                icon={<Stars />}
                selectedIcon={<Stars selected />}
                disabled={disabled}
              >
                {label || undefined}
              </ToggleButton>
              <span style={{ display: 'inline-flex', gap: 8 }}>
                {WIDTHS.map((w) => (
                  <ToggleIconButton
                    key={w}
                    aria-label={`${v} ${w} toggle`}
                    variant={v === 'elevated' ? 'standard' : v}
                    size={size}
                    width={w}
                    shape={shape}
                    selectedIcon={<Stars selected />}
                    disabled={disabled}
                  >
                    <Stars />
                  </ToggleIconButton>
                ))}
              </span>
            </Row>
          ))}
        </section>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: '8px 0 0' }}>
          Split buttons ({size}) — hover each half, the chevron opens a menu
        </h2>
        <section {...stylex.props(s.grid)} style={{ gridTemplateColumns: 'repeat(4, max-content)' }}>
          {TOGGLE_VARIANTS.map((v) => (
            <SplitButton key={v} variant={v} size={size} disabled={disabled}>
              <SplitButtonLeading icon={withIcon ? <StarsFilled /> : undefined}>
                {label || undefined}
              </SplitButtonLeading>
              {/* As a menu trigger the trailing button follows the menu (open, Escape, item chosen). */}
              <Menu trigger={<SplitButtonTrailing aria-label="More options" />}>
                <MenuItem>Duplicate</MenuItem>
                <MenuItem>Rename</MenuItem>
                <MenuItem>Archive</MenuItem>
              </Menu>
            </SplitButton>
          ))}
        </section>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: '8px 0 0' }}>
          FABs — hover lifts to level 4
        </h2>
        <section {...stylex.props(s.panel)}>
          <Field label="Extended FABs expanded">
            <input type="checkbox" checked={fabExpanded} onChange={(e) => setFabExpanded(e.target.checked)} />
          </Field>
        </section>
        <section {...stylex.props(s.grid)} style={{ gridTemplateColumns: 'max-content repeat(6, max-content)' }}>
          {FAB_COLORS.map((c) => (
            <Row key={c} label={c}>
              <Fab aria-label={`${c} fab`} color={c}>
                <StarsFilled />
              </Fab>
              <Fab aria-label={`${c} medium fab`} color={c} size="medium">
                <StarsFilled />
              </Fab>
              <Fab aria-label={`${c} large fab`} color={c} size="large">
                <StarsFilled />
              </Fab>
              <ExtendedFab color={c} icon={<StarsFilled />} expanded={fabExpanded}>
                {label || 'Label'}
              </ExtendedFab>
              <ExtendedFab color={c} size="medium" icon={<StarsFilled />} expanded={fabExpanded}>
                {label || 'Label'}
              </ExtendedFab>
              <ExtendedFab color={c} size="large" icon={<StarsFilled />} expanded={fabExpanded}>
                {label || 'Label'}
              </ExtendedFab>
            </Row>
          ))}
        </section>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: '8px 0 0' }}>
          FAB menu — click to open, arrows to move, Esc to close
        </h2>
        <section
          {...stylex.props(s.grid)}
          style={{ gridTemplateColumns: 'repeat(3, max-content)', alignItems: 'end', minHeight: 300 }}
        >
          {(['primary', 'secondary', 'tertiary'] as const).map((c) => (
            <FabMenu key={c} color={c} aria-label={`${c} actions`} icon={<StarsFilled />}>
              <FabMenuItem icon={<StarsFilled />}>First</FabMenuItem>
              <FabMenuItem icon={<StarsFilled />}>Second</FabMenuItem>
              <FabMenuItem icon={<StarsFilled />}>Third</FabMenuItem>
            </FabMenu>
          ))}
        </section>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: '8px 0 0' }}>
          Button groups ({size}, {shape}) — press and hold a button in the standard groups to widen it
        </h2>
        <section {...stylex.props(s.stage)} style={{ minHeight: 0, padding: 24 }}>
          <ConnectedButtonGroup size={size} shape={shape} defaultValue={['day']} aria-label="Range" disabled={disabled}>
            {['day', 'week', 'month'].map((v) => (
              <ConnectedButtonGroupItem key={v} value={v} icon={<Stars />} selectedIcon={<Stars selected />}>
                {v[0]!.toUpperCase() + v.slice(1)}
              </ConnectedButtonGroupItem>
            ))}
          </ConnectedButtonGroup>
          <ButtonGroup size={size}>
            {['Archive', 'Move', 'Delete'].map((l) => (
              <Button key={l} variant="tonal" size={size} shape={shape} disabled={disabled}>
                {l}
              </Button>
            ))}
          </ButtonGroup>
          <ButtonGroup size={size}>
            {(['filled', 'tonal', 'outlined'] as const).map((v) => (
              <ToggleIconButton
                key={v}
                aria-label={v}
                variant={v}
                size={size}
                width="wide"
                shape={shape}
                selectedIcon={<Stars selected />}
                disabled={disabled}
              >
                <Stars />
              </ToggleIconButton>
            ))}
          </ButtonGroup>
        </section>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: '8px 0 0' }}>
          Segmented button (baseline)
        </h2>
        <section {...stylex.props(s.stage)} style={{ minHeight: 0, padding: 24 }}>
          <SegmentedButton defaultValue={['week']} aria-label="Range" disabled={disabled}>
            {['day', 'week', 'month', 'year'].map((v) => (
              <SegmentedButtonItem key={v} value={v} icon={withIcon ? <Stars /> : undefined}>
                {v[0]!.toUpperCase() + v.slice(1)}
              </SegmentedButtonItem>
            ))}
          </SegmentedButton>
        </section>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: '8px 0 0' }}>
          Every variant × size ({shape})
        </h2>
        <section {...stylex.props(s.grid)}>
          <span />
          {SIZES.map((sz) => (
            <span key={sz} {...stylex.props(typescale.labelMedium, s.muted)}>
              {sz}
            </span>
          ))}
          {VARIANTS.map((v) => (
            <Row key={v} label={v}>
              {SIZES.map((sz) => (
                <Button
                  key={sz}
                  variant={v}
                  size={sz}
                  shape={shape}
                  icon={withIcon ? <StarsFilled /> : undefined}
                  disabled={disabled}
                >
                  {label || undefined}
                </Button>
              ))}
            </Row>
          ))}
        </section>
      </main>
    </M3Provider>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span {...stylex.props(typescale.labelLarge)}>{label}</span>
      {children}
    </>
  );
}
