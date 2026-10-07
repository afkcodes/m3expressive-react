import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button, Snackbar, SnackbarAction, SnackbarProvider, typescale, useSnackbar } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const s = stylex.create({
  result: { margin: 0, color: color.onSurfaceVariant, textAlign: 'center', width: '100%' },
  surfaces: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 480 },
  buttons: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 },
});

function Result({ text }: { text: string }) {
  return (
    <p {...stylex.props(typescale.bodyMedium, s.result)} aria-live="polite">
      {text}
    </p>
  );
}

function PlainDemo() {
  const snackbar = useSnackbar();
  return (
    <Demo
      title="Plain"
      code={`
const snackbar = useSnackbar();

<Button onClick={() => snackbar.show('Payment scheduled')}>Schedule payment</Button>`}
    >
      <Button icon={<Icon name="event" size={20} />} onClick={() => snackbar.show('Payment scheduled')}>
        Schedule payment
      </Button>
    </Demo>
  );
}

function ActionDemo() {
  const snackbar = useSnackbar();
  const [archived, setArchived] = useState(0);
  return (
    <Demo
      title="With an action"
      column
      code={`
snackbar.show('Conversation archived', {
  action: { label: 'Undo', onAction: () => restore() },
});`}
    >
      <Button
        variant="tonal"
        icon={<Icon name="archive" size={20} />}
        onClick={() => {
          setArchived((n) => n + 1);
          snackbar.show('Conversation archived', {
            action: { label: 'Undo', onAction: () => setArchived((n) => n - 1) },
          });
        }}
      >
        Archive
      </Button>
      <Result text={`${archived} archived. With an action, the snackbar stays until it is chosen or dismissed.`} />
    </Demo>
  );
}

function CloseDemo() {
  const snackbar = useSnackbar();
  return (
    <Demo
      title="With close"
      code={`
snackbar.show('Connection lost', { withClose: true });
snackbar.show('Couldn’t send', { withClose: true, action: { label: 'Retry' } });`}
    >
      <Button variant="tonal" onClick={() => snackbar.show('Connection lost', { withClose: true })}>
        Close only
      </Button>
      <Button
        variant="tonal"
        onClick={() => snackbar.show('Couldn’t send message', { withClose: true, action: { label: 'Retry' } })}
      >
        Action and close
      </Button>
    </Demo>
  );
}

function LongDemo() {
  const snackbar = useSnackbar();
  return (
    <Demo
      title="Long text"
      code={`
snackbar.show(
  'Your September statement is ready. It includes all card and account activity up to the 30th.',
  { withClose: true, duration: 'long' },
);`}
    >
      <Button
        variant="outlined"
        onClick={() =>
          snackbar.show(
            'Your September statement is ready. It includes all card and account activity up to the 30th.',
            { withClose: true, duration: 'long' },
          )
        }
      >
        Show two lines
      </Button>
    </Demo>
  );
}

function StackedDemo() {
  const snackbar = useSnackbar();
  return (
    <Demo
      title="Stacked action"
      code={`
snackbar.show('Your statement is ready to download', {
  stacked: true,
  action: { label: 'Open statement' },
});`}
    >
      <Button
        variant="outlined"
        onClick={() =>
          snackbar.show('Your statement is ready to download', {
            stacked: true,
            withClose: true,
            action: { label: 'Open statement' },
          })
        }
      >
        Long action label
      </Button>
    </Demo>
  );
}

function QueueDemo() {
  const snackbar = useSnackbar();
  const [ids, setIds] = useState<string[]>([]);
  return (
    <Demo
      title="Queued"
      code={`
// One at a time, first in, first out.
['Invoice 1 sent', 'Invoice 2 sent', 'Invoice 3 sent'].forEach((m) =>
  snackbar.show(m, { timeout: 2000 }),
);

// Dismiss one programmatically.
const id = snackbar.show('Uploading…', { duration: 'indefinite' });
snackbar.close(id);`}
    >
      <div {...stylex.props(s.buttons)}>
        <Button
          variant="tonal"
          onClick={() =>
            ['Invoice 1 sent', 'Invoice 2 sent', 'Invoice 3 sent'].forEach((m) => snackbar.show(m, { timeout: 2000 }))
          }
        >
          Queue three
        </Button>
        <Button
          variant="text"
          onClick={() => setIds((list) => [...list, snackbar.show('Uploading receipts…', { duration: 'indefinite' })])}
        >
          Show indefinite
        </Button>
        <Button
          variant="text"
          disabled={ids.length === 0}
          onClick={() => {
            ids.forEach((id) => snackbar.close(id));
            setIds([]);
          }}
        >
          Close from code
        </Button>
      </div>
    </Demo>
  );
}

function SurfaceList() {
  const [closed, setClosed] = useState<string[]>([]);
  const close = (key: string) => () => setClosed((list) => [...list, key]);
  const open = (key: string) => !closed.includes(key);
  return (
    <div {...stylex.props(s.surfaces)}>
      <Snackbar>Payment scheduled</Snackbar>
      <Snackbar action={<SnackbarAction>Undo</SnackbarAction>}>Conversation archived</Snackbar>
      {open('retry') && (
        <Snackbar action={<SnackbarAction>Retry</SnackbarAction>} onClose={close('retry')}>
          Couldn’t send message
        </Snackbar>
      )}
      {open('two') && (
        <Snackbar twoLine onClose={close('two')}>
          Your September statement is ready. It includes all card and account activity.
        </Snackbar>
      )}
      {open('stacked') && (
        <Snackbar stacked action={<SnackbarAction>Open statement</SnackbarAction>} onClose={close('stacked')}>
          Your statement is ready to download
        </Snackbar>
      )}
      {closed.length > 0 && (
        <Button variant="text" size="small" onClick={() => setClosed([])}>
          Bring them back
        </Button>
      )}
    </div>
  );
}

function Demos() {
  return (
    <>
      <Section
        title="Showing snackbars"
        description="Wrap the app in SnackbarProvider and call useSnackbar().show(). Without an action a snackbar leaves after 4 s; with one it waits."
      >
        <PlainDemo />
        <ActionDemo />
        <CloseDemo />
        <LongDemo />
        <StackedDemo />
        <QueueDemo />
      </Section>

      <Section
        title="Surfaces"
        description="The static Snackbar renders in place, for layouts that manage their own messages."
      >
        <Demo
          wide
          code={`
<Snackbar>Payment scheduled</Snackbar>
<Snackbar action={<SnackbarAction>Undo</SnackbarAction>}>Conversation archived</Snackbar>
<Snackbar action={<SnackbarAction>Retry</SnackbarAction>} onClose={dismiss}>Couldn’t send message</Snackbar>
<Snackbar twoLine onClose={dismiss}>Two lines of supporting text …</Snackbar>
<Snackbar stacked action={<SnackbarAction>Open statement</SnackbarAction>}>Your statement is ready</Snackbar>`}
        >
          <SurfaceList />
        </Demo>
      </Section>
    </>
  );
}

export default function SnackbarPage() {
  return (
    <SnackbarProvider>
      <Page
        title="Snackbar"
        summary="Snackbars show short updates about app processes at the bottom of the screen. They leave on their own, can carry one action, and queue up one at a time."
      >
        <Demos />
      </Page>
    </SnackbarProvider>
  );
}
