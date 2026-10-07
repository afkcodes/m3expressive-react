import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { IconButton, ToggleIconButton, typescale, type ButtonSize, type IconButtonVariant } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const VARIANTS: IconButtonVariant[] = ['standard', 'filled', 'tonal', 'outlined'];
const SIZES: ButtonSize[] = ['xsmall', 'small', 'medium', 'large', 'xlarge'];
const WIDTHS = ['narrow', 'default', 'wide'] as const;
/** Icon size per button size (the button sizes its icon slot: 20 / 24 / 24 / 32 / 40px). */
const ICON_PX: Record<ButtonSize, number> = { xsmall: 20, small: 24, medium: 24, large: 32, xlarge: 40 };

const cap = (v: string) => v[0]!.toUpperCase() + v.slice(1);
const sizeName = (v: ButtonSize) => (v === 'xsmall' ? 'Extra small' : v === 'xlarge' ? 'Extra large' : cap(v));

const s = stylex.create({
  table: {
    display: 'grid',
    gridTemplateColumns: 'max-content repeat(5, max-content)',
    columnGap: 24,
    rowGap: 16,
    alignItems: 'center',
    justifyItems: 'center',
    overflowX: 'auto',
    maxWidth: '100%',
    paddingTop: 24,
    paddingBottom: 4,
  },
  head: { color: color.onSurfaceVariant, justifySelf: 'center' },
  rowHead: { color: color.onSurfaceVariant, justifySelf: 'start' },
  item: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  caption: { color: color.onSurfaceVariant },
  counter: { color: color.onSurfaceVariant, minWidth: 96 },
});

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div {...stylex.props(s.item)}>
      {children}
      <span {...stylex.props(typescale.labelMedium, s.caption)}>{label}</span>
    </div>
  );
}

function LikeCounter() {
  const [liked, setLiked] = useState(false);
  return (
    <>
      <ToggleIconButton
        aria-label="Like"
        variant="tonal"
        size="medium"
        pressed={liked}
        onPressedChange={setLiked}
        selectedIcon={<Icon name="thumb_up" filled />}
      >
        <Icon name="thumb_up" />
      </ToggleIconButton>
      <span {...stylex.props(typescale.bodyMedium, s.counter)}>{liked ? '129 likes' : '128 likes'}</span>
    </>
  );
}

export default function IconButtonsPage() {
  return (
    <Page
      title="Icon buttons"
      summary="Icon buttons take minor actions with a single icon. Four colour styles, five sizes, three widths, round or square — and toggles that stay selected."
    >
      <Section title="Variants" description="Standard has no container; filled, tonal and outlined add emphasis.">
        <Demo
          title="Default"
          code={`
<IconButton aria-label="Settings"><Icon name="settings" /></IconButton>
<IconButton aria-label="Settings" variant="filled"><Icon name="settings" /></IconButton>
<IconButton aria-label="Settings" variant="tonal"><Icon name="settings" /></IconButton>
<IconButton aria-label="Settings" variant="outlined"><Icon name="settings" /></IconButton>`}
        >
          {VARIANTS.map((v) => (
            <Labelled key={v} label={cap(v)}>
              <IconButton aria-label={`Settings (${v})`} variant={v}>
                <Icon name="settings" />
              </IconButton>
            </Labelled>
          ))}
        </Demo>
        <Demo title="Disabled" code={`<IconButton aria-label="Settings" variant="filled" disabled>…</IconButton>`}>
          {VARIANTS.map((v) => (
            <Labelled key={v} label={cap(v)}>
              <IconButton aria-label={`Settings (${v}, disabled)`} variant={v} disabled>
                <Icon name="settings" />
              </IconButton>
            </Labelled>
          ))}
        </Demo>
      </Section>

      <Section
        title="Sizes"
        description="Extra small to extra large; the icon grows with the button. Small sizes keep a 48px touch target."
      >
        <Demo
          wide
          code={`
<IconButton aria-label="Edit" size="xsmall"><Icon name="edit" size={20} /></IconButton>
<IconButton aria-label="Edit" size="small"><Icon name="edit" size={24} /></IconButton>
<IconButton aria-label="Edit" size="medium"><Icon name="edit" size={24} /></IconButton>
<IconButton aria-label="Edit" size="large"><Icon name="edit" size={32} /></IconButton>
<IconButton aria-label="Edit" size="xlarge"><Icon name="edit" size={40} /></IconButton>`}
        >
          <div {...stylex.props(s.table)}>
            <span />
            {SIZES.map((size) => (
              <span key={size} {...stylex.props(typescale.labelMedium, s.head)}>
                {sizeName(size)}
              </span>
            ))}
            {VARIANTS.map((v) => (
              <SizeRow key={v} variant={v} />
            ))}
          </div>
        </Demo>
      </Section>

      <Section
        title="Width and shape"
        description="Narrow, default or wide containers at each size's height; round or square corners."
      >
        <Demo
          title="Widths"
          code={`
<IconButton aria-label="Search" variant="tonal" size="medium" width="narrow">…</IconButton>
<IconButton aria-label="Search" variant="tonal" size="medium" width="default">…</IconButton>
<IconButton aria-label="Search" variant="tonal" size="medium" width="wide">…</IconButton>`}
        >
          {WIDTHS.map((w) => (
            <Labelled key={w} label={cap(w)}>
              <IconButton aria-label={`Search (${w})`} variant="tonal" size="medium" width={w}>
                <Icon name="search" />
              </IconButton>
            </Labelled>
          ))}
        </Demo>
        <Demo
          title="Shapes"
          code={`
<IconButton aria-label="Share" variant="filled" size="medium" shape="round">…</IconButton>
<IconButton aria-label="Share" variant="filled" size="medium" shape="square">…</IconButton>`}
        >
          {(['round', 'square'] as const).map((shape) => (
            <Labelled key={shape} label={cap(shape)}>
              <IconButton aria-label={`Share (${shape})`} variant="filled" size="medium" shape={shape}>
                <Icon name="share" />
              </IconButton>
            </Labelled>
          ))}
          {(['round', 'square'] as const).map((shape) => (
            <Labelled key={`o-${shape}`} label={`${cap(shape)} outlined`}>
              <IconButton aria-label={`Share (${shape}, outlined)`} variant="outlined" size="medium" shape={shape}>
                <Icon name="share" />
              </IconButton>
            </Labelled>
          ))}
        </Demo>
      </Section>

      <Section
        title="Toggle icon buttons"
        description="ToggleIconButton stays selected: its colours change, its corners morph to the other shape, and it can swap to a filled icon."
      >
        <Demo
          title="Variants (click to toggle)"
          code={`
<ToggleIconButton aria-label="Favourite" selectedIcon={<Icon name="favorite" filled />}>
  <Icon name="favorite" />
</ToggleIconButton>`}
        >
          {VARIANTS.map((v) => (
            <Labelled key={v} label={cap(v)}>
              <ToggleIconButton
                aria-label={`Favourite (${v})`}
                variant={v}
                defaultPressed={v === 'filled'}
                selectedIcon={<Icon name="favorite" filled />}
              >
                <Icon name="favorite" />
              </ToggleIconButton>
            </Labelled>
          ))}
        </Demo>
        <Demo
          title="Controlled"
          code={`
const [liked, setLiked] = useState(false);

<ToggleIconButton
  aria-label="Like"
  variant="tonal"
  size="medium"
  pressed={liked}
  onPressedChange={setLiked}
  selectedIcon={<Icon name="thumb_up" filled />}
>
  <Icon name="thumb_up" />
</ToggleIconButton>`}
        >
          <LikeCounter />
        </Demo>
      </Section>
    </Page>
  );
}

function SizeRow({ variant }: { variant: IconButtonVariant }) {
  return (
    <>
      <span {...stylex.props(typescale.labelLarge, s.rowHead)}>{cap(variant)}</span>
      {SIZES.map((size) => (
        <IconButton key={size} aria-label={`Edit (${variant}, ${size})`} variant={variant} size={size}>
          <Icon name="edit" size={ICON_PX[size]} />
        </IconButton>
      ))}
    </>
  );
}
