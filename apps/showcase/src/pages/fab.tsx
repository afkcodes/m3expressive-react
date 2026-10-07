import { useState, type ReactNode, type UIEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import { ExtendedFab, Fab, Switch, typescale, type FabColor, type FabSize } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const COLORS: FabColor[] = [
  'primaryContainer',
  'secondaryContainer',
  'tertiaryContainer',
  'primary',
  'secondary',
  'tertiary',
];
const SIZES: FabSize[] = ['small', 'medium', 'large'];
/** FAB icon sizes: 24 / 28 / 36px. */
const ICON_PX: Record<FabSize, number> = { small: 24, medium: 28, large: 36 };
const SIZE_PX: Record<FabSize, number> = { small: 56, medium: 80, large: 96 };

const cap = (v: string) => v[0]!.toUpperCase() + v.slice(1);

const s = stylex.create({
  item: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  caption: { color: color.onSurfaceVariant },
  bottomRow: { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', justifyContent: 'center' },
  toggle: { display: 'flex', alignItems: 'center', gap: 12, color: color.onSurface, width: '100%' },
  fabs: { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', minHeight: 96 },
  scroller: {
    position: 'relative',
    width: '100%',
    height: 280,
    borderRadius: shape.cornerLarge,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  scrollArea: { height: '100%', overflowY: 'auto', paddingInline: 16, paddingBlock: 8 },
  line: {
    margin: 0,
    paddingBlock: 12,
    color: color.onSurface,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: color.outlineVariant,
  },
  floating: { position: 'absolute', insetInlineEnd: 16, bottom: 16 },
});

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div {...stylex.props(s.item)}>
      {children}
      <span {...stylex.props(typescale.labelMedium, s.caption)}>{label}</span>
    </div>
  );
}

function CollapseToggle() {
  const [expanded, setExpanded] = useState(true);
  return (
    <>
      <label {...stylex.props(typescale.bodyLarge, s.toggle)}>
        <Switch checked={expanded} onCheckedChange={setExpanded} />
        Expanded
      </label>
      <div {...stylex.props(s.fabs)}>
        {SIZES.map((size) => (
          <ExtendedFab key={size} size={size} expanded={expanded} icon={<Icon name="edit" size={ICON_PX[size]} />}>
            Compose
          </ExtendedFab>
        ))}
      </div>
    </>
  );
}

const MESSAGES = Array.from({ length: 24 }, (_, i) => `Message ${i + 1}`);

function ScrollToCollapse() {
  const [expanded, setExpanded] = useState(true);
  const [last, setLast] = useState(0);
  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    // Collapse while scrolling down, expand when scrolling back up (or at the top).
    if (Math.abs(top - last) > 4) {
      setExpanded(top < last || top < 8);
      setLast(top);
    }
  };
  return (
    <div {...stylex.props(s.scroller)}>
      <div {...stylex.props(s.scrollArea)} onScroll={onScroll} role="region" aria-label="Inbox">
        {MESSAGES.map((m) => (
          <p key={m} {...stylex.props(typescale.bodyLarge, s.line)}>
            {m}
          </p>
        ))}
      </div>
      <ExtendedFab sx={s.floating} expanded={expanded} icon={<Icon name="edit" />}>
        Compose
      </ExtendedFab>
    </div>
  );
}

export default function FabPage() {
  return (
    <Page
      title="FAB"
      summary="The floating action button holds a screen's primary action. Three sizes, six colours, and an extended FAB with a label that collapses on a spring."
    >
      <Section title="FAB" description="Hover lifts to elevation 4; press springs a ripple.">
        <Demo
          title="Sizes"
          code={`
<Fab aria-label="Create"><Icon name="add" /></Fab>
<Fab aria-label="Create" size="medium"><Icon name="add" size={28} /></Fab>
<Fab aria-label="Create" size="large"><Icon name="add" size={36} /></Fab>`}
        >
          <div {...stylex.props(s.bottomRow)}>
            {SIZES.map((size) => (
              <Labelled key={size} label={`${cap(size)} · ${SIZE_PX[size]}px`}>
                <Fab aria-label={`Create (${size})`} size={size}>
                  <Icon name="add" size={ICON_PX[size]} />
                </Fab>
              </Labelled>
            ))}
          </div>
        </Demo>
        <Demo
          title="Flat"
          code={`
// Flat FABs sit in containers, such as a navigation rail.
<Fab aria-label="Create" elevated={false}><Icon name="add" /></Fab>`}
        >
          <Fab aria-label="Create (flat)" elevated={false}>
            <Icon name="add" />
          </Fab>
          <Fab aria-label="Create (flat, tonal)" color="secondaryContainer" elevated={false}>
            <Icon name="add" />
          </Fab>
        </Demo>
        <Demo
          wide
          title="Colours"
          code={`
<Fab aria-label="Edit" color="primaryContainer"><Icon name="edit" /></Fab>
<Fab aria-label="Edit" color="secondaryContainer"><Icon name="edit" /></Fab>
<Fab aria-label="Edit" color="tertiaryContainer"><Icon name="edit" /></Fab>
<Fab aria-label="Edit" color="primary"><Icon name="edit" /></Fab>
<Fab aria-label="Edit" color="secondary"><Icon name="edit" /></Fab>
<Fab aria-label="Edit" color="tertiary"><Icon name="edit" /></Fab>`}
        >
          {COLORS.map((c) => (
            <Labelled key={c} label={c}>
              <Fab aria-label={`Edit (${c})`} color={c}>
                <Icon name="edit" />
              </Fab>
            </Labelled>
          ))}
        </Demo>
      </Section>

      <Section
        title="Extended FAB"
        description="An icon and a label; collapsing shrinks it to the icon and fades the label."
      >
        <Demo
          wide
          title="Sizes"
          code={`
<ExtendedFab icon={<Icon name="edit" />}>Compose</ExtendedFab>
<ExtendedFab size="medium" icon={<Icon name="edit" size={28} />}>Compose</ExtendedFab>
<ExtendedFab size="large" icon={<Icon name="edit" size={36} />}>Compose</ExtendedFab>`}
        >
          {SIZES.map((size) => (
            <ExtendedFab key={size} size={size} icon={<Icon name="edit" size={ICON_PX[size]} />}>
              Compose
            </ExtendedFab>
          ))}
          <ExtendedFab color="tertiaryContainer">Label only</ExtendedFab>
        </Demo>
        <Demo
          wide
          title="Colours"
          code={`<ExtendedFab color="secondary" icon={<Icon name="navigation" />}>Navigate</ExtendedFab>`}
        >
          {COLORS.map((c) => (
            <ExtendedFab key={c} color={c} icon={<Icon name="navigation" />}>
              {c}
            </ExtendedFab>
          ))}
        </Demo>
        <Demo
          column
          title="Expand and collapse"
          code={`
const [expanded, setExpanded] = useState(true);

<Switch checked={expanded} onCheckedChange={setExpanded} />
<ExtendedFab expanded={expanded} icon={<Icon name="edit" />}>
  Compose
</ExtendedFab>`}
        >
          <CollapseToggle />
        </Demo>
        <Demo
          column
          title="Collapse on scroll"
          code={`
const [expanded, setExpanded] = useState(true);
const [last, setLast] = useState(0);

<div onScroll={(e) => {
  const top = e.currentTarget.scrollTop;
  setExpanded(top < last || top < 8);
  setLast(top);
}}>…</div>
<ExtendedFab expanded={expanded} icon={<Icon name="edit" />}>Compose</ExtendedFab>`}
        >
          <ScrollToCollapse />
        </Demo>
      </Section>
    </Page>
  );
}
