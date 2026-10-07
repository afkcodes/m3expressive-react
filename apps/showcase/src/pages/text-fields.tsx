import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { IconButton, TextField, typescale, type TextFieldVariant } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const VARIANTS = ['filled', 'outlined'] as const satisfies readonly TextFieldVariant[];
const MAX_BIO = 80;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const s = stylex.create({
  full: { width: '100%' },
  counter: { display: 'flex', justifyContent: 'space-between', gap: 16 },
  tabular: { fontVariantNumeric: 'tabular-nums', flexShrink: 0 },
  readout: { margin: 0, color: color.onSurfaceVariant },
});

const title = (v: string) => v[0]!.toUpperCase() + v.slice(1);

/** Supporting text with a live character count at the end. */
function Counted({ text, count, max }: { text: string; count: number; max: number }) {
  return (
    <span {...stylex.props(s.counter)}>
      <span>{text}</span>
      <span {...stylex.props(s.tabular)}>
        {count} / {max}
      </span>
    </span>
  );
}

function ControlledDemo() {
  const [name, setName] = useState('');
  return (
    <Demo
      title="Controlled"
      column
      code={`
const [name, setName] = useState('');

<TextField label="Company name" value={name} onValueChange={setName} />`}
    >
      <TextField
        label="Company name"
        value={name}
        onValueChange={setName}
        supportingText="As registered at Companies House"
        sx={s.full}
      />
      <p {...stylex.props(typescale.bodyMedium, s.readout)}>Value: {name === '' ? '(empty)' : `“${name}”`}</p>
    </Demo>
  );
}

function ClearableDemo() {
  const [query, setQuery] = useState('Northwind');
  return (
    <Demo
      title="Actionable trailing icon"
      column
      start
      code={`
<TextField
  label="Search payees"
  leadingIcon={<Icon name="search" />}
  trailingIcon={
    query ? (
      <IconButton aria-label="Clear" onClick={() => setQuery('')}>
        <Icon name="cancel" />
      </IconButton>
    ) : undefined
  }
  value={query}
  onValueChange={setQuery}
/>`}
    >
      {VARIANTS.map((variant) => (
        <TextField
          key={variant}
          variant={variant}
          label="Search payees"
          placeholder="Name or sort code"
          leadingIcon={<Icon name="search" />}
          trailingIcon={
            query ? (
              <IconButton aria-label="Clear" onClick={() => setQuery('')}>
                <Icon name="cancel" />
              </IconButton>
            ) : undefined
          }
          value={query}
          onValueChange={setQuery}
          sx={s.full}
        />
      ))}
    </Demo>
  );
}

function PasswordDemo() {
  const [visible, setVisible] = useState(false);
  return (
    <Demo
      title="Password with a visibility toggle"
      column
      code={`
const [visible, setVisible] = useState(false);

<TextField
  variant="outlined"
  label="Password"
  type={visible ? 'text' : 'password'}
  autoComplete="new-password"
  trailingIcon={
    <IconButton
      aria-label="Show password"
      aria-pressed={visible}
      onClick={() => setVisible((v) => !v)}
    >
      <Icon name={visible ? 'visibility_off' : 'visibility'} />
    </IconButton>
  }
/>`}
    >
      <TextField
        variant="outlined"
        label="Password"
        type={visible ? 'text' : 'password'}
        autoComplete="new-password"
        defaultValue="correct horse"
        supportingText="At least 12 characters"
        trailingIcon={
          <IconButton aria-label="Show password" aria-pressed={visible} onClick={() => setVisible((v) => !v)}>
            <Icon name={visible ? 'visibility_off' : 'visibility'} />
          </IconButton>
        }
        sx={s.full}
      />
    </Demo>
  );
}

function ValidationDemo() {
  const [email, setEmail] = useState('ada@');
  const invalid = email !== '' && !EMAIL.test(email);
  return (
    <Demo
      title="Validation while typing"
      column
      start
      code={`
const [email, setEmail] = useState('');
const invalid = email !== '' && !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email);

<TextField
  label="Email"
  type="email"
  value={email}
  onValueChange={setEmail}
  error={invalid}
  errorText="Enter a valid email address"
  supportingText="We'll send the statement here"
/>`}
    >
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onValueChange={setEmail}
        error={invalid}
        errorText="Enter a valid email address"
        supportingText="We'll send the statement here"
        sx={s.full}
      />
    </Demo>
  );
}

function CounterDemo() {
  const [bio, setBio] = useState('Coffee roaster, Bristol');
  const over = bio.length > MAX_BIO;
  return (
    <Demo
      title="Character count"
      column
      code={`
const MAX = 80;
const [bio, setBio] = useState('');
const over = bio.length > MAX;

<TextField
  variant="outlined"
  label="Business description"
  value={bio}
  onValueChange={setBio}
  error={over}
  supportingText={
    <span style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>{over ? 'Too long' : 'Shown on your invoices'}</span>
      <span>{bio.length} / {MAX}</span>
    </span>
  }
/>`}
    >
      <TextField
        variant="outlined"
        label="Business description"
        value={bio}
        onValueChange={setBio}
        error={over}
        supportingText={
          <Counted text={over ? 'Too long' : 'Shown on your invoices'} count={bio.length} max={MAX_BIO} />
        }
        sx={s.full}
      />
    </Demo>
  );
}

export default function TextFieldsPage() {
  return (
    <Page
      title="Text fields"
      summary="Text fields let people enter and edit text. Filled fields have more emphasis; outlined fields suit dense forms. The label floats on a spring when the field gains focus or a value."
    >
      <Section
        title="Variants"
        description="Click a field: the label floats, the indicator or outline thickens to 3px."
      >
        {VARIANTS.map((variant) => (
          <Demo
            key={variant}
            title={title(variant)}
            column
            code={`<TextField variant="${variant}" label="Label" supportingText="Supporting text" />`}
          >
            <TextField variant={variant} label="Label" supportingText="Supporting text" sx={s.full} />
            <TextField variant={variant} label="With a value" defaultValue="Input text" sx={s.full} />
          </Demo>
        ))}
        <ControlledDemo />
      </Section>

      <Section title="Icons" description="24px icons in 48px slots. Pass an IconButton when the icon does something.">
        <Demo
          title="Leading and trailing"
          column
          code={`
<TextField label="Amount" leadingIcon={<Icon name="payments" />} />
<TextField label="Sort code" trailingIcon={<Icon name="info" />} />
<TextField
  variant="outlined"
  label="Branch"
  leadingIcon={<Icon name="location_on" />}
  trailingIcon={<Icon name="expand_more" />}
/>`}
        >
          <TextField label="Amount" leadingIcon={<Icon name="payments" />} defaultValue="1,250.00" sx={s.full} />
          <TextField label="Sort code" trailingIcon={<Icon name="info" />} sx={s.full} />
          <TextField
            variant="outlined"
            label="Branch"
            leadingIcon={<Icon name="location_on" />}
            trailingIcon={<Icon name="expand_more" />}
            sx={s.full}
          />
        </Demo>
        <ClearableDemo />
        <PasswordDemo />
      </Section>

      <Section
        title="Label and placeholder"
        description="A placeholder shows only while focused, unless the label stays floated."
      >
        <Demo title="Placeholder" column code={`<TextField label="Reference" placeholder="e.g. INV-2041" />`}>
          {VARIANTS.map((variant) => (
            <TextField key={variant} variant={variant} label="Reference" placeholder="e.g. INV-2041" sx={s.full} />
          ))}
        </Demo>
        <Demo
          title="Always float the label"
          column
          code={`<TextField label="Reference" placeholder="e.g. INV-2041" alwaysFloatLabel />`}
        >
          {VARIANTS.map((variant) => (
            <TextField
              key={variant}
              variant={variant}
              label="Reference"
              placeholder="e.g. INV-2041"
              alwaysFloatLabel
              sx={s.full}
            />
          ))}
        </Demo>
        <Demo
          title="No label"
          column
          code={`<TextField variant="outlined" placeholder="Search" aria-label="Search" />`}
        >
          {VARIANTS.map((variant) => (
            <TextField
              key={variant}
              variant={variant}
              placeholder="Search transactions"
              aria-label="Search transactions"
              leadingIcon={<Icon name="search" />}
              sx={s.full}
            />
          ))}
        </Demo>
      </Section>

      <Section
        title="Supporting text and errors"
        description="Supporting text sits 4px under the field; `errorText` replaces it while `error` is set."
      >
        <ValidationDemo />
        <Demo
          title="Error"
          column
          code={`
<TextField
  label="VAT number"
  defaultValue="GB12"
  error
  errorText="VAT numbers have 9 digits"
/>`}
        >
          {VARIANTS.map((variant) => (
            <TextField
              key={variant}
              variant={variant}
              label="VAT number"
              defaultValue="GB12"
              error
              errorText="VAT numbers have 9 digits"
              sx={s.full}
            />
          ))}
        </Demo>
        <CounterDemo />
      </Section>

      <Section title="Disabled" description="Disabled fields dim their content to 38% and can't be focused.">
        {VARIANTS.map((variant) => (
          <Demo
            key={variant}
            title={title(variant)}
            column
            code={`<TextField variant="${variant}" label="Account number" defaultValue="12345678" disabled />`}
          >
            <TextField
              variant={variant}
              label="Account number"
              defaultValue="12345678"
              supportingText="Can't be changed"
              leadingIcon={<Icon name="lock" />}
              disabled
              sx={s.full}
            />
            <TextField variant={variant} label="Empty" disabled sx={s.full} />
          </Demo>
        ))}
      </Section>
    </Page>
  );
}
