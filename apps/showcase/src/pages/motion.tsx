import { use, useEffect, useRef, useState, type MouseEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button, typescale } from '@m3x/react';
import {
  MotionSchemeContext,
  animateSpring,
  motionSchemes,
  settleTimeMs,
  useReducedMotion,
  useSpringToken,
  type SpringAnimation,
  type SpringParams,
  type SpringToken,
} from '@m3x/react/motion';
import { color } from '@m3x/react/tokens/color.stylex';
import { motion } from '@m3x/react/tokens/motion.stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const BALL = 40;
const SPATIAL = ['fast-spatial', 'default-spatial', 'slow-spatial'] as const;
const TOKENS: SpringToken[] = [
  'fast-spatial',
  'default-spatial',
  'slow-spatial',
  'fast-effects',
  'default-effects',
  'slow-effects',
];

const s = stylex.create({
  tracks: { display: 'flex', flexDirection: 'column', gap: 16, width: '100%' },
  trackRow: { display: 'flex', flexDirection: 'column', gap: 6 },
  trackLabel: { display: 'flex', justifyContent: 'space-between', gap: 8, color: color.onSurfaceVariant },
  track: {
    appearance: 'none',
    borderWidth: 0,
    margin: 0,
    padding: 0,
    display: 'block',
    position: 'relative',
    width: '100%',
    height: BALL,
    borderRadius: shape.cornerFull,
    backgroundColor: color.surfaceContainerHighest,
    cursor: 'pointer',
    containerType: 'inline-size',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 3,
    outlineOffset: 2,
    outlineColor: color.secondary,
  },
  ball: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BALL,
    height: BALL,
    borderRadius: shape.cornerFull,
    transform: `translateX(calc(var(--p, 0) * (100cqw - ${BALL}px)))`,
  },
  ballColor: (fill: string) => ({ backgroundColor: fill }),
  actions: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  note: { margin: 0, color: color.onSurfaceVariant },
  swatches: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, width: '100%' },
  swatch: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    gap: 2,
    minHeight: 112,
    padding: 12,
    borderRadius: shape.cornerLarge,
    backgroundColor: color.surfaceContainerHighest,
    color: color.onSurface,
    transitionProperty: 'background-color, color',
  },
  swatchOn: { backgroundColor: color.tertiary, color: color.onTertiary },
  fastEffects: { transitionDuration: motion.fastEffectsDuration, transitionTimingFunction: motion.fastEffectsEasing },
  defaultEffects: {
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  slowEffects: { transitionDuration: motion.slowEffectsDuration, transitionTimingFunction: motion.slowEffectsEasing },
  cssStage: { display: 'flex', flexDirection: 'column', gap: 16, width: '100%', alignItems: 'flex-start' },
  bar: {
    height: 56,
    width: 96,
    borderRadius: shape.cornerLarge,
    backgroundColor: color.primary,
    transitionProperty: 'width, border-radius',
    transitionDuration: motion.defaultSpatialDuration,
    transitionTimingFunction: motion.defaultSpatialEasing,
  },
  barOpen: { width: '100%', borderRadius: shape.cornerExtraLarge },
  tableScroll: { width: '100%', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', color: color.onSurface },
  th: {
    textAlign: 'start',
    paddingBlock: 8,
    paddingInline: 8,
    color: color.onSurfaceVariant,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: color.outlineVariant,
  },
  td: {
    paddingBlock: 8,
    paddingInline: 8,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: color.outlineVariant,
    fontVariantNumeric: 'tabular-nums',
  },
  current: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer },
});

/**
 * A ball on a track, driven by `animateSpring` (rAF, keeps its velocity when retargeted). `spring`
 * null (reduced motion) jumps. Clicking the track sends the ball to the pointer.
 */
function SpringTrack({
  name,
  detail,
  spring,
  target,
  fill,
  onTarget,
}: {
  name: string;
  detail: string;
  spring: SpringParams | null;
  target: number;
  fill: string;
  onTarget: (to: number) => void;
}) {
  const ball = useRef<HTMLSpanElement>(null);
  const anim = useRef<SpringAnimation | null>(null);
  const value = useRef(0);

  useEffect(() => {
    const el = ball.current;
    if (!el) return;
    const paint = (v: number) => {
      value.current = v;
      el.style.setProperty('--p', String(v));
    };
    if (!spring) {
      anim.current?.stop();
      anim.current = null;
      paint(target);
    } else if (anim.current) {
      anim.current.retarget(target, spring);
    } else {
      anim.current = animateSpring({ spring, from: value.current, to: target, precision: 0.001, onUpdate: paint });
    }
  }, [spring, target]);

  useEffect(() => () => anim.current?.stop(), []);

  const pick = (e: MouseEvent<HTMLButtonElement>) => {
    // Keyboard activation has no pointer position: flip sides instead.
    if (e.detail === 0) return onTarget(target > 0.5 ? 0 : 1);
    const rect = e.currentTarget.getBoundingClientRect();
    onTarget(Math.min(1, Math.max(0, (e.clientX - rect.left - BALL / 2) / (rect.width - BALL))));
  };

  return (
    <div {...stylex.props(s.trackRow)}>
      <div {...stylex.props(typescale.labelMedium, s.trackLabel)}>
        <span>{name}</span>
        <span>{detail}</span>
      </div>
      <button type="button" aria-label={`Move the ${name} ball`} onClick={pick} {...stylex.props(s.track)}>
        <span ref={ball} {...stylex.props(s.ball, s.ballColor(fill))} />
      </button>
    </div>
  );
}

const FILLS = [color.primary, color.secondary, color.tertiary];
const describe = (p: SpringParams) => `ζ ${p.dampingRatio} · k ${p.stiffness}`;

function SpatialSprings() {
  const scheme = use(MotionSchemeContext);
  const springs = [useSpringToken('fast-spatial'), useSpringToken('default-spatial'), useSpringToken('slow-spatial')];
  const [targets, setTargets] = useState([0, 0, 0]);
  const flip = () => setTargets((t) => t.map(() => (t.every((v) => v > 0.5) ? 0 : 1)));
  return (
    <div {...stylex.props(s.tracks)}>
      {SPATIAL.map((token, i) => (
        <SpringTrack
          key={token}
          name={token}
          detail={describe(motionSchemes[scheme][token])}
          spring={springs[i]!}
          target={targets[i]!}
          fill={FILLS[i]!}
          onTarget={(to) => setTargets((t) => t.map((v, j) => (j === i ? to : v)))}
        />
      ))}
      <div {...stylex.props(s.actions)}>
        <Button icon={<Icon name="play_arrow" size={20} />} onClick={flip}>
          Play
        </Button>
        <span {...stylex.props(typescale.bodySmall, s.note)}>
          {scheme} scheme · click a track to send its ball there, even mid-flight
        </span>
      </div>
    </div>
  );
}

function CompareSchemes() {
  const reduced = useReducedMotion();
  const [target, setTarget] = useState(0);
  const expressive = motionSchemes.expressive['default-spatial'];
  const standard = motionSchemes.standard['default-spatial'];
  return (
    <div {...stylex.props(s.tracks)}>
      <SpringTrack
        name="expressive"
        detail={describe(expressive)}
        spring={reduced ? null : expressive}
        target={target}
        fill={color.primary}
        onTarget={setTarget}
      />
      <SpringTrack
        name="standard"
        detail={describe(standard)}
        spring={reduced ? null : standard}
        target={target}
        fill={color.tertiary}
        onTarget={setTarget}
      />
      <div {...stylex.props(s.actions)}>
        <Button
          variant="tonal"
          icon={<Icon name="play_arrow" size={20} />}
          onClick={() => setTarget((t) => (t > 0.5 ? 0 : 1))}
        >
          Play both
        </Button>
      </div>
    </div>
  );
}

function EffectsSprings() {
  const [on, setOn] = useState(false);
  const swatches = [
    { token: 'fast-effects', style: s.fastEffects },
    { token: 'default-effects', style: s.defaultEffects },
    { token: 'slow-effects', style: s.slowEffects },
  ];
  return (
    <div {...stylex.props(s.tracks)}>
      <div {...stylex.props(s.swatches)}>
        {swatches.map(({ token, style }) => (
          <div key={token} {...stylex.props(s.swatch, style, on && s.swatchOn)}>
            <span {...stylex.props(typescale.labelLarge)}>{token}</span>
            <span {...stylex.props(typescale.bodySmall)}>{on ? 'tertiary' : 'surfaceContainerHighest'}</span>
          </div>
        ))}
      </div>
      <div {...stylex.props(s.actions)}>
        <Button variant="tonal" icon={<Icon name="format_paint" size={20} />} onClick={() => setOn((v) => !v)}>
          Change colour
        </Button>
      </div>
    </div>
  );
}

function CssTransition() {
  const [open, setOpen] = useState(false);
  return (
    <div {...stylex.props(s.cssStage)}>
      <div {...stylex.props(s.bar, open && s.barOpen)} />
      <Button variant="outlined" onClick={() => setOpen((v) => !v)}>
        {open ? 'Shrink' : 'Grow'}
      </Button>
    </div>
  );
}

function TokenTable() {
  const scheme = use(MotionSchemeContext);
  return (
    <table {...stylex.props(typescale.bodyMedium, s.table)}>
      <thead>
        <tr>
          {['Token', 'Scheme', 'Damping ratio', 'Stiffness', 'Settles in'].map((h) => (
            <th key={h} {...stylex.props(typescale.labelLarge, s.th)}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {TOKENS.flatMap((token) =>
          (['expressive', 'standard'] as const).map((name) => {
            const p = motionSchemes[name][token];
            const active = name === scheme;
            return (
              <tr key={`${token}-${name}`} {...stylex.props(active && s.current)}>
                <td {...stylex.props(s.td)}>{token}</td>
                <td {...stylex.props(s.td)}>
                  {name}
                  {active && ' (active)'}
                </td>
                <td {...stylex.props(s.td)}>{p.dampingRatio}</td>
                <td {...stylex.props(s.td)}>{p.stiffness}</td>
                <td {...stylex.props(s.td)}>{Math.round(settleTimeMs(p))} ms</td>
              </tr>
            );
          }),
        )}
      </tbody>
    </table>
  );
}

export default function MotionPage() {
  const reduced = useReducedMotion();
  return (
    <Page
      title="Motion"
      summary="M3 Expressive moves on springs. Spatial springs (position, size, shape) may overshoot; effects springs (colour, opacity) never do. Switch between the expressive and standard schemes in the theme panel."
    >
      <Section
        title="Spatial springs"
        description={
          reduced
            ? 'Reduced motion is on: spatial springs jump straight to their end value.'
            : 'Fast for small components, default for partial-screen motion, slow for full-screen motion.'
        }
      >
        <Demo
          wide
          column
          title="Fast, default and slow"
          code={`
import { animateSpring, useSpringToken } from '@m3x/react/motion';

// The active scheme's spring; null under reduced motion (jump instead).
const spring = useSpringToken('default-spatial');

const anim = animateSpring({
  spring,
  from: 0,
  to: 1,
  onUpdate: (value) => el.style.setProperty('--p', String(value)),
});
// Later, mid-flight: keeps the current velocity.
anim.retarget(0);`}
        >
          <SpatialSprings />
        </Demo>
        <Demo
          column
          title="Expressive and standard"
          code={`
import { motionSchemes } from '@m3x/react/motion';

motionSchemes.expressive['default-spatial']; // { dampingRatio: 0.8, stiffness: 380 }
motionSchemes.standard['default-spatial']; // { dampingRatio: 0.9, stiffness: 700 }`}
        >
          <CompareSchemes />
        </Demo>
        <Demo
          column
          title="In CSS"
          code={`
import * as stylex from '@stylexjs/stylex';
import { motion } from '@m3x/react/tokens/motion.stylex';

const styles = stylex.create({
  bar: {
    transitionProperty: 'width',
    // Exact spring curves as linear(); 0ms under reduced motion.
    transitionDuration: motion.defaultSpatialDuration,
    transitionTimingFunction: motion.defaultSpatialEasing,
  },
});`}
        >
          <CssTransition />
        </Demo>
      </Section>

      <Section
        title="Effects springs"
        description="Critically damped: colour and opacity ease in without overshoot, even under reduced motion."
      >
        <Demo
          wide
          column
          title="Fast, default and slow"
          code={`
const styles = stylex.create({
  swatch: {
    transitionProperty: 'background-color',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
});`}
        >
          <EffectsSprings />
        </Demo>
      </Section>

      <Section
        title="Tokens"
        description="Each token is a spring: a damping ratio and a stiffness, ported from Compose."
      >
        <Demo wide column start title="Both schemes, the active one highlighted">
          <div {...stylex.props(s.tableScroll)}>
            <TokenTable />
          </div>
        </Demo>
      </Section>
    </Page>
  );
}
