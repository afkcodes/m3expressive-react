import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button, FilterChip, SegmentedButton, SegmentedButtonItem, TextField, typescale } from '@m3x/react';
import { seedColorsFromImage, type SchemeVariant } from '@m3x/react/dynamic-color';
import { color } from '@m3x/react/tokens/color.stylex';
import { useTheme } from './theme.tsx';
import { Icon } from './ui/Icon.tsx';

const PRESETS = [
  { name: 'Purple', hex: '#6750A4' },
  { name: 'Teal', hex: '#006A6A' },
  { name: 'Blue', hex: '#0061A4' },
  { name: 'Green', hex: '#386A20' },
  { name: 'Red', hex: '#B3261E' },
  { name: 'Rose', hex: '#7D5260' },
];
const VARIANTS: SchemeVariant[] = [
  'tonal-spot',
  'vibrant',
  'expressive',
  'fidelity',
  'content',
  'neutral',
  'monochrome',
  'rainbow',
  'fruit-salad',
];

const s = stylex.create({
  panel: { display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 24 },
  group: { display: 'flex', flexDirection: 'column', gap: 12 },
  label: { margin: 0, color: color.onSurfaceVariant },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  dot: (hex: string) => ({
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: hex,
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: color.outlineVariant,
  }),
  hidden: { display: 'none' },
  preview: { maxWidth: '100%', maxHeight: 120, borderRadius: 12, objectFit: 'cover' },
});

const HEX = /^#[0-9a-f]{6}$/i;

/** Theme controls: colour scheme, contrast, dynamic colour (seed or image) and motion scheme. */
export function ThemePanel() {
  const { settings, update } = useTheme();
  const [hex, setHex] = useState(settings.seed ?? '');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<{ status: 'idle' | 'loading' | 'ready' | 'error'; colors: string[] }>({
    status: 'idle',
    colors: [],
  });
  // The preview's object URL, released when replaced and on unmount.
  const urlRef = useRef<string | null>(null);
  useEffect(() => () => void (urlRef.current && URL.revokeObjectURL(urlRef.current)), []);

  // Like Android's wallpaper colours: extract seed candidates and adopt the best one.
  const pickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(file);
    setImageUrl(urlRef.current);
    setExtracted({ status: 'loading', colors: [] });
    try {
      const colors = await seedColorsFromImage(file);
      setExtracted({ status: 'ready', colors: [...colors] });
      if (colors[0]) {
        update({ seed: colors[0] });
        setHex(colors[0]);
      }
    } catch {
      setExtracted({ status: 'error', colors: [] });
    }
  };

  return (
    <div {...stylex.props(s.panel)}>
      <div {...stylex.props(s.group)}>
        <p {...stylex.props(typescale.labelLarge, s.label)}>Mode</p>
        <SegmentedButton
          aria-label="Colour scheme"
          value={[settings.mode]}
          onValueChange={(v) => v[0] && update({ mode: v[0] as typeof settings.mode })}
        >
          <SegmentedButtonItem value="system">Auto</SegmentedButtonItem>
          <SegmentedButtonItem value="light">Light</SegmentedButtonItem>
          <SegmentedButtonItem value="dark">Dark</SegmentedButtonItem>
        </SegmentedButton>
      </div>

      <div {...stylex.props(s.group)}>
        <p {...stylex.props(typescale.labelLarge, s.label)}>Contrast</p>
        <SegmentedButton
          aria-label="Contrast"
          value={[settings.contrast]}
          onValueChange={(v) => v[0] && update({ contrast: v[0] as typeof settings.contrast })}
        >
          <SegmentedButtonItem value="standard">Standard</SegmentedButtonItem>
          <SegmentedButtonItem value="medium">Medium</SegmentedButtonItem>
          <SegmentedButtonItem value="high">High</SegmentedButtonItem>
        </SegmentedButton>
      </div>

      <div {...stylex.props(s.group)}>
        <p {...stylex.props(typescale.labelLarge, s.label)}>Colour</p>
        <div {...stylex.props(s.chips)}>
          <FilterChip selected={settings.seed === null} onSelectedChange={() => update({ seed: null })}>
            Baseline
          </FilterChip>
          {PRESETS.map((p) => (
            <FilterChip
              key={p.hex}
              selected={settings.seed?.toUpperCase() === p.hex}
              icon={<span {...stylex.props(s.dot(p.hex))} />}
              onSelectedChange={() => {
                update({ seed: p.hex });
                setHex(p.hex);
              }}
            >
              {p.name}
            </FilterChip>
          ))}
        </div>
        <TextField
          variant="outlined"
          label="Seed colour (hex)"
          value={hex}
          onValueChange={(v) => {
            setHex(v);
            if (HEX.test(v)) update({ seed: v });
          }}
          supportingText="Any colour, e.g. #FF5722"
        />
      </div>

      <div {...stylex.props(s.group)}>
        <p {...stylex.props(typescale.labelLarge, s.label)}>Colour from an image</p>
        <input
          id="seed-image"
          type="file"
          accept="image/*"
          onChange={(e) => void pickFile(e)}
          {...stylex.props(s.hidden)}
        />
        <Button
          variant="tonal"
          icon={<Icon name="image" size={20} />}
          onClick={() => document.getElementById('seed-image')?.click()}
        >
          Choose an image
        </Button>
        {imageUrl && <img src={imageUrl} alt="" {...stylex.props(s.preview)} />}
        {extracted.status === 'loading' && <p {...stylex.props(typescale.bodyMedium, s.label)}>Extracting…</p>}
        {extracted.status === 'error' && (
          <p {...stylex.props(typescale.bodyMedium, s.label)}>Couldn't read that image.</p>
        )}
        {extracted.colors.length > 0 && (
          <div {...stylex.props(s.chips)}>
            {extracted.colors.map((c) => (
              <FilterChip
                key={c}
                selected={settings.seed === c}
                icon={<span {...stylex.props(s.dot(c))} />}
                onSelectedChange={() => {
                  update({ seed: c });
                  setHex(c);
                }}
              >
                {c}
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      <div {...stylex.props(s.group)}>
        <p {...stylex.props(typescale.labelLarge, s.label)}>Scheme variant</p>
        <div {...stylex.props(s.chips)}>
          {VARIANTS.map((v) => (
            <FilterChip
              key={v}
              disabled={settings.seed === null}
              selected={settings.variant === v}
              onSelectedChange={() => update({ variant: v })}
            >
              {v}
            </FilterChip>
          ))}
        </div>
      </div>

      <div {...stylex.props(s.group)}>
        <p {...stylex.props(typescale.labelLarge, s.label)}>Motion</p>
        <SegmentedButton
          aria-label="Motion scheme"
          value={[settings.motion]}
          onValueChange={(v) => v[0] && update({ motion: v[0] as typeof settings.motion })}
        >
          <SegmentedButtonItem value="expressive">Expressive</SegmentedButtonItem>
          <SegmentedButtonItem value="standard">Standard</SegmentedButtonItem>
        </SegmentedButton>
      </div>
    </div>
  );
}
