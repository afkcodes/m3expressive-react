import { useEffect, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Button,
  Card,
  CircularProgress,
  IconButton,
  LinearProgress,
  LoadingIndicator,
  SegmentedButton,
  SegmentedButtonItem,
  Slider,
  typescale,
  type ProgressShape,
  type ProgressThickness,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const s = stylex.create({
  stack: { display: 'flex', flexDirection: 'column', gap: 24, width: '100%' },
  row: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 32 },
  labelled: { display: 'flex', flexDirection: 'column', gap: 8 },
  caption: { color: color.onSurfaceVariant },
  cell: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  // Indicators of different sizes in one row: a fixed slot keeps the captions aligned.
  slot: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 56 },
  value: { color: color.onSurfaceVariant, minWidth: 48, textAlign: 'center' },
  controls: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12 },
  // A file row: name, size, linear progress under it.
  file: { display: 'flex', alignItems: 'center', gap: 16, width: '100%' },
  fileIcon: { color: color.onSurfaceVariant },
  fileText: { display: 'flex', flexDirection: 'column', gap: 8, flexGrow: 1, minWidth: 0 },
  fileHead: { display: 'flex', justifyContent: 'space-between', gap: 8, color: color.onSurface },
  card: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 24, width: 240 },
  cardText: { margin: 0, color: color.onSurfaceVariant, textAlign: 'center' },
});

/** Runs a fake download: 0 → 100 in random steps, then stops. */
function useSimulatedProgress() {
  const [value, setValue] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setValue((v) => {
        const next = Math.min(100, v + 4 + Math.random() * 10);
        if (next >= 100) setRunning(false);
        return next;
      });
    }, 400);
    return () => clearInterval(id);
  }, [running]);
  const start = () => {
    setValue(0);
    setRunning(true);
  };
  return { value, running, start };
}

function ShapeToggle({ shape, onChange }: { shape: ProgressShape; onChange: (s: ProgressShape) => void }) {
  return (
    <SegmentedButton
      aria-label="Shape"
      value={[shape]}
      onValueChange={([next]) => {
        if (next === 'flat' || next === 'wavy') onChange(next);
      }}
    >
      <SegmentedButtonItem value="flat">Flat</SegmentedButtonItem>
      <SegmentedButtonItem value="wavy">Wavy</SegmentedButtonItem>
    </SegmentedButton>
  );
}

function DeterminateLinear() {
  const [value, setValue] = useState(40);
  const [shape, setShape] = useState<ProgressShape>('flat');
  const [thickness, setThickness] = useState<ProgressThickness>(4);
  return (
    <Demo
      title="Determinate, driven by a slider"
      column
      code={`
const [value, setValue] = useState(40);

<LinearProgress value={value} shape="${shape}" thickness={${thickness}} aria-label="Upload" />
<Slider aria-label="Progress" value={value} onValueChange={setValue} />`}
    >
      <LinearProgress value={value} shape={shape} thickness={thickness} aria-label="Upload" />
      <Slider aria-label="Progress" value={value} onValueChange={setValue} />
      <div {...stylex.props(s.controls)}>
        <ShapeToggle shape={shape} onChange={setShape} />
        <SegmentedButton
          aria-label="Thickness"
          value={[String(thickness)]}
          onValueChange={([next]) => {
            if (next) setThickness(next === '8' ? 8 : 4);
          }}
        >
          <SegmentedButtonItem value="4">4 dp</SegmentedButtonItem>
          <SegmentedButtonItem value="8">8 dp</SegmentedButtonItem>
        </SegmentedButton>
      </div>
    </Demo>
  );
}

function DownloadDemo() {
  const { value, running, start } = useSimulatedProgress();
  const done = value >= 100;
  return (
    <Demo
      title="A download"
      column
      code={`
<LinearProgress value={value} shape="wavy" aria-label="Downloading statement.pdf" />`}
    >
      <div {...stylex.props(s.file)}>
        <span {...stylex.props(s.fileIcon)}>
          <Icon name={done ? 'task' : 'description'} />
        </span>
        <div {...stylex.props(s.fileText)}>
          <div {...stylex.props(typescale.bodyMedium, s.fileHead)}>
            <span>statement-september.pdf</span>
            <span {...stylex.props(s.caption)}>{done ? 'Done' : `${Math.round(value)}%`}</span>
          </div>
          <LinearProgress value={value} shape="wavy" aria-label="Downloading statement-september.pdf" />
        </div>
      </div>
      <div {...stylex.props(s.controls)}>
        <Button variant="tonal" icon={<Icon name="download" size={20} />} disabled={running} onClick={start}>
          {value > 0 && !running ? 'Download again' : 'Download'}
        </Button>
      </div>
    </Demo>
  );
}

function DeterminateCircular() {
  const [value, setValue] = useState(65);
  const [shape, setShape] = useState<ProgressShape>('wavy');
  return (
    <Demo
      title="Determinate"
      column
      code={`
<CircularProgress value={value} shape="${shape}" aria-label="Sync" />
<CircularProgress value={value} shape="${shape}" thickness={8} aria-label="Sync" />`}
    >
      <div {...stylex.props(s.row)}>
        <CircularProgress value={value} shape={shape} aria-label="Sync" />
        <CircularProgress value={value} shape={shape} thickness={8} aria-label="Sync, thick" />
      </div>
      <div {...stylex.props(s.controls)}>
        <IconButton aria-label="Less" variant="tonal" onClick={() => setValue((v) => Math.max(0, v - 10))}>
          <Icon name="remove" />
        </IconButton>
        <span {...stylex.props(typescale.titleMedium, s.value)}>{value}%</span>
        <IconButton aria-label="More" variant="tonal" onClick={() => setValue((v) => Math.min(100, v + 10))}>
          <Icon name="add" />
        </IconButton>
      </div>
      <div {...stylex.props(s.controls)}>
        <ShapeToggle shape={shape} onChange={setShape} />
      </div>
    </Demo>
  );
}

export default function ProgressPage() {
  return (
    <Page
      title="Progress indicators"
      summary="Progress indicators show the status of a process. Determinate indicators fill as work completes; indeterminate ones loop while the duration is unknown. The expressive wavy shape adds energy to longer waits."
    >
      <Section
        title="Linear"
        description="A track and an active indicator along one line, flat or wavy, 4 or 8 dp thick."
      >
        <DeterminateLinear />
        <DownloadDemo />
        <Demo
          title="Indeterminate"
          column
          code={`
<LinearProgress aria-label="Loading" />
<LinearProgress shape="wavy" aria-label="Loading" />
<LinearProgress thickness={8} aria-label="Loading" />
<LinearProgress shape="wavy" thickness={8} aria-label="Loading" />`}
        >
          <div {...stylex.props(s.stack)}>
            <div {...stylex.props(s.labelled)}>
              <span {...stylex.props(typescale.labelMedium, s.caption)}>Flat</span>
              <LinearProgress aria-label="Loading, flat" />
            </div>
            <div {...stylex.props(s.labelled)}>
              <span {...stylex.props(typescale.labelMedium, s.caption)}>Wavy</span>
              <LinearProgress shape="wavy" aria-label="Loading, wavy" />
            </div>
            <div {...stylex.props(s.labelled)}>
              <span {...stylex.props(typescale.labelMedium, s.caption)}>Flat, 8 dp</span>
              <LinearProgress thickness={8} aria-label="Loading, flat thick" />
            </div>
            <div {...stylex.props(s.labelled)}>
              <span {...stylex.props(typescale.labelMedium, s.caption)}>Wavy, 8 dp</span>
              <LinearProgress shape="wavy" thickness={8} aria-label="Loading, wavy thick" />
            </div>
          </div>
        </Demo>
        <Demo
          title="Wavelength"
          column
          code={`
<LinearProgress value={70} shape="wavy" wavelength={24} aria-label="Short waves" />
<LinearProgress value={70} shape="wavy" aria-label="Default (40)" />
<LinearProgress value={70} shape="wavy" wavelength={64} aria-label="Long waves" />`}
        >
          <div {...stylex.props(s.stack)}>
            {[24, 40, 64].map((w) => (
              <div key={w} {...stylex.props(s.labelled)}>
                <span {...stylex.props(typescale.labelMedium, s.caption)}>
                  {w === 40 ? '40 px (default)' : `${w} px`}
                </span>
                <LinearProgress value={70} shape="wavy" wavelength={w} aria-label={`Wavelength ${w}`} />
              </div>
            ))}
          </div>
        </Demo>
      </Section>

      <Section title="Circular" description="The same indicator around a circle.">
        <DeterminateCircular />
        <Demo
          title="Indeterminate"
          code={`
<CircularProgress aria-label="Loading" />
<CircularProgress shape="wavy" aria-label="Loading" />
<CircularProgress thickness={8} aria-label="Loading" />
<CircularProgress shape="wavy" thickness={8} aria-label="Loading" />`}
        >
          <div {...stylex.props(s.cell)}>
            <div {...stylex.props(s.slot)}>
              <CircularProgress aria-label="Loading, flat" />
            </div>
            <span {...stylex.props(typescale.labelMedium, s.caption)}>Flat</span>
          </div>
          <div {...stylex.props(s.cell)}>
            <div {...stylex.props(s.slot)}>
              <CircularProgress shape="wavy" aria-label="Loading, wavy" />
            </div>
            <span {...stylex.props(typescale.labelMedium, s.caption)}>Wavy</span>
          </div>
          <div {...stylex.props(s.cell)}>
            <div {...stylex.props(s.slot)}>
              <CircularProgress thickness={8} aria-label="Loading, flat thick" />
            </div>
            <span {...stylex.props(typescale.labelMedium, s.caption)}>Flat, 8 dp</span>
          </div>
          <div {...stylex.props(s.cell)}>
            <div {...stylex.props(s.slot)}>
              <CircularProgress shape="wavy" thickness={8} aria-label="Loading, wavy thick" />
            </div>
            <span {...stylex.props(typescale.labelMedium, s.caption)}>Wavy, 8 dp</span>
          </div>
        </Demo>
      </Section>

      <Section
        title="Loading indicator"
        description="For waits under five seconds: a shape that morphs through the expressive shape set. Use it in place of an indeterminate circular indicator, or contained on top of content (pull to refresh)."
      >
        <Demo
          title="Plain and contained"
          code={`
<LoadingIndicator aria-label="Loading" />
<LoadingIndicator contained aria-label="Loading" />`}
        >
          <div {...stylex.props(s.cell)}>
            <div {...stylex.props(s.slot)}>
              <LoadingIndicator aria-label="Loading" />
            </div>
            <span {...stylex.props(typescale.labelMedium, s.caption)}>Default</span>
          </div>
          <div {...stylex.props(s.cell)}>
            <div {...stylex.props(s.slot)}>
              <LoadingIndicator contained aria-label="Loading, contained" />
            </div>
            <span {...stylex.props(typescale.labelMedium, s.caption)}>Contained</span>
          </div>
        </Demo>
        <Demo
          title="In context"
          code={`
<Card variant="filled">
  <LoadingIndicator aria-label="Loading your accounts" />
  <p>Fetching your accounts…</p>
</Card>`}
        >
          <Card variant="filled" sx={s.card}>
            <LoadingIndicator aria-label="Loading your accounts" />
            <p {...stylex.props(typescale.bodyMedium, s.cardText)}>Fetching your accounts…</p>
          </Card>
        </Demo>
      </Section>
    </Page>
  );
}
