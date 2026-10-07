import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { SegmentedButton, SegmentedButtonItem, TextField, typescale, type TypescaleRole } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';

type Family = 'display' | 'headline' | 'title' | 'body' | 'label';
type Scale = 'Large' | 'Medium' | 'Small';
type BaseRole = Exclude<TypescaleRole, `${string}Emphasized`>;

/** The type scale's metrics (`tokens/typescale.ts`): size / line height / tracking in px, weight. */
const SPECS: Record<BaseRole, { size: number; line: number; tracking: number; weight: number }> = {
  displayLarge: { size: 57, line: 64, tracking: -0.25, weight: 400 },
  displayMedium: { size: 45, line: 52, tracking: 0, weight: 400 },
  displaySmall: { size: 36, line: 44, tracking: 0, weight: 400 },
  headlineLarge: { size: 32, line: 40, tracking: 0, weight: 400 },
  headlineMedium: { size: 28, line: 36, tracking: 0, weight: 400 },
  headlineSmall: { size: 24, line: 32, tracking: 0, weight: 400 },
  titleLarge: { size: 22, line: 28, tracking: 0, weight: 400 },
  titleMedium: { size: 16, line: 24, tracking: 0.15, weight: 500 },
  titleSmall: { size: 14, line: 20, tracking: 0.1, weight: 500 },
  bodyLarge: { size: 16, line: 24, tracking: 0.5, weight: 400 },
  bodyMedium: { size: 14, line: 20, tracking: 0.25, weight: 400 },
  bodySmall: { size: 12, line: 16, tracking: 0.4, weight: 400 },
  labelLarge: { size: 14, line: 20, tracking: 0.1, weight: 500 },
  labelMedium: { size: 12, line: 16, tracking: 0.5, weight: 500 },
  labelSmall: { size: 11, line: 16, tracking: 0.5, weight: 500 },
};

/** Emphasized weights: regular → medium (500), medium → semibold (600, the kit's "Bold"). */
const emphasizedWeight = (weight: number) => (weight === 400 ? 500 : 600);

const FAMILIES: { family: Family; title: string; description: string; sample: string }[] = [
  {
    family: 'display',
    title: 'Display',
    description: 'The largest text on screen, for short, important text or numerals.',
    sample: 'Expressive',
  },
  {
    family: 'headline',
    title: 'Headline',
    description: 'High-emphasis text on smaller screens: page and section headings.',
    sample: 'Morning commute',
  },
  {
    family: 'title',
    title: 'Title',
    description: 'Medium-emphasis text that stays short: app bars, dialogs, list headers.',
    sample: 'Quarterly summary',
  },
  {
    family: 'body',
    title: 'Body',
    description: 'Longer passages of text.',
    sample: 'The quick brown fox jumps over the lazy dog.',
  },
  {
    family: 'label',
    title: 'Label',
    description: 'Utilitarian text inside components: buttons, chips, navigation.',
    sample: 'Save changes',
  },
];
const SCALES: Scale[] = ['Large', 'Medium', 'Small'];

const s = stylex.create({
  table: { display: 'flex', flexDirection: 'column', width: '100%', paddingTop: 8 },
  row: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 200px) minmax(0, 1fr)',
    columnGap: 24,
    rowGap: 8,
    alignItems: 'baseline',
    paddingBlock: 16,
    borderTopWidth: { default: 1, ':first-child': 0 },
    borderTopStyle: 'solid',
    borderTopColor: color.outlineVariant,
  },
  meta: { display: 'flex', flexDirection: 'column', gap: 2 },
  role: { margin: 0, color: color.onSurface },
  spec: { margin: 0, color: color.onSurfaceVariant },
  samples: { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 },
  sample: { margin: 0, color: color.onSurface, overflowWrap: 'anywhere' },
  tag: {
    display: 'inline-block',
    marginInlineStart: 12,
    paddingInline: 6,
    borderRadius: shape.cornerExtraSmall,
    backgroundColor: color.secondaryContainer,
    color: color.onSecondaryContainer,
    verticalAlign: 'middle',
  },
  controls: { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', width: '100%' },
  field: { flexGrow: 1, minWidth: 220 },
  preview: { margin: 0, color: color.onSurface, overflowWrap: 'anywhere', width: '100%' },
});

const roleName = (family: Family, scale: Scale) => `${family}${scale}` as BaseRole;
const label = (role: string) => role.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
const px = (n: number) => `${n}px`;

function FamilyTable({ family, sample }: { family: Family; sample: string }) {
  return (
    <div {...stylex.props(s.table)}>
      {SCALES.map((scale) => {
        const role = roleName(family, scale);
        const spec = SPECS[role];
        return (
          <div key={role} {...stylex.props(s.row)}>
            <div {...stylex.props(s.meta)}>
              <p {...stylex.props(typescale.titleSmall, s.role)}>{label(role)}</p>
              <p {...stylex.props(typescale.bodySmall, s.spec)}>
                {px(spec.size)} / {px(spec.line)} · tracking {spec.tracking}px
              </p>
              <p {...stylex.props(typescale.bodySmall, s.spec)}>
                weight {spec.weight} · emphasized {emphasizedWeight(spec.weight)}
              </p>
            </div>
            <div {...stylex.props(s.samples)}>
              <p {...stylex.props(typescale[role], s.sample)}>{sample}</p>
              <p {...stylex.props(typescale[`${role}Emphasized`], s.sample)}>
                {sample}
                <span {...stylex.props(typescale.labelSmall, s.tag)}>Emphasized</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TypographyPage() {
  const [text, setText] = useState('Material 3 Expressive');
  const [previewRole, setPreviewRole] = useState<string[]>(['headlineLarge']);
  const role = (previewRole[0] ?? 'headlineLarge') as BaseRole;

  return (
    <Page
      title="Typography"
      summary="Fifteen type roles in five families, each in a baseline and an emphasized weight. Every role is a StyleX style: spread it with stylex.props."
    >
      <Section title="Usage" description="Roles set font family, weight, size, line height and tracking.">
        <Demo
          wide
          column
          title="Try a role"
          code={`
import * as stylex from '@stylexjs/stylex';
import { typescale } from '@m3x/react';

<h1 {...stylex.props(typescale.headlineLarge)}>Material 3 Expressive</h1>
<h1 {...stylex.props(typescale.headlineLargeEmphasized)}>Material 3 Expressive</h1>`}
        >
          <div {...stylex.props(s.controls)}>
            <TextField label="Sample text" value={text} onValueChange={setText} sx={s.field} />
            <SegmentedButton
              aria-label="Role"
              value={previewRole}
              onValueChange={(next) => next.length > 0 && setPreviewRole(next)}
            >
              <SegmentedButtonItem value="displayMedium">Display</SegmentedButtonItem>
              <SegmentedButtonItem value="headlineLarge">Headline</SegmentedButtonItem>
              <SegmentedButtonItem value="titleLarge">Title</SegmentedButtonItem>
              <SegmentedButtonItem value="bodyLarge">Body</SegmentedButtonItem>
            </SegmentedButton>
          </div>
          <p {...stylex.props(typescale[role], s.preview)}>{text || ' '}</p>
          <p {...stylex.props(typescale[`${role}Emphasized`], s.preview)}>{text || ' '}</p>
        </Demo>
      </Section>

      {FAMILIES.map(({ family, title, description, sample }) => (
        <Section key={family} title={title} description={description}>
          <Demo
            wide
            column
            code={`<p {...stylex.props(typescale.${family}Large)}>${sample}</p>
<p {...stylex.props(typescale.${family}LargeEmphasized)}>${sample}</p>`}
          >
            <FamilyTable family={family} sample={sample} />
          </Demo>
        </Section>
      ))}
    </Page>
  );
}
