import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  BottomSheet,
  Button,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemMonogram,
  ModalBottomSheet,
  ModalSideSheet,
  RangeSlider,
  SideSheet,
  TextField,
  typescale,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const s = stylex.create({
  // A list in a sheet sits 12px in from its edges (like a navigation drawer), so a selected row's
  // indicator doesn't run into the sheet's edge.
  sheetList: { paddingInline: 12 },
  result: { margin: 0, color: color.onSurfaceVariant, flexBasis: '100%', textAlign: 'center' },
  // A desktop-like window for the standard side sheet.
  window: {
    display: 'flex',
    width: '100%',
    height: 480,
    borderRadius: shape.cornerLarge,
    overflow: 'hidden',
    backgroundColor: color.surface,
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: color.outlineVariant,
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
    flexGrow: 1,
    minWidth: 0,
    padding: 24,
    color: color.onSurfaceVariant,
  },
  heading: { margin: 0, color: color.onSurface },
  text: { margin: 0 },
  // A phone-sized frame for the standard bottom sheet.
  phone: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    width: 360,
    maxWidth: '100%',
    height: 480,
    borderRadius: shape.cornerLarge,
    overflow: 'hidden',
    backgroundColor: color.surface,
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: color.outlineVariant,
  },
  map: {
    flexGrow: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: color.onSecondaryContainer,
    backgroundImage: `linear-gradient(160deg, ${color.secondaryContainer}, ${color.tertiaryContainer})`,
  },
  peek: (height: number) => ({
    height,
    flexShrink: 0,
    transitionProperty: 'height',
    transitionDuration: '300ms',
  }),
  sheetHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingInline: 24,
    paddingBottom: 8,
  },
  sheetTitle: { margin: 0, color: color.onSurface },
  sheetText: { margin: 0, color: color.onSurfaceVariant },
  form: { display: 'flex', flexDirection: 'column', gap: 16, paddingInline: 24, paddingBottom: 24 },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
  filterBlock: { display: 'flex', flexDirection: 'column', gap: 8, paddingInline: 24, paddingBlock: 12 },
  label: { margin: 0, color: color.onSurfaceVariant },
  field: { width: '100%' },
  sheetHeaderTop: { paddingTop: 20 },
  behind: { flexGrow: 1, minHeight: 0, overflowY: 'auto', paddingTop: 8 },
  sheetActions: { display: 'flex', gap: 8, paddingInline: 24, paddingBottom: 24, paddingTop: 8 },
});

const SHARE = [
  { icon: 'link', label: 'Copy link' },
  { icon: 'mail', label: 'Email' },
  { icon: 'sms', label: 'Message' },
  { icon: 'picture_as_pdf', label: 'Download as PDF' },
  { icon: 'print', label: 'Print' },
];

const CATEGORIES = ['Card payments', 'Transfers', 'Direct debits', 'Fees'];

const gbp = (n: number) => `£${n.toLocaleString('en-GB')}`;

function ShareSheetDemo() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState('—');
  const pick = (r: string) => {
    setResult(r);
    setOpen(false);
  };
  return (
    <>
      <Button icon={<Icon name="share" size={20} />} onClick={() => setOpen(true)}>
        Share statement
      </Button>
      <p {...stylex.props(typescale.bodyMedium, s.result)}>Last choice: {result}</p>
      <ModalBottomSheet open={open} onOpenChange={setOpen} aria-label="Share statement">
        <div {...stylex.props(s.sheetHeader)}>
          <h2 {...stylex.props(typescale.titleLarge, s.sheetTitle)}>Share statement</h2>
        </div>
        <List aria-label="Share options">
          {SHARE.map((o) => (
            <ListItem key={o.label} leading={<Icon name={o.icon} size={20} />} onClick={() => pick(o.label)}>
              {o.label}
            </ListItem>
          ))}
        </List>
      </ModalBottomSheet>
    </>
  );
}

function FormSheetDemo() {
  const [open, setOpen] = useState(false);
  const [payee, setPayee] = useState('Northwind Supplies');
  const [amount, setAmount] = useState('250.00');
  const [reference, setReference] = useState('INV-2041');
  const [scheduled, setScheduled] = useState('—');
  return (
    <>
      <Button variant="tonal" icon={<Icon name="event" size={20} />} onClick={() => setOpen(true)}>
        Schedule a payment
      </Button>
      <p {...stylex.props(typescale.bodyMedium, s.result)}>Scheduled: {scheduled}</p>
      <ModalBottomSheet open={open} onOpenChange={setOpen} aria-label="Schedule a payment">
        <div {...stylex.props(s.sheetHeader)}>
          <h2 {...stylex.props(typescale.titleLarge, s.sheetTitle)}>Schedule a payment</h2>
        </div>
        <div {...stylex.props(s.form)}>
          <p {...stylex.props(typescale.bodyMedium, s.sheetText)}>
            Drag the handle down, press Escape or tap the scrim to dismiss. Text fields keep their own drags.
          </p>
          <TextField sx={s.field} variant="outlined" label="Payee" value={payee} onValueChange={setPayee} />
          <TextField
            sx={s.field}
            variant="outlined"
            label="Amount"
            inputMode="decimal"
            value={amount}
            onValueChange={setAmount}
            leadingIcon={<Icon name="currency_pound" />}
          />
          <TextField
            sx={s.field}
            variant="outlined"
            label="Reference"
            value={reference}
            onValueChange={setReference}
            supportingText="Shown on their statement"
          />
          <div {...stylex.props(s.formActions)}>
            <Button variant="outlined" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setScheduled(`£${amount} to ${payee}`);
                setOpen(false);
              }}
            >
              Schedule
            </Button>
          </div>
        </div>
      </ModalBottomSheet>
    </>
  );
}

function StandardBottomSheetDemo() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div {...stylex.props(s.phone)}>
      <div {...stylex.props(s.map)}>
        <Icon name="map" size={48} />
      </div>
      <BottomSheet sx={s.peek(expanded ? 356 : 220)}>
        <div {...stylex.props(s.sheetHeader)}>
          <h2 {...stylex.props(typescale.titleMedium, s.sheetTitle)}>Nearby branches</h2>
          <Button variant="text" size="small" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Less' : 'More'}
          </Button>
        </div>
        <List aria-label="Branches">
          {['Leeds, Park Row', 'Leeds, Briggate', 'Bradford, Market St', 'Harrogate, James St'].map((b, i) => (
            <ListItem
              key={b}
              leading={<Icon name="location_on" size={20} />}
              supportingText={`${((i + 1) * 0.6).toFixed(1)} miles`}
            >
              {b}
            </ListItem>
          ))}
        </List>
      </BottomSheet>
    </div>
  );
}

const INVOICES = ['INV-2041 · Northwind', 'INV-2042 · Fabrikam', 'INV-2043 · Contoso', 'INV-2044 · Litware'];

function SelectionSheetDemo() {
  const [picked, setPicked] = useState<number[]>([0, 2]);
  const total = picked.length * 625;
  return (
    <div {...stylex.props(s.phone)}>
      <div {...stylex.props(s.behind)}>
        <List variant="segmented" aria-label="Invoices">
          {INVOICES.map((inv, i) => (
            <ListItem
              key={inv}
              leading={<Icon name="receipt_long" size={20} />}
              supportingText="£625.00 · due Friday"
              selected={picked.includes(i)}
              onClick={() => setPicked((all) => (all.includes(i) ? all.filter((x) => x !== i) : [...all, i]))}
            >
              {inv}
            </ListItem>
          ))}
        </List>
      </div>
      {picked.length > 0 && (
        <BottomSheet dragHandle={false}>
          <div {...stylex.props(s.sheetHeader, s.sheetHeaderTop)}>
            <h2 {...stylex.props(typescale.titleMedium, s.sheetTitle)}>
              {picked.length} selected · {gbp(total)}
            </h2>
          </div>
          <div {...stylex.props(s.sheetActions)}>
            <Button onClick={() => setPicked([])}>Pay now</Button>
            <Button variant="outlined" onClick={() => setPicked([])}>
              Clear
            </Button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function StandardSideSheetDemo() {
  const [open, setOpen] = useState(true);
  const close = (
    <IconButton aria-label="Close details" onClick={() => setOpen(false)}>
      <Icon name="close" />
    </IconButton>
  );
  return (
    <div {...stylex.props(s.window)}>
      <div {...stylex.props(s.main)}>
        <h2 {...stylex.props(typescale.titleLarge, s.heading)}>Transactions</h2>
        <p {...stylex.props(typescale.bodyMedium, s.text)}>
          A standard side sheet sits beside the content and shares the window with it; the page stays interactive.
        </p>
        <Button variant="tonal" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide details' : 'Show details'}
        </Button>
      </div>
      {open && (
        <SideSheet
          headline="Payment details"
          close={close}
          actions={
            <>
              <Button onClick={() => setOpen(false)}>Done</Button>
              <Button variant="outlined">Report a problem</Button>
            </>
          }
        >
          <List variant="baseline" aria-label="Payment details">
            <ListItem supportingText="Northwind Supplies Ltd">Payee</ListItem>
            <ListItem supportingText="£1,250.00">Amount</ListItem>
            <ListItem supportingText="8 October 2026">Date</ListItem>
            <ListItem supportingText="INV-2041">Reference</ListItem>
          </List>
        </SideSheet>
      )}
    </div>
  );
}

function FilterSheetDemo() {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>(['Card payments', 'Transfers']);
  const [range, setRange] = useState<[number, number]>([0, 2500]);
  const [applied, setApplied] = useState('All transactions');
  const apply = () => {
    setApplied(`${categories.length} categories, ${gbp(range[0])} – ${gbp(range[1])}`);
    setOpen(false);
  };
  return (
    <>
      <Button icon={<Icon name="filter_list" size={20} />} onClick={() => setOpen(true)}>
        Filters
      </Button>
      <p {...stylex.props(typescale.bodyMedium, s.result)}>Showing: {applied}</p>
      <ModalSideSheet
        open={open}
        onOpenChange={setOpen}
        headline="Filters"
        navigation={
          <IconButton aria-label="Back" width="narrow" onClick={() => setOpen(false)}>
            <Icon name="arrow_back" />
          </IconButton>
        }
        close={
          <IconButton aria-label="Close filters" onClick={() => setOpen(false)}>
            <Icon name="close" />
          </IconButton>
        }
        actions={
          <>
            <Button onClick={apply}>Apply</Button>
            <Button variant="outlined" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <List aria-label="Categories">
          {CATEGORIES.map((c) => (
            <ListItem
              key={c}
              trailing={
                <Checkbox
                  checked={categories.includes(c)}
                  onCheckedChange={(v) => setCategories((all) => (v ? [...all, c] : all.filter((x) => x !== c)))}
                  aria-label={c}
                />
              }
            >
              {c}
            </ListItem>
          ))}
        </List>
        <div {...stylex.props(s.filterBlock)}>
          <p {...stylex.props(typescale.titleSmall, s.label)}>
            Amount: {gbp(range[0])} – {gbp(range[1])}
          </p>
          <RangeSlider
            value={range}
            onValueChange={setRange}
            min={0}
            max={5000}
            step={50}
            getAriaLabel={(i) => (i === 0 ? 'Minimum amount' : 'Maximum amount')}
          />
        </div>
      </ModalSideSheet>
    </>
  );
}

function AccountSheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outlined" icon={<Icon name="account_circle" size={20} />} onClick={() => setOpen(true)}>
        Switch account
      </Button>
      <ModalSideSheet
        open={open}
        onOpenChange={setOpen}
        side="start"
        headline="Accounts"
        close={
          <IconButton aria-label="Close accounts" onClick={() => setOpen(false)}>
            <Icon name="close" />
          </IconButton>
        }
      >
        <List aria-label="Accounts" sx={s.sheetList}>
          {[
            ['Harbour Studio Ltd', 'Business current · •• 4821'],
            ['Harbour Studio Ltd', 'Instant access savings · •• 1170'],
            ['Northline Lettings', 'Business current · •• 9032'],
          ].map(([name, detail], i) => (
            <ListItem
              key={detail}
              leading={<ListItemMonogram>{name![0]}</ListItemMonogram>}
              supportingText={detail}
              selected={i === 0}
              onClick={() => setOpen(false)}
            >
              {name}
            </ListItem>
          ))}
        </List>
      </ModalSideSheet>
    </>
  );
}

export default function SheetsPage() {
  return (
    <Page
      title="Sheets"
      summary="Sheets hold supplementary content anchored to an edge of the screen. Standard sheets share the layout with the page; modal sheets sit over a scrim, and bottom sheets drag to dismiss."
    >
      <Section
        title="Modal bottom sheets"
        description="They spring up from the bottom; drag the handle (or a flick) to dismiss, or press Escape or the scrim."
      >
        <Demo
          title="Actions"
          code={`
const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Share statement</Button>
<ModalBottomSheet open={open} onOpenChange={setOpen} aria-label="Share statement">
  <List aria-label="Share options">
    <ListItem leading={<Icon name="link" size={20} />} onClick={copyLink}>Copy link</ListItem>
    <ListItem leading={<Icon name="mail" size={20} />} onClick={email}>Email</ListItem>
  </List>
</ModalBottomSheet>`}
        >
          <ShareSheetDemo />
        </Demo>
        <Demo
          title="Form"
          code={`
<ModalBottomSheet open={open} onOpenChange={setOpen} aria-label="Schedule a payment">
  <div {...stylex.props(s.form)}>
    <TextField sx={s.field} variant="outlined" label="Payee" value={payee} onValueChange={setPayee} />
    <TextField sx={s.field} variant="outlined" label="Amount" value={amount} onValueChange={setAmount} />
    <Button onClick={schedule}>Schedule</Button>
  </div>
</ModalBottomSheet>`}
        >
          <FormSheetDemo />
        </Demo>
      </Section>

      <Section
        title="Modal side sheets"
        description="Detached from the edge, over a scrim. They slide in from the end (or the start); drag one back towards its edge to dismiss it."
      >
        <Demo
          title="Filters, from the end"
          code={`
<ModalSideSheet
  open={open}
  onOpenChange={setOpen}
  headline="Filters"
  navigation={
    <IconButton aria-label="Back" width="narrow" onClick={() => setOpen(false)}>
      <Icon name="arrow_back" />
    </IconButton>
  }
  close={
    <IconButton aria-label="Close filters" onClick={() => setOpen(false)}>
      <Icon name="close" />
    </IconButton>
  }
  actions={
    <>
      <Button onClick={apply}>Apply</Button>
      <Button variant="outlined" onClick={() => setOpen(false)}>Cancel</Button>
    </>
  }
>
  <List aria-label="Categories">{categories}</List>
  <RangeSlider value={range} onValueChange={setRange} min={0} max={5000} step={50} />
</ModalSideSheet>`}
        >
          <FilterSheetDemo />
        </Demo>
        <Demo
          title="From the start"
          code={`
<ModalSideSheet
  open={open}
  onOpenChange={setOpen}
  side="start"
  headline="Accounts"
  close={<IconButton aria-label="Close accounts" onClick={() => setOpen(false)}><Icon name="close" /></IconButton>}
>
  <List aria-label="Accounts">{accounts}</List>
</ModalSideSheet>`}
        >
          <AccountSheetDemo />
        </Demo>
      </Section>

      <Section
        title="Standard sheets"
        description="In the layout, beside or under the main content; the rest of the page stays interactive."
      >
        <Demo
          title="Side sheet"
          wide
          code={`
<div style={{ display: 'flex' }}>
  <main>…</main>
  {open && (
    <SideSheet
      headline="Payment details"
      close={<IconButton aria-label="Close details" onClick={() => setOpen(false)}><Icon name="close" /></IconButton>}
      actions={<Button onClick={() => setOpen(false)}>Done</Button>}
    >
      <List variant="baseline" aria-label="Payment details">
        <ListItem supportingText="Northwind Supplies Ltd">Payee</ListItem>
        <ListItem supportingText="£1,250.00">Amount</ListItem>
      </List>
    </SideSheet>
  )}
</div>`}
        >
          <StandardSideSheetDemo />
        </Demo>
        <Demo
          title="Bottom sheet"
          code={`
<div style={{ display: 'flex', flexDirection: 'column', height: 480 }}>
  <Map />
  <BottomSheet sx={s.peek}>
    <List aria-label="Branches">
      <ListItem leading={<Icon name="location_on" size={20} />} supportingText="0.6 miles">
        Leeds, Park Row
      </ListItem>
    </List>
  </BottomSheet>
</div>`}
        >
          <StandardBottomSheetDemo />
        </Demo>
        <Demo
          title="Without a drag handle"
          code={`
{selected.length > 0 && (
  <BottomSheet dragHandle={false}>
    <h2>{selected.length} selected</h2>
    <Button onClick={pay}>Pay now</Button>
    <Button variant="outlined" onClick={clear}>Clear</Button>
  </BottomSheet>
)}`}
        >
          <SelectionSheetDemo />
        </Demo>
      </Section>
    </Page>
  );
}
