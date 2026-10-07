import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Button,
  Checkbox,
  Dialog,
  DialogSurface,
  List,
  ListItem,
  ListItemMonogram,
  Radio,
  RadioGroup,
  TextField,
  typescale,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { elevation } from '@m3x/react/tokens/elevation.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const s = stylex.create({
  stack: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  result: { margin: 0, color: color.onSurfaceVariant, textAlign: 'center' },
  field: { width: '100%' },
  scrollable: { height: 440 },
  form: { display: 'flex', flexDirection: 'column', gap: 16, paddingInline: 24, paddingTop: 4 },
  formDialog: { width: 400 },
  preview: { boxShadow: elevation.level3 },
});

const PEOPLE = [
  'Amelia Hart',
  'Ben Okafor',
  'Chloe Martin',
  'Daniel Wu',
  'Ella Fischer',
  'Finn Murphy',
  'Grace Adeyemi',
  'Harry Clarke',
  'Isla Novak',
  'Jack Reid',
  'Kate Lindqvist',
  'Leo Rossi',
];

const RINGTONES = ['None', 'Chime', 'Glass', 'Marimba', 'Ripple'];

/** The last way a dialog closed, shown under its button. */
function Result({ value }: { value: string }) {
  return <p {...stylex.props(typescale.bodyMedium, s.result)}>Last result: {value}</p>;
}

function BasicDemo({ withIcon }: { withIcon: boolean }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState('—');
  const close = (r: string) => {
    setResult(r);
    setOpen(false);
  };
  return (
    <div {...stylex.props(s.stack)}>
      <Button variant={withIcon ? 'tonal' : 'filled'} onClick={() => setOpen(true)}>
        {withIcon ? 'Reset settings' : 'Delete draft'}
      </Button>
      <Result value={result} />
      <Dialog
        open={open}
        onOpenChange={(o) => !o && close('dismissed')}
        icon={withIcon ? <Icon name="restart_alt" /> : undefined}
        headline={withIcon ? 'Reset settings?' : 'Delete draft?'}
        supportingText={
          withIcon
            ? 'This resets your app preferences to their defaults. Your saved accounts and payees are not affected.'
            : 'The draft payment to Northwind Supplies will be deleted. You can’t undo this.'
        }
        actions={
          <>
            <Button variant="text" onClick={() => close('cancelled')}>
              Cancel
            </Button>
            <Button variant="text" onClick={() => close(withIcon ? 'reset' : 'deleted')}>
              {withIcon ? 'Reset' : 'Delete'}
            </Button>
          </>
        }
      />
    </div>
  );
}

function AlertDemo() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState('—');
  const close = (r: string) => {
    setResult(r);
    setOpen(false);
  };
  return (
    <div {...stylex.props(s.stack)}>
      <Button variant="outlined" onClick={() => setOpen(true)}>
        Sign out everywhere
      </Button>
      <Result value={result} />
      <Dialog
        role="alertdialog"
        open={open}
        onOpenChange={(o) => !o && close('dismissed (Escape)')}
        headline="Sign out of all devices?"
        supportingText="You’ll need to sign in again on every phone, tablet and computer. A click outside doesn’t dismiss this dialog."
        actions={
          <>
            <Button variant="text" onClick={() => close('cancelled')}>
              Cancel
            </Button>
            <Button variant="text" onClick={() => close('signed out')}>
              Sign out
            </Button>
          </>
        }
      />
    </div>
  );
}

function SingleChoiceDemo() {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState('Chime');
  const [draft, setDraft] = useState(tone);
  const show = () => {
    setDraft(tone);
    setOpen(true);
  };
  return (
    <div {...stylex.props(s.stack)}>
      <Button variant="tonal" icon={<Icon name="music_note" size={20} />} onClick={show}>
        Choose sound
      </Button>
      <p {...stylex.props(typescale.bodyMedium, s.result)}>Sound: {tone}</p>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        headline="Notification sound"
        actions={
          <>
            <Button variant="text" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="text"
              onClick={() => {
                setTone(draft);
                setOpen(false);
              }}
            >
              OK
            </Button>
          </>
        }
      >
        <RadioGroup value={draft} onValueChange={(v) => setDraft(String(v))} aria-label="Notification sound">
          <List variant="baseline" aria-label="Sounds">
            {RINGTONES.map((t) => (
              <ListItem key={t} leading={<Radio value={t} aria-label={t} />}>
                {t}
              </ListItem>
            ))}
          </List>
        </RadioGroup>
      </Dialog>
    </div>
  );
}

function PeopleDemo({ scroll }: { scroll: boolean }) {
  const people = scroll ? PEOPLE : PEOPLE.slice(0, 3);
  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState<string[]>([people[0]!]);
  const [draft, setDraft] = useState(shared);
  const show = () => {
    setDraft(shared);
    setOpen(true);
  };
  return (
    <div {...stylex.props(s.stack)}>
      <Button variant={scroll ? 'filled' : 'tonal'} icon={<Icon name="share" size={20} />} onClick={show}>
        {scroll ? 'Share with everyone' : 'Share with team'}
      </Button>
      <p {...stylex.props(typescale.bodyMedium, s.result)}>Shared with: {shared.join(', ') || 'nobody'}</p>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        headline="Share with"
        supportingText="Choose who can see the September statement."
        divider={scroll}
        sx={scroll ? s.scrollable : undefined}
        actions={
          <>
            <Button variant="text" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="text"
              onClick={() => {
                setShared(draft);
                setOpen(false);
              }}
            >
              Share
            </Button>
          </>
        }
      >
        <List variant="baseline" aria-label="People">
          {people.map((n, i) => (
            <ListItem
              key={n}
              leading={<ListItemMonogram>{n[0]}</ListItemMonogram>}
              trailing={
                <Checkbox
                  checked={draft.includes(n)}
                  onCheckedChange={(c) => setDraft((p) => (c ? [...p, n] : p.filter((x) => x !== n)))}
                  aria-label={n}
                />
              }
              divider={i < people.length - 1}
            >
              {n}
            </ListItem>
          ))}
        </List>
      </Dialog>
    </div>
  );
}

function FormDemo() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [invited, setInvited] = useState<string[]>([]);
  const nameError = tried && name.trim() === '';
  const emailError = tried && !/^\S+@\S+\.\S+$/.test(email);
  const show = () => {
    setName('');
    setEmail('');
    setTried(false);
    setOpen(true);
  };
  const submit = () => {
    setTried(true);
    if (name.trim() === '' || !/^\S+@\S+\.\S+$/.test(email)) return;
    setInvited((all) => [...all, name.trim()]);
    setOpen(false);
  };
  return (
    <div {...stylex.props(s.stack)}>
      <Button icon={<Icon name="person_add" size={20} />} onClick={show}>
        Invite a teammate
      </Button>
      <p {...stylex.props(typescale.bodyMedium, s.result)}>Invited: {invited.join(', ') || 'nobody yet'}</p>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        headline="Invite a teammate"
        supportingText="They’ll get an email with a link to set up their login."
        sx={s.formDialog}
        actions={
          <>
            <Button variant="text" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="text" onClick={submit}>
              Send invite
            </Button>
          </>
        }
      >
        <div {...stylex.props(s.form)}>
          <TextField
            sx={s.field}
            variant="outlined"
            label="Full name"
            value={name}
            onValueChange={setName}
            error={nameError}
            errorText="Enter their name"
            autoComplete="off"
          />
          <TextField
            sx={s.field}
            variant="outlined"
            label="Work email"
            type="email"
            value={email}
            onValueChange={setEmail}
            error={emailError}
            errorText="Enter a valid email address"
            supportingText="e.g. name@company.co.uk"
            leadingIcon={<Icon name="mail" />}
            autoComplete="off"
          />
        </div>
      </Dialog>
    </div>
  );
}

export default function DialogsPage() {
  return (
    <Page
      title="Dialogs"
      summary="Dialogs ask for a decision or show critical information, over a scrim that holds focus. They fade and scale in, and Escape (or a click on the scrim) dismisses them."
    >
      <Section
        title="Basic"
        description="A headline, supporting text and up to two text actions, the confirming one last."
      >
        <Demo
          title="Basic"
          code={`
const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Delete draft</Button>
<Dialog
  open={open}
  onOpenChange={setOpen}
  headline="Delete draft?"
  supportingText="The draft payment will be deleted. You can’t undo this."
  actions={
    <>
      <Button variant="text" onClick={() => setOpen(false)}>Cancel</Button>
      <Button variant="text" onClick={confirm}>Delete</Button>
    </>
  }
/>`}
        >
          <BasicDemo withIcon={false} />
        </Demo>
        <Demo
          title="With an icon"
          code={`
<Dialog
  open={open}
  onOpenChange={setOpen}
  icon={<Icon name="restart_alt" />}
  headline="Reset settings?"
  supportingText="This resets your app preferences to their defaults."
  actions={actions}
/>`}
        >
          <BasicDemo withIcon />
        </Demo>
      </Section>

      <Section
        title="Alerts and forms"
        description="An alert dialog interrupts: only its actions or Escape close it. Form dialogs validate before they close."
      >
        <Demo
          title="Alert"
          code={`
// alertdialog: the scrim doesn't dismiss it (Escape still does).
<Dialog
  role="alertdialog"
  open={open}
  onOpenChange={setOpen}
  headline="Sign out of all devices?"
  supportingText="You’ll need to sign in again everywhere."
  actions={actions}
/>`}
        >
          <AlertDemo />
        </Demo>
        <Demo
          title="Form dialog"
          code={`
<Dialog
  open={open}
  onOpenChange={setOpen}
  headline="Invite a teammate"
  sx={s.formDialog}
  actions={
    <>
      <Button variant="text" onClick={() => setOpen(false)}>Cancel</Button>
      <Button variant="text" onClick={submit}>Send invite</Button>
    </>
  }
>
  <div {...stylex.props(s.form)}>
    <TextField sx={s.field} variant="outlined" label="Full name" value={name} onValueChange={setName} />
    <TextField sx={s.field} variant="outlined" label="Work email" type="email" value={email} onValueChange={setEmail} />
  </div>
</Dialog>`}
        >
          <FormDemo />
        </Demo>
      </Section>

      <Section
        title="Lists"
        description="Content under the header runs edge to edge. A height-bound dialog scrolls it between dividers."
      >
        <Demo
          title="Single choice"
          code={`
<Dialog open={open} onOpenChange={setOpen} headline="Notification sound" actions={actions}>
  <RadioGroup value={draft} onValueChange={(v) => setDraft(String(v))} aria-label="Notification sound">
    <List variant="baseline" aria-label="Sounds">
      {sounds.map((t) => (
        <ListItem key={t} leading={<Radio value={t} aria-label={t} />}>
          {t}
        </ListItem>
      ))}
    </List>
  </RadioGroup>
</Dialog>`}
        >
          <SingleChoiceDemo />
        </Demo>
        <Demo
          title="Multiple choice"
          code={`
<Dialog
  open={open}
  onOpenChange={setOpen}
  headline="Share with"
  supportingText="Choose who can see the September statement."
  actions={actions}
>
  <List variant="baseline" aria-label="People">
    {people.map((n, i) => (
      <ListItem
        key={n}
        leading={<ListItemMonogram>{n[0]}</ListItemMonogram>}
        trailing={<Checkbox checked={picked.includes(n)} onCheckedChange={...} aria-label={n} />}
        divider={i < people.length - 1}
      >
        {n}
      </ListItem>
    ))}
  </List>
</Dialog>

// Height-bound: the list scrolls between dividers.
const s = stylex.create({ scrollable: { height: 440 } });

<Dialog
  open={open}
  onOpenChange={setOpen}
  headline="Share with"
  divider
  sx={s.scrollable}
  actions={actions}
>
  <List variant="baseline" aria-label="People">{rows}</List>
</Dialog>`}
        >
          <PeopleDemo scroll={false} />
          <PeopleDemo scroll />
        </Demo>
      </Section>

      <Section
        title="Surface"
        description="DialogSurface is the dialog without the modal: useful for previews, documentation and custom overlays."
      >
        <Demo
          title="Static surfaces"
          wide
          code={`
<DialogSurface
  icon={<Icon name="lock_reset" />}
  headline="Reset passcode?"
  supportingText="We’ll send a one-time code to your registered phone."
  actions={
    <>
      <Button variant="text">Cancel</Button>
      <Button variant="text">Send code</Button>
    </>
  }
/>`}
        >
          <DialogSurface
            sx={s.preview}
            icon={<Icon name="lock_reset" />}
            headline="Reset passcode?"
            supportingText="We’ll send a one-time code to your registered phone. It expires after ten minutes."
            actions={
              <>
                <Button variant="text">Cancel</Button>
                <Button variant="text">Send code</Button>
              </>
            }
          />
          <DialogSurface
            sx={s.preview}
            headline="Default account"
            supportingText="Payments are taken from this account unless you choose another."
            actions={
              <>
                <Button variant="text">Cancel</Button>
                <Button variant="text">Save</Button>
              </>
            }
          >
            <List variant="baseline" aria-label="Accounts">
              <ListItem leading={<Icon name="account_balance" />} supportingText="•• 4821" divider>
                Business current
              </ListItem>
              <ListItem leading={<Icon name="savings" />} supportingText="•• 1170">
                Instant access savings
              </ListItem>
            </List>
          </DialogSurface>
        </Demo>
      </Section>
    </Page>
  );
}
