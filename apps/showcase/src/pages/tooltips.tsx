import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Button,
  IconButton,
  PlainTooltipSurface,
  RichTooltip,
  RichTooltipSurface,
  Switch,
  Tooltip,
  typescale,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const s = stylex.create({
  result: { margin: 0, color: color.onSurfaceVariant, textAlign: 'center', width: '100%' },
  row: { display: 'flex', alignItems: 'center', gap: 12, color: color.onSurface },
  controlled: { display: 'flex', alignItems: 'center', gap: 32 },
  surfaces: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center', gap: 32 },
});

const SIDES = ['top', 'right', 'bottom', 'left'] as const;
const ARROWS = { top: 'arrow_upward', right: 'arrow_forward', bottom: 'arrow_downward', left: 'arrow_back' } as const;

function ControlledDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Demo
      title="Controlled"
      code={`
const [open, setOpen] = useState(false);

<Tooltip content="Copy account number" open={open} onOpenChange={setOpen}>
  <IconButton aria-label="Copy"><Icon name="content_copy" /></IconButton>
</Tooltip>
<Switch checked={open} onCheckedChange={setOpen} aria-label="Show tooltip" />`}
    >
      <div {...stylex.props(s.controlled)}>
        <Tooltip content="Copy account number" open={open} onOpenChange={setOpen} side="bottom">
          <IconButton aria-label="Copy" variant="tonal">
            <Icon name="content_copy" />
          </IconButton>
        </Tooltip>
        <label {...stylex.props(typescale.bodyMedium, s.row)}>
          <Switch checked={open} onCheckedChange={setOpen} aria-label="Show tooltip" />
          Show tooltip
        </label>
      </div>
    </Demo>
  );
}

function RichActionsDemo() {
  const [enabled, setEnabled] = useState(false);
  return (
    <Demo
      title="Rich, with actions"
      column
      code={`
<RichTooltip
  trigger={<Button variant="tonal">Overdraft</Button>}
  subhead="Arranged overdraft"
  actions={
    <>
      <Button variant="text" size="small">Learn more</Button>
      <Button variant="text" size="small" onClick={turnOn}>Turn on</Button>
    </>
  }
>
  Borrow up to an agreed limit when your balance goes below zero.
</RichTooltip>`}
    >
      <RichTooltip
        trigger={<Button variant="tonal">Overdraft</Button>}
        subhead="Arranged overdraft"
        actions={
          <>
            <Button variant="text" size="small">
              Learn more
            </Button>
            <Button variant="text" size="small" onClick={() => setEnabled(true)}>
              Turn on
            </Button>
          </>
        }
      >
        Borrow up to an agreed limit when your balance goes below zero.
      </RichTooltip>
      <p {...stylex.props(typescale.bodyMedium, s.result)}>
        {enabled
          ? 'Overdraft turned on.'
          : 'Hover or focus the button, then move into the tooltip to reach its actions.'}
      </p>
    </Demo>
  );
}

export default function TooltipsPage() {
  return (
    <Page
      title="Tooltips"
      summary="Tooltips show brief labels or messages when people hover, focus or long-press an element. Plain tooltips name an icon; rich tooltips explain a feature and can carry actions."
    >
      <Section
        title="Plain"
        description="A short label for an icon button. Shows on hover and keyboard focus at once, or after a long press on touch."
      >
        <Demo
          title="Icon buttons"
          code={`
<Tooltip content="Add to favourites">
  <IconButton aria-label="Favourite"><Icon name="favorite" /></IconButton>
</Tooltip>`}
        >
          <Tooltip content="Add to favourites">
            <IconButton aria-label="Favourite">
              <Icon name="favorite" />
            </IconButton>
          </Tooltip>
          <Tooltip content="Share">
            <IconButton aria-label="Share">
              <Icon name="share" />
            </IconButton>
          </Tooltip>
          <Tooltip content="Download statement">
            <IconButton aria-label="Download" variant="tonal">
              <Icon name="download" />
            </IconButton>
          </Tooltip>
          <Tooltip content="Delete">
            <IconButton aria-label="Delete" variant="outlined">
              <Icon name="delete" />
            </IconButton>
          </Tooltip>
        </Demo>
        <Demo
          title="Placement"
          code={`
<Tooltip content="Top" side="top">…</Tooltip>
<Tooltip content="Right" side="right">…</Tooltip>
<Tooltip content="Bottom" side="bottom">…</Tooltip>
<Tooltip content="Left" side="left">…</Tooltip>`}
        >
          {SIDES.map((side) => (
            <Tooltip key={side} content={side[0]!.toUpperCase() + side.slice(1)} side={side}>
              <IconButton aria-label={`Tooltip on the ${side}`} variant="tonal">
                <Icon name={ARROWS[side]} />
              </IconButton>
            </Tooltip>
          ))}
        </Demo>
        <Demo
          title="Hover delay"
          code={`
<Tooltip content="Shown at once">…</Tooltip>
<Tooltip content="Shown after 600 ms" delay={600}>…</Tooltip>`}
        >
          <Tooltip content="Shown at once">
            <Button variant="outlined">No delay</Button>
          </Tooltip>
          <Tooltip content="Shown after 600 ms" delay={600}>
            <Button variant="outlined">600 ms delay</Button>
          </Tooltip>
        </Demo>
        <ControlledDemo />
      </Section>

      <Section
        title="Rich"
        description="A subhead, supporting text and optional actions. Rich tooltips sit below their trigger by default."
      >
        <Demo
          title="Text only"
          code={`
<RichTooltip trigger={<IconButton aria-label="About fees"><Icon name="info" /></IconButton>}>
  Transfers between your own accounts are free.
</RichTooltip>`}
        >
          <RichTooltip
            trigger={
              <IconButton aria-label="About fees">
                <Icon name="info" />
              </IconButton>
            }
          >
            Transfers between your own accounts are free.
          </RichTooltip>
          <RichTooltip
            trigger={
              <IconButton aria-label="About interest" variant="tonal">
                <Icon name="percent" />
              </IconButton>
            }
            subhead="Interest"
          >
            Interest is calculated daily and paid on the first of each month.
          </RichTooltip>
        </Demo>
        <RichActionsDemo />
        <Demo
          title="Persistent"
          code={`
<RichTooltip
  persistent
  trigger={<Button variant="outlined">What’s new</Button>}
  subhead="Scheduled payments"
  actions={<Button variant="text" size="small">Got it</Button>}
>
  Stays open until you press outside it or press Escape.
</RichTooltip>`}
        >
          <RichTooltip
            persistent
            trigger={<Button variant="outlined">What’s new</Button>}
            subhead="Scheduled payments"
            actions={
              <Button variant="text" size="small">
                Got it
              </Button>
            }
          >
            Stays open until you press outside it or press Escape.
          </RichTooltip>
        </Demo>
      </Section>

      <Section title="Surfaces" description="The static tooltip surfaces, for documentation and custom popups.">
        <Demo
          wide
          code={`
<PlainTooltipSurface>Add to favourites</PlainTooltipSurface>
<RichTooltipSurface
  subhead="Arranged overdraft"
  actions={<Button variant="text" size="small">Learn more</Button>}
>
  Borrow up to an agreed limit when your balance goes below zero.
</RichTooltipSurface>`}
        >
          <div {...stylex.props(s.surfaces)}>
            <PlainTooltipSurface>Add to favourites</PlainTooltipSurface>
            <RichTooltipSurface>Transfers between your own accounts are free.</RichTooltipSurface>
            <RichTooltipSurface
              subhead="Arranged overdraft"
              actions={
                <Button variant="text" size="small">
                  Learn more
                </Button>
              }
            >
              Borrow up to an agreed limit when your balance goes below zero.
            </RichTooltipSurface>
          </div>
        </Demo>
      </Section>
    </Page>
  );
}
