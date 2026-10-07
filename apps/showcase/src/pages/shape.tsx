import { useEffect, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  MorphingShape,
  SegmentedButton,
  SegmentedButtonItem,
  Shape,
  ToggleButton,
  typescale,
  type ShapeName,
} from '@m3x/react';
import { StateLayer, focusRing, stateLayerHost } from '@m3x/react/primitives';
import { figmaShapes } from '@m3x/react/shapes';
import { color } from '@m3x/react/tokens/color.stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const NAMES = Object.keys(figmaShapes) as ShapeName[];
/** The loading indicator's sequence (M3 Expressive). */
const LOADING_CYCLE: ShapeName[] = ['softBurst', 'cookie9Sided', 'pentagon', 'pill', 'sunny', 'cookie4Sided', 'oval'];

type Spring = 'fast-spatial' | 'default-spatial' | 'slow-spatial';

/** The corner scale (`tokens/shape.stylex`), with the token values for the labels. */
const CORNERS = [
  { name: 'cornerNone', value: '0', radius: shape.cornerNone },
  { name: 'cornerExtraSmall', value: '4', radius: shape.cornerExtraSmall },
  { name: 'cornerSmall', value: '8', radius: shape.cornerSmall },
  { name: 'cornerMedium', value: '12', radius: shape.cornerMedium },
  { name: 'cornerLarge', value: '16', radius: shape.cornerLarge },
  { name: 'cornerLargeIncreased', value: '20', radius: shape.cornerLargeIncreased },
  { name: 'cornerExtraLarge', value: '28', radius: shape.cornerExtraLarge },
  { name: 'cornerExtraLargeIncreased', value: '32', radius: shape.cornerExtraLargeIncreased },
  { name: 'cornerExtraExtraLarge', value: '48', radius: shape.cornerExtraExtraLarge },
  { name: 'cornerFull', value: 'full', radius: shape.cornerFull },
];

const label = (name: string) => name.replace(/([A-Z0-9]+)/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const s = stylex.create({
  corners: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 20,
    width: '100%',
    paddingTop: 24,
  },
  corner: { display: 'flex', flexDirection: 'column', gap: 8 },
  cornerBox: (radius: string) => ({
    height: 112,
    borderRadius: radius,
    backgroundColor: color.primaryContainer,
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: color.primary,
    outlineOffset: -1,
  }),
  caption: { display: 'flex', flexDirection: 'column' },
  name: { color: color.onSurface, overflowWrap: 'anywhere' },
  value: { color: color.onSurfaceVariant },
  morph: { display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center', width: '100%' },
  morphSide: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flexGrow: 1 },
  stageButton: {
    padding: 16,
    borderRadius: shape.cornerExtraLarge,
    color: color.primary,
  },
  controls: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'center' },
  picker: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, 48px)',
    gap: 4,
    flexGrow: 1,
    flexBasis: 280,
    justifyContent: 'center',
  },
  // A plain <button> on the library's interaction primitives.
  button: {
    appearance: 'none',
    borderWidth: 0,
    margin: 0,
    backgroundColor: 'transparent',
    backgroundImage: 'none',
    fontFamily: 'inherit',
    color: color.onSurface,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
  },
  pick: { width: 48, height: 48, padding: 6, borderRadius: shape.cornerMedium },
  picked: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
  current: { margin: 0, color: color.onSurfaceVariant },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
    gap: 8,
    width: '100%',
    paddingTop: 24,
  },
  cell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: 0,
    gap: 8,
    paddingBlock: 16,
    paddingInline: 8,
    borderRadius: shape.cornerLarge,
    backgroundColor: color.surfaceContainer,
  },
  cellName: { color: color.onSurfaceVariant, textAlign: 'center', overflowWrap: 'anywhere' },
});

function ShapeMorphing({ target, onTarget }: { target: ShapeName; onTarget: (shape: ShapeName) => void }) {
  const [spring, setSpring] = useState<Spring>('default-spatial');
  const [cycling, setCycling] = useState(false);

  useEffect(() => {
    if (!cycling) return undefined;
    let i = 0;
    const id = setInterval(() => onTarget(LOADING_CYCLE[i++ % LOADING_CYCLE.length]!), 700);
    return () => clearInterval(id);
  }, [cycling, onTarget]);

  const next = () => {
    setCycling(false);
    onTarget(NAMES[(NAMES.indexOf(target) + 1) % NAMES.length]!);
  };

  return (
    <div {...stylex.props(s.morph)}>
      <div {...stylex.props(s.morphSide)}>
        <button
          type="button"
          aria-label="Morph to the next shape"
          onClick={next}
          {...stylex.props(s.button, stateLayerHost.host, focusRing.host, s.stageButton)}
        >
          <StateLayer />
          <MorphingShape shape={target} size={200} spring={spring} />
        </button>
        <p {...stylex.props(typescale.labelLarge, s.current)} aria-live="polite">
          {label(target)}
        </p>
        <div {...stylex.props(s.controls)}>
          <SegmentedButton
            aria-label="Spring"
            density={-2}
            value={[spring]}
            onValueChange={(v) => {
              if (v[0]) setSpring(v[0] as Spring);
            }}
          >
            <SegmentedButtonItem value="fast-spatial">Fast</SegmentedButtonItem>
            <SegmentedButtonItem value="default-spatial">Default</SegmentedButtonItem>
            <SegmentedButtonItem value="slow-spatial">Slow</SegmentedButtonItem>
          </SegmentedButton>
          <ToggleButton
            variant="tonal"
            pressed={cycling}
            onPressedChange={setCycling}
            icon={<Icon name={cycling ? 'pause' : 'play_arrow'} size={20} />}
          >
            Loading cycle
          </ToggleButton>
        </div>
      </div>
      <div {...stylex.props(s.picker)} role="group" aria-label="Morph to">
        {NAMES.map((name) => (
          <button
            key={name}
            type="button"
            aria-label={label(name)}
            aria-pressed={name === target}
            onClick={() => {
              setCycling(false);
              onTarget(name);
            }}
            {...stylex.props(s.button, stateLayerHost.host, focusRing.host, s.pick, name === target && s.picked)}
          >
            <StateLayer />
            <Shape shape={name} size={36} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ShapePage() {
  const [target, setTarget] = useState<ShapeName>('circle');

  return (
    <Page
      title="Shape"
      summary="A corner scale for containers, and 35 expressive shapes for avatars, image crops and loading indicators. Shapes morph into each other on spatial springs."
    >
      <Section title="Corner scale" description="Corner radius tokens, from none to fully round.">
        <Demo
          wide
          start
          code={`
import * as stylex from '@stylexjs/stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';

const styles = stylex.create({
  card: { borderRadius: shape.cornerMedium },
  sheet: { borderRadius: shape.cornerExtraLarge },
});`}
        >
          <div {...stylex.props(s.corners)}>
            {CORNERS.map((c) => (
              <div key={c.name} {...stylex.props(s.corner)}>
                <div {...stylex.props(s.cornerBox(c.radius))} />
                <div {...stylex.props(s.caption)}>
                  <span {...stylex.props(typescale.labelLarge, s.name)}>{c.name}</span>
                  <span {...stylex.props(typescale.bodySmall, s.value)}>
                    {c.value === 'full' ? 'Full (half the shorter side)' : `${c.value}px`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Demo>
      </Section>

      <Section
        title="Shape morphing"
        description="Click the shape for the next one, or pick a target. Interrupting a morph continues from the current outline; at rest the exact Figma path is drawn."
      >
        <Demo
          wide
          title="MorphingShape"
          code={`
import { useState } from 'react';
import { MorphingShape, type ShapeName } from '@m3x/react';

const [shape, setShape] = useState<ShapeName>('circle');

<MorphingShape shape={shape} size={200} spring="default-spatial" />
<button onClick={() => setShape('cookie9Sided')}>Morph</button>`}
        >
          <ShapeMorphing target={target} onTarget={setTarget} />
        </Demo>
      </Section>

      <Section
        title="The 35 shapes"
        description="Static shapes draw the kit's paths, filled with currentColor (primary by default)."
      >
        <Demo
          wide
          start
          code={`
import { Shape } from '@m3x/react';

<Shape shape="cookie12Sided" size={64} />
<Shape shape="heart" size={64} aria-label="Favourite" />`}
        >
          <div {...stylex.props(s.grid)}>
            {NAMES.map((name) => (
              <figure key={name} {...stylex.props(s.cell)}>
                <Shape shape={name} size={64} aria-label={label(name)} />
                <figcaption {...stylex.props(typescale.labelMedium, s.cellName)}>{name}</figcaption>
              </figure>
            ))}
          </div>
        </Demo>
      </Section>
    </Page>
  );
}
