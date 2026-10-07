import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Badge, Button, IconButton, Tab, TabPanel, Tabs, typescale, type TabsVariant } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const s = stylex.create({
  // Tabs sit on Surface: a small screen frames them on the demo's container colour.
  frame: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: shape.cornerLarge,
    backgroundColor: color.surface,
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: color.outlineVariant,
    outlineOffset: -1,
  },
  panel: { paddingBlock: 20, paddingInline: 24, color: color.onSurfaceVariant, minHeight: 64 },
  panelTitle: { margin: 0, marginBottom: 4, color: color.onSurface },
  text: { margin: 0 },
  toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%' },
  status: { margin: 0, color: color.onSurfaceVariant },
  stack: { display: 'flex', flexDirection: 'column', gap: 16, width: '100%' },
});

const MEDIA = [
  { label: 'Video', icon: 'videocam', text: 'Clips you recorded or saved, newest first.' },
  { label: 'Photos', icon: 'photo', text: 'Every photo, grouped by the day it was taken.' },
  { label: 'Audio', icon: 'music_note', text: 'Voice notes and music. Three are new since your last visit.' },
] as const;

const SECTIONS = ['Overview', 'Statements', 'Payments', 'Cards', 'Savings', 'Insights', 'Documents', 'Settings'];

function MediaPanels() {
  return MEDIA.map((m, i) => (
    <TabPanel key={m.label} value={i} sx={s.panel}>
      <h4 {...stylex.props(typescale.titleMedium, s.panelTitle)}>{m.label}</h4>
      <p {...stylex.props(typescale.bodyMedium, s.text)}>{m.text}</p>
    </TabPanel>
  ));
}

function IconAndLabel({ variant }: { variant: TabsVariant }) {
  const [value, setValue] = useState<unknown>(0);
  return (
    <div {...stylex.props(s.frame)}>
      <Tabs variant={variant} value={value} onValueChange={setValue} aria-label="Media" panels={<MediaPanels />}>
        {MEDIA.map((m, i) => (
          <Tab
            key={m.label}
            value={i}
            label={m.label}
            icon={<Icon name={m.icon} />}
            badge={i === 2 ? <Badge count={3} /> : undefined}
          />
        ))}
      </Tabs>
    </div>
  );
}

function LabelOnly({ variant }: { variant: TabsVariant }) {
  return (
    <div {...stylex.props(s.frame)}>
      <Tabs variant={variant} defaultValue={0} aria-label="Media" panels={<MediaPanels />}>
        {MEDIA.map((m, i) => (
          <Tab key={m.label} value={i} label={m.label} />
        ))}
      </Tabs>
    </div>
  );
}

function IconOnly() {
  return (
    <div {...stylex.props(s.frame)}>
      <Tabs defaultValue={0} aria-label="Media" panels={<MediaPanels />}>
        {MEDIA.map((m, i) => (
          <Tab key={m.label} value={i} aria-label={m.label} icon={<Icon name={m.icon} />} />
        ))}
      </Tabs>
    </div>
  );
}

function Scrollable({ variant }: { variant: TabsVariant }) {
  const [value, setValue] = useState(0);
  return (
    <div {...stylex.props(s.frame)}>
      <Tabs
        variant={variant}
        scrollable
        value={value}
        onValueChange={(v) => setValue(v as number)}
        aria-label="Account sections"
        panels={SECTIONS.map((t, i) => (
          <TabPanel key={t} value={i} sx={s.panel}>
            <p {...stylex.props(typescale.bodyMedium, s.text)}>{t}</p>
          </TabPanel>
        ))}
      >
        {SECTIONS.map((t, i) => (
          <Tab key={t} value={i} label={t} />
        ))}
      </Tabs>
    </div>
  );
}

const STEPS = ['Details', 'Address', 'Payment', 'Review'];

function Controlled() {
  const [value, setValue] = useState(0);
  return (
    <div {...stylex.props(s.stack)}>
      <div {...stylex.props(s.frame)}>
        <Tabs
          variant="secondary"
          value={value}
          onValueChange={(v) => setValue(v as number)}
          aria-label="Checkout"
          panels={STEPS.map((t, i) => (
            <TabPanel key={t} value={i} sx={s.panel}>
              <p {...stylex.props(typescale.bodyMedium, s.text)}>
                Step {i + 1} of {STEPS.length}: {t.toLowerCase()}.
              </p>
            </TabPanel>
          ))}
        >
          {STEPS.map((t, i) => (
            <Tab key={t} value={i} label={t} disabled={i === 3 && value < 2} />
          ))}
        </Tabs>
      </div>
      <div {...stylex.props(s.toolbar)}>
        <IconButton aria-label="Previous step" disabled={value === 0} onClick={() => setValue((v) => v - 1)}>
          <Icon name="arrow_back" />
        </IconButton>
        <p {...stylex.props(typescale.bodyMedium, s.status)}>
          value = {value} ({STEPS[value]})
        </p>
        <Button
          variant="tonal"
          size="small"
          disabled={value === STEPS.length - 1}
          onClick={() => setValue((v) => v + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function TabsPage() {
  return (
    <Page
      title="Tabs"
      summary="Tabs organise content across screens and views at the same level. The indicator springs to the selected tab; arrow keys move between tabs."
    >
      <Section
        title="Primary tabs"
        description="Primary tabs sit under the top app bar and switch between main content destinations. The indicator hugs the tab's content."
      >
        <Demo
          title="Icon and label"
          code={`
const [value, setValue] = useState<unknown>(0);

<Tabs
  value={value}
  onValueChange={setValue}
  aria-label="Media"
  panels={
    <>
      <TabPanel value={0}>Video</TabPanel>
      <TabPanel value={1}>Photos</TabPanel>
      <TabPanel value={2}>Audio</TabPanel>
    </>
  }
>
  <Tab value={0} label="Video" icon={<Icon name="videocam" />} />
  <Tab value={1} label="Photos" icon={<Icon name="photo" />} />
  <Tab value={2} label="Audio" icon={<Icon name="music_note" />} badge={<Badge count={3} />} />
</Tabs>`}
        >
          <IconAndLabel variant="primary" />
        </Demo>
        <Demo
          title="Label only"
          code={`
<Tabs defaultValue={0} aria-label="Media">
  <Tab value={0} label="Video" />
  <Tab value={1} label="Photos" />
  <Tab value={2} label="Audio" />
</Tabs>`}
        >
          <LabelOnly variant="primary" />
        </Demo>
        <Demo
          title="Icon only"
          code={`
<Tabs defaultValue={0} aria-label="Media">
  <Tab value={0} aria-label="Video" icon={<Icon name="videocam" />} />
  <Tab value={1} aria-label="Photos" icon={<Icon name="photo" />} />
  <Tab value={2} aria-label="Audio" icon={<Icon name="music_note" />} />
</Tabs>`}
        >
          <IconOnly />
        </Demo>
      </Section>

      <Section
        title="Secondary tabs"
        description="Secondary tabs work within a content area to separate related groups. The indicator spans the whole tab; icons sit beside the label."
      >
        <Demo
          title="Label only"
          code={`
<Tabs variant="secondary" defaultValue={0} aria-label="Media">
  <Tab value={0} label="Video" />
  <Tab value={1} label="Photos" />
  <Tab value={2} label="Audio" />
</Tabs>`}
        >
          <LabelOnly variant="secondary" />
        </Demo>
        <Demo
          title="Icon and label"
          code={`
<Tabs variant="secondary" value={value} onValueChange={setValue} aria-label="Media">
  <Tab value={0} label="Video" icon={<Icon name="videocam" />} />
  <Tab value={1} label="Photos" icon={<Icon name="photo" />} />
  <Tab value={2} label="Audio" icon={<Icon name="music_note" />} badge={<Badge count={3} />} />
</Tabs>`}
        >
          <IconAndLabel variant="secondary" />
        </Demo>
      </Section>

      <Section
        title="Scrollable"
        description="With more tabs than fit, the row scrolls: tabs hug their labels (at least 90px) and the selected one scrolls towards the centre on the default spatial spring."
      >
        <Demo
          title="Primary"
          code={`
<Tabs scrollable defaultValue={0} aria-label="Account sections">
  <Tab value={0} label="Overview" />
  <Tab value={1} label="Statements" />
  <Tab value={2} label="Payments" />
  {/* … */}
</Tabs>`}
        >
          <Scrollable variant="primary" />
        </Demo>
        <Demo
          title="Secondary"
          code={`
<Tabs variant="secondary" scrollable defaultValue={0} aria-label="Account sections">
  <Tab value={0} label="Overview" />
  <Tab value={1} label="Statements" />
  {/* … */}
</Tabs>`}
        >
          <Scrollable variant="secondary" />
        </Demo>
      </Section>

      <Section
        title="Controlled"
        description="Drive the selection from your own state; a disabled tab can't be selected until it is enabled."
      >
        <Demo
          title="Stepper with a disabled tab"
          code={`
const [value, setValue] = useState(0);

<Tabs variant="secondary" value={value} onValueChange={(v) => setValue(v as number)} aria-label="Checkout">
  <Tab value={0} label="Details" />
  <Tab value={1} label="Address" />
  <Tab value={2} label="Payment" />
  <Tab value={3} label="Review" disabled={value < 2} />
</Tabs>
<Button onClick={() => setValue((v) => v + 1)}>Next</Button>`}
        >
          <Controlled />
        </Demo>
      </Section>
    </Page>
  );
}
