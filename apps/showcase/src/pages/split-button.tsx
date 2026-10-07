import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Menu,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  SplitButton,
  SplitButtonLeading,
  SplitButtonTrailing,
  typescale,
  type ButtonSize,
  type SplitButtonVariant,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const VARIANTS: SplitButtonVariant[] = ['filled', 'tonal', 'outlined', 'elevated'];
const SIZES: ButtonSize[] = ['xsmall', 'small', 'medium', 'large', 'xlarge'];
/** Leading icon sizes: 20 / 20 / 24 / 32 / 40px. */
const ICON_PX: Record<ButtonSize, number> = { xsmall: 20, small: 20, medium: 24, large: 32, xlarge: 40 };

const cap = (v: string) => v[0]!.toUpperCase() + v.slice(1);
const sizeName = (v: ButtonSize) => (v === 'xsmall' ? 'Extra small' : v === 'xlarge' ? 'Extra large' : cap(v));

const s = stylex.create({
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  // Wide sizes scroll sideways on narrow screens; 'safe center' keeps their start reachable.
  // Keep the natural width in the scrolling stack (a fit-content flex item would squeeze the group).
  natural: { width: 'max-content' },
  sizes: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'safe center',
    gap: 16,
    width: '100%',
    overflowX: 'auto',
    paddingTop: 24,
    paddingBottom: 8,
    paddingInline: 8,
  },
  status: { margin: 0, color: color.onSurfaceVariant, textAlign: 'center' },
});

const FORMATS = ['PDF', 'Word', 'Markdown'];

function ExportButton() {
  const [format, setFormat] = useState('PDF');
  const [exported, setExported] = useState<string | null>(null);
  return (
    <div {...stylex.props(s.center)}>
      <SplitButton variant="filled" aria-label="Export">
        <SplitButtonLeading icon={<Icon name="download" size={20} />} onClick={() => setExported(format)}>
          Export {format}
        </SplitButtonLeading>
        <Menu trigger={<SplitButtonTrailing aria-label="Export format" />} align="end">
          <MenuRadioGroup value={format} onValueChange={(v) => setFormat(String(v))}>
            {FORMATS.map((f) => (
              <MenuRadioItem key={f} value={f} closeOnClick>
                {f}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </Menu>
      </SplitButton>
      <p {...stylex.props(typescale.bodyMedium, s.status)}>
        {exported ? `Exported as ${exported}` : 'Pick a format from the menu, then export.'}
      </p>
    </div>
  );
}

function StandaloneTrailing() {
  const [open, setOpen] = useState(false);
  return (
    <div {...stylex.props(s.center)}>
      <SplitButton variant="tonal" aria-label="Filters">
        <SplitButtonLeading icon={<Icon name="filter_list" size={20} />}>Filters</SplitButtonLeading>
        <SplitButtonTrailing aria-label="Show filters" open={open} onOpenChange={setOpen} />
      </SplitButton>
      <p {...stylex.props(typescale.bodyMedium, s.status)}>open = {String(open)}</p>
    </div>
  );
}

export default function SplitButtonPage() {
  return (
    <Page
      title="Split button"
      summary="A primary action with a menu of related ones. The two halves press and hover independently; the trailing chevron turns as its menu opens."
    >
      <Section title="Variants" description="Filled, tonal, outlined and elevated. The trailing half opens a menu.">
        <Demo
          wide
          code={`
<SplitButton variant="filled" aria-label="Save">
  <SplitButtonLeading icon={<Icon name="save" size={20} />}>Save</SplitButtonLeading>
  <Menu trigger={<SplitButtonTrailing aria-label="More save options" />} align="end">
    <MenuItem>Save as…</MenuItem>
    <MenuItem>Save a copy</MenuItem>
    <MenuItem>Save as template</MenuItem>
  </Menu>
</SplitButton>`}
        >
          {VARIANTS.map((v) => (
            <SplitButton key={v} variant={v} aria-label={`Save (${v})`}>
              <SplitButtonLeading icon={<Icon name="save" size={20} />}>{cap(v)}</SplitButtonLeading>
              <Menu trigger={<SplitButtonTrailing aria-label="More save options" />} align="end">
                <MenuItem>Save as…</MenuItem>
                <MenuItem>Save a copy</MenuItem>
                <MenuItem>Save as template</MenuItem>
              </Menu>
            </SplitButton>
          ))}
        </Demo>
        <Demo
          title="Icon only"
          code={`
<SplitButton variant="tonal" aria-label="Edit">
  <SplitButtonLeading aria-label="Edit" icon={<Icon name="edit" size={20} />} />
  <SplitButtonTrailing aria-label="More edit options" />
</SplitButton>`}
        >
          {VARIANTS.map((v) => (
            <SplitButton key={v} variant={v} aria-label={`Edit (${v})`}>
              <SplitButtonLeading aria-label="Edit" icon={<Icon name="edit" size={20} />} />
              <Menu trigger={<SplitButtonTrailing aria-label="More edit options" />} align="end">
                <MenuItem>Rename</MenuItem>
                <MenuItem>Duplicate</MenuItem>
              </Menu>
            </SplitButton>
          ))}
        </Demo>
        <Demo title="Disabled" code={`<SplitButton disabled aria-label="Save">…</SplitButton>`}>
          {VARIANTS.map((v) => (
            <SplitButton key={v} variant={v} disabled aria-label={`Save (${v}, disabled)`}>
              <SplitButtonLeading>{cap(v)}</SplitButtonLeading>
              <SplitButtonTrailing aria-label="More save options" />
            </SplitButton>
          ))}
        </Demo>
      </Section>

      <Section
        title="Sizes"
        description="Extra small to extra large; the inner corners tighten as each half is pressed."
      >
        <Demo
          wide
          code={`
<SplitButton size="medium" aria-label="Send">
  <SplitButtonLeading icon={<Icon name="send" size={24} />}>Send</SplitButtonLeading>
  <SplitButtonTrailing aria-label="Send options" />
</SplitButton>`}
        >
          <div {...stylex.props(s.sizes)}>
            {SIZES.map((size) => (
              <SplitButton key={size} size={size} aria-label={`Send (${size})`} sx={s.natural}>
                <SplitButtonLeading icon={<Icon name="send" size={ICON_PX[size]} />}>
                  {sizeName(size)}
                </SplitButtonLeading>
                <Menu trigger={<SplitButtonTrailing aria-label="Send options" />} align="end">
                  <MenuItem>Schedule send</MenuItem>
                  <MenuItem>Send without sound</MenuItem>
                </Menu>
              </SplitButton>
            ))}
          </div>
        </Demo>
      </Section>

      <Section
        title="Behaviour"
        description="As a menu trigger, the trailing half follows the menu's state. On its own it toggles open / onOpenChange."
      >
        <Demo
          title="With a menu"
          code={`
const [format, setFormat] = useState('PDF');

<SplitButton aria-label="Export">
  <SplitButtonLeading onClick={() => exportAs(format)}>Export {format}</SplitButtonLeading>
  <Menu trigger={<SplitButtonTrailing aria-label="Export format" />} align="end">
    <MenuRadioGroup value={format} onValueChange={(v) => setFormat(String(v))}>
      <MenuRadioItem value="PDF" closeOnClick>PDF</MenuRadioItem>
      <MenuRadioItem value="Word" closeOnClick>Word</MenuRadioItem>
      <MenuRadioItem value="Markdown" closeOnClick>Markdown</MenuRadioItem>
    </MenuRadioGroup>
  </Menu>
</SplitButton>`}
        >
          <ExportButton />
        </Demo>
        <Demo
          title="Standalone toggle"
          code={`
const [open, setOpen] = useState(false);

<SplitButton variant="tonal" aria-label="Filters">
  <SplitButtonLeading>Filters</SplitButtonLeading>
  <SplitButtonTrailing aria-label="Show filters" open={open} onOpenChange={setOpen} />
</SplitButton>`}
        >
          <StandaloneTrailing />
        </Demo>
      </Section>
    </Page>
  );
}
