import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { SegmentedButton, SegmentedButtonItem, typescale, type SegmentedButtonDensity } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const DENSITIES: SegmentedButtonDensity[] = [0, -1, -2, -3];
const PERIODS = ['day', 'week', 'month', 'year'];

const cap = (v: string) => v[0]!.toUpperCase() + v.slice(1);

const s = stylex.create({
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  // Five segments scroll sideways on narrow screens; 'safe center' keeps their start reachable.
  stack: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'safe center',
    gap: 16,
    width: '100%',
    overflowX: 'auto',
    paddingTop: 8,
    paddingBottom: 4,
    paddingInline: 4,
  },
  labelled: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 'max-content' },
  // Keep the natural width in the scrolling stack (a fit-content flex item would squeeze the group).
  natural: { width: 'max-content' },
  caption: { color: color.onSurfaceVariant },
  status: { margin: 0, color: color.onSurfaceVariant, textAlign: 'center' },
});

function SingleSelect() {
  const [period, setPeriod] = useState<string[]>(['week']);
  return (
    <div {...stylex.props(s.center)}>
      <SegmentedButton
        aria-label="Period"
        value={period}
        // Single selection keeps one segment on: ignore the click that would clear it.
        onValueChange={(next) => next.length > 0 && setPeriod(next)}
      >
        {PERIODS.map((p) => (
          <SegmentedButtonItem key={p} value={p}>
            {cap(p)}
          </SegmentedButtonItem>
        ))}
      </SegmentedButton>
      <p {...stylex.props(typescale.bodyMedium, s.status)}>Showing this {period[0]}</p>
    </div>
  );
}

const SIZES_OPTIONS = ['xs', 's', 'm', 'l', 'xl'];

function MultiSelect() {
  const [sizes, setSizes] = useState<string[]>(['m', 'l']);
  return (
    <div {...stylex.props(s.center)}>
      <SegmentedButton aria-label="Sizes" multiple value={sizes} onValueChange={setSizes}>
        {SIZES_OPTIONS.map((v) => (
          <SegmentedButtonItem key={v} value={v}>
            {v.toUpperCase()}
          </SegmentedButtonItem>
        ))}
      </SegmentedButton>
      <p {...stylex.props(typescale.bodyMedium, s.status)}>
        {sizes.length ? `Selected: ${sizes.map((v) => v.toUpperCase()).join(', ')}` : 'No sizes selected'}
      </p>
    </div>
  );
}

export default function SegmentedButtonsPage() {
  return (
    <Page
      title="Segmented buttons"
      summary="Segmented buttons select options, switch views or sort elements, among two to five choices. Selected segments show a check."
    >
      <Section title="Selection" description="Single selection behaves like radio buttons; multiple like checkboxes.">
        <Demo
          title="Single selection"
          code={`
const [period, setPeriod] = useState(['week']);

<SegmentedButton
  aria-label="Period"
  value={period}
  onValueChange={(next) => next.length > 0 && setPeriod(next)}
>
  <SegmentedButtonItem value="day">Day</SegmentedButtonItem>
  <SegmentedButtonItem value="week">Week</SegmentedButtonItem>
  <SegmentedButtonItem value="month">Month</SegmentedButtonItem>
  <SegmentedButtonItem value="year">Year</SegmentedButtonItem>
</SegmentedButton>`}
        >
          <SingleSelect />
        </Demo>
        <Demo
          title="Multiple selection"
          code={`
const [sizes, setSizes] = useState(['m', 'l']);

<SegmentedButton aria-label="Sizes" multiple value={sizes} onValueChange={setSizes}>
  <SegmentedButtonItem value="xs">XS</SegmentedButtonItem>
  <SegmentedButtonItem value="s">S</SegmentedButtonItem>
  …
</SegmentedButton>`}
        >
          <MultiSelect />
        </Demo>
      </Section>

      <Section
        title="Content"
        description="Labels, icons, or both. The check replaces the icon when a segment has both; otherwise it slides in front."
      >
        <Demo
          title="Label and icon"
          code={`
<SegmentedButton aria-label="Travel mode" defaultValue={['walk']}>
  <SegmentedButtonItem value="walk" icon={<Icon name="directions_walk" size={18} />}>Walk</SegmentedButtonItem>
  <SegmentedButtonItem value="transit" icon={<Icon name="directions_transit" size={18} />}>Transit</SegmentedButtonItem>
  <SegmentedButtonItem value="drive" icon={<Icon name="directions_car" size={18} />}>Drive</SegmentedButtonItem>
</SegmentedButton>`}
        >
          <SegmentedButton aria-label="Travel mode" defaultValue={['walk']}>
            <SegmentedButtonItem value="walk" icon={<Icon name="directions_walk" size={18} />}>
              Walk
            </SegmentedButtonItem>
            <SegmentedButtonItem value="transit" icon={<Icon name="directions_transit" size={18} />}>
              Transit
            </SegmentedButtonItem>
            <SegmentedButtonItem value="drive" icon={<Icon name="directions_car" size={18} />}>
              Drive
            </SegmentedButtonItem>
          </SegmentedButton>
        </Demo>
        <Demo
          title="Icon only"
          code={`
<SegmentedButton aria-label="Alignment" defaultValue={['left']}>
  <SegmentedButtonItem value="left" aria-label="Align left" icon={<Icon name="format_align_left" size={18} />} />
  <SegmentedButtonItem value="center" aria-label="Centre" icon={<Icon name="format_align_center" size={18} />} />
  <SegmentedButtonItem value="right" aria-label="Align right" icon={<Icon name="format_align_right" size={18} />} />
</SegmentedButton>`}
        >
          <SegmentedButton aria-label="Alignment" defaultValue={['left']}>
            <SegmentedButtonItem
              value="left"
              aria-label="Align left"
              icon={<Icon name="format_align_left" size={18} />}
            />
            <SegmentedButtonItem
              value="center"
              aria-label="Centre"
              icon={<Icon name="format_align_center" size={18} />}
            />
            <SegmentedButtonItem
              value="right"
              aria-label="Align right"
              icon={<Icon name="format_align_right" size={18} />}
            />
          </SegmentedButton>
        </Demo>
        <Demo
          wide
          title="Two to five segments"
          code={`
<SegmentedButton aria-label="Answer" defaultValue={['yes']}>
  <SegmentedButtonItem value="yes">Yes</SegmentedButtonItem>
  <SegmentedButtonItem value="no">No</SegmentedButtonItem>
</SegmentedButton>`}
        >
          <div {...stylex.props(s.stack)}>
            {[2, 3, 4, 5].map((n) => (
              <SegmentedButton key={n} aria-label={`${n} segments`} defaultValue={['1']} sx={s.natural}>
                {Array.from({ length: n }, (_, i) => (
                  <SegmentedButtonItem key={i} value={String(i + 1)}>
                    {`Option ${i + 1}`}
                  </SegmentedButtonItem>
                ))}
              </SegmentedButton>
            ))}
          </div>
        </Demo>
      </Section>

      <Section title="Density" description="Each step removes 4px of height: 40, 36, 32 and 28px, for dense layouts.">
        <Demo
          wide
          title="0 to -3"
          code={`<SegmentedButton aria-label="Period" density={-2} defaultValue={['week']}>…</SegmentedButton>`}
        >
          <div {...stylex.props(s.stack)}>
            {DENSITIES.map((density) => (
              <div key={density} {...stylex.props(s.labelled)}>
                <SegmentedButton aria-label={`Period (density ${density})`} density={density} defaultValue={['week']}>
                  {PERIODS.map((p) => (
                    <SegmentedButtonItem key={p} value={p}>
                      {cap(p)}
                    </SegmentedButtonItem>
                  ))}
                </SegmentedButton>
                <span {...stylex.props(typescale.labelMedium, s.caption)}>density={density}</span>
              </div>
            ))}
          </div>
        </Demo>
      </Section>

      <Section title="Disabled" description="The whole group, or single segments.">
        <Demo
          title="Group"
          code={`<SegmentedButton aria-label="Period" disabled defaultValue={['week']}>…</SegmentedButton>`}
        >
          <SegmentedButton aria-label="Period (disabled)" disabled defaultValue={['week']}>
            {PERIODS.slice(0, 3).map((p) => (
              <SegmentedButtonItem key={p} value={p}>
                {cap(p)}
              </SegmentedButtonItem>
            ))}
          </SegmentedButton>
        </Demo>
        <Demo title="Segment" code={`<SegmentedButtonItem value="year" disabled>Year</SegmentedButtonItem>`}>
          <SegmentedButton aria-label="Period (one disabled)" defaultValue={['day']}>
            {PERIODS.map((p) => (
              <SegmentedButtonItem key={p} value={p} disabled={p === 'year'}>
                {cap(p)}
              </SegmentedButtonItem>
            ))}
          </SegmentedButton>
        </Demo>
      </Section>
    </Page>
  );
}
