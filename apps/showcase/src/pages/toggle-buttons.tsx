import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  ToggleButton,
  ToggleIconButton,
  typescale,
  type ButtonSize,
  type IconButtonVariant,
  type ToggleButtonVariant,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const VARIANTS: ToggleButtonVariant[] = ['filled', 'tonal', 'outlined', 'elevated'];
const ICON_VARIANTS: IconButtonVariant[] = ['standard', 'filled', 'tonal', 'outlined'];
const SIZES: ButtonSize[] = ['xsmall', 'small', 'medium', 'large', 'xlarge'];
const WIDTHS = ['narrow', 'default', 'wide'] as const;
/** Button icon sizes: 20 / 20 / 24 / 32 / 40px; icon button icons: 20 / 24 / 24 / 32 / 40px. */
const BUTTON_ICON: Record<ButtonSize, number> = { xsmall: 20, small: 20, medium: 24, large: 32, xlarge: 40 };
const ICON_BUTTON_ICON: Record<ButtonSize, number> = { xsmall: 20, small: 24, medium: 24, large: 32, xlarge: 40 };

const cap = (v: string) => v[0]!.toUpperCase() + v.slice(1);
const sizeName = (v: ButtonSize) => (v === 'xsmall' ? 'Extra small' : v === 'xlarge' ? 'Extra large' : cap(v));

const s = stylex.create({
  row: { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'center' },
  column: { display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', paddingTop: 8 },
  caption: { color: color.onSurfaceVariant },
  status: { color: color.onSurfaceVariant, minWidth: 140 },
});

function Bookmark({ size }: { size: number }) {
  return <Icon name="bookmark" size={size} />;
}
function BookmarkFilled({ size }: { size: number }) {
  return <Icon name="bookmark" size={size} filled />;
}

function FollowButton() {
  const [following, setFollowing] = useState(false);
  return (
    <>
      <ToggleButton
        variant="tonal"
        pressed={following}
        onPressedChange={setFollowing}
        icon={<Icon name={following ? 'check' : 'person_add'} size={20} />}
      >
        {following ? 'Following' : 'Follow'}
      </ToggleButton>
      <span {...stylex.props(typescale.bodyMedium, s.status)}>pressed = {String(following)}</span>
    </>
  );
}

function MuteButton() {
  const [muted, setMuted] = useState(false);
  return (
    <>
      <ToggleIconButton
        aria-label="Mute"
        variant="filled"
        size="medium"
        pressed={muted}
        onPressedChange={setMuted}
        selectedIcon={<Icon name="volume_off" filled />}
      >
        <Icon name="volume_up" />
      </ToggleIconButton>
      <span {...stylex.props(typescale.bodyMedium, s.status)}>{muted ? 'Muted' : 'Sound on'}</span>
    </>
  );
}

export default function ToggleButtonsPage() {
  return (
    <Page
      title="Toggle buttons"
      summary="Toggle buttons stay selected. Selecting one swaps its colours, springs its corners to the other shape (round ⇄ square) and can switch to a filled icon."
    >
      <Section title="Variants" description="Click to select. Each variant has its own selected colours.">
        <Demo
          wide
          code={`
<ToggleButton
  variant="filled"
  icon={<Icon name="bookmark" size={20} />}
  selectedIcon={<Icon name="bookmark" size={20} filled />}
>
  Save
</ToggleButton>`}
        >
          {VARIANTS.map((v) => (
            <div key={v} {...stylex.props(s.column)}>
              <ToggleButton variant={v} icon={<Bookmark size={20} />} selectedIcon={<BookmarkFilled size={20} />}>
                {cap(v)}
              </ToggleButton>
              <ToggleButton
                variant={v}
                defaultPressed
                icon={<Bookmark size={20} />}
                selectedIcon={<BookmarkFilled size={20} />}
              >
                {cap(v)}
              </ToggleButton>
            </div>
          ))}
        </Demo>
        <Demo
          title="Controlled"
          code={`
const [following, setFollowing] = useState(false);

<ToggleButton variant="tonal" pressed={following} onPressedChange={setFollowing}>
  {following ? 'Following' : 'Follow'}
</ToggleButton>`}
        >
          <FollowButton />
        </Demo>
        <Demo title="Disabled" code={`<ToggleButton disabled defaultPressed>Save</ToggleButton>`}>
          <ToggleButton disabled>Off</ToggleButton>
          <ToggleButton disabled defaultPressed>
            On
          </ToggleButton>
          <ToggleButton variant="outlined" disabled>
            Outlined
          </ToggleButton>
        </Demo>
      </Section>

      <Section title="Sizes" description="Extra small to extra large.">
        <Demo
          wide
          code={`
<ToggleButton size="xsmall">Extra small</ToggleButton>
<ToggleButton size="small">Small</ToggleButton>
<ToggleButton size="medium">Medium</ToggleButton>
<ToggleButton size="large">Large</ToggleButton>
<ToggleButton size="xlarge">Extra large</ToggleButton>`}
        >
          {SIZES.map((size) => (
            <ToggleButton
              key={size}
              size={size}
              icon={<Bookmark size={BUTTON_ICON[size]} />}
              selectedIcon={<BookmarkFilled size={BUTTON_ICON[size]} />}
            >
              {sizeName(size)}
            </ToggleButton>
          ))}
        </Demo>
      </Section>

      <Section
        title="Shape"
        description="The unselected shape; selecting morphs to the other one on the fast spatial spring."
      >
        <Demo
          title="Toggle button"
          code={`
<ToggleButton shape="round">Round</ToggleButton>
<ToggleButton shape="square">Square</ToggleButton>`}
        >
          <ToggleButton shape="round" size="medium">
            Round
          </ToggleButton>
          <ToggleButton shape="square" size="medium">
            Square
          </ToggleButton>
        </Demo>
        <Demo
          title="Toggle icon button"
          code={`
<ToggleIconButton aria-label="Pin" variant="tonal" shape="round">…</ToggleIconButton>
<ToggleIconButton aria-label="Pin" variant="tonal" shape="square">…</ToggleIconButton>`}
        >
          {(['round', 'square'] as const).map((shape) => (
            <ToggleIconButton
              key={shape}
              aria-label={`Pin (${shape})`}
              variant="tonal"
              size="large"
              shape={shape}
              selectedIcon={<Icon name="push_pin" size={32} filled />}
            >
              <Icon name="push_pin" size={32} />
            </ToggleIconButton>
          ))}
        </Demo>
      </Section>

      <Section title="Toggle icon buttons" description="The icon-only toggle: four variants, five sizes, three widths.">
        <Demo
          title="Variants"
          code={`
<ToggleIconButton
  aria-label="Bookmark"
  variant="outlined"
  selectedIcon={<Icon name="bookmark" filled />}
>
  <Icon name="bookmark" />
</ToggleIconButton>`}
        >
          {ICON_VARIANTS.map((v) => (
            <div key={v} {...stylex.props(s.column)}>
              <ToggleIconButton aria-label={`Bookmark (${v})`} variant={v} selectedIcon={<BookmarkFilled size={24} />}>
                <Bookmark size={24} />
              </ToggleIconButton>
              <ToggleIconButton
                aria-label={`Bookmark (${v}, selected)`}
                variant={v}
                defaultPressed
                selectedIcon={<BookmarkFilled size={24} />}
              >
                <Bookmark size={24} />
              </ToggleIconButton>
              <span {...stylex.props(typescale.labelMedium, s.caption)}>{cap(v)}</span>
            </div>
          ))}
        </Demo>
        <Demo
          title="Controlled"
          code={`
const [muted, setMuted] = useState(false);

<ToggleIconButton
  aria-label="Mute"
  variant="filled"
  size="medium"
  pressed={muted}
  onPressedChange={setMuted}
  selectedIcon={<Icon name="volume_off" filled />}
>
  <Icon name="volume_up" />
</ToggleIconButton>`}
        >
          <MuteButton />
        </Demo>
        <Demo
          wide
          column
          title="Sizes and widths"
          code={`
<ToggleIconButton aria-label="Star" size="large" width="wide">
  <Icon name="star" size={32} />
</ToggleIconButton>`}
        >
          {SIZES.map((size) => (
            <div key={size} {...stylex.props(s.row)}>
              {WIDTHS.map((w) => (
                <ToggleIconButton
                  key={w}
                  aria-label={`Star (${size}, ${w})`}
                  variant="tonal"
                  size={size}
                  width={w}
                  selectedIcon={<Icon name="star" size={ICON_BUTTON_ICON[size]} filled />}
                >
                  <Icon name="star" size={ICON_BUTTON_ICON[size]} />
                </ToggleIconButton>
              ))}
            </div>
          ))}
        </Demo>
        <Demo
          title="Disabled"
          code={`<ToggleIconButton aria-label="Star" variant="filled" disabled>…</ToggleIconButton>`}
        >
          {ICON_VARIANTS.map((v) => (
            <ToggleIconButton key={v} aria-label={`Star (${v}, disabled)`} variant={v} disabled>
              <Icon name="star" />
            </ToggleIconButton>
          ))}
          <ToggleIconButton aria-label="Star (selected, disabled)" variant="filled" disabled defaultPressed>
            <Icon name="star" filled />
          </ToggleIconButton>
        </Demo>
      </Section>
    </Page>
  );
}
