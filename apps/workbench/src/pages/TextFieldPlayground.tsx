import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { M3Provider, TextField, typescale, type ColorSchemeMode, type TextFieldVariant } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import assets from '../../../../figma/text-field/assets.json';

const s = stylex.create({
  page: {
    minHeight: '100vh',
    backgroundColor: color.surface,
    color: color.onSurface,
    padding: 32,
    display: 'grid',
    gap: 24,
    alignContent: 'start',
  },
  panel: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 20,
    alignItems: 'end',
    padding: 16,
    borderRadius: 16,
    backgroundColor: color.surfaceContainer,
  },
  stage: { display: 'flex', flexWrap: 'wrap', gap: 32, padding: 32, borderRadius: 16, backgroundColor: color.surface },
  wide: { width: 280 },
  muted: { color: color.onSurfaceVariant },
});

const Icon = ({ name }: { name: 'search' | 'cancel' }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path transform={`translate(${assets[name].offset.join(' ')})`} d={assets[name].d} />
  </svg>
);

/** Filled / outlined text fields: label float, icons, supporting / error text, disabled. */
export function TextFieldPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [variant, setVariant] = useState<TextFieldVariant>('filled');
  const [disabled, setDisabled] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('ada@');
  const [query, setQuery] = useState('');
  const emailError = email !== '' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const field = { font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8 } as const;
  return (
    <M3Provider colorScheme={scheme}>
      <main {...stylex.props(s.page)}>
        <p style={{ margin: 0 }}>
          <a href="/" style={{ color: 'inherit' }}>
            ← all
          </a>
        </p>
        <h1 {...stylex.props(typescale.headlineMedium)} style={{ margin: 0 }}>
          Text field playground
        </h1>
        <section {...stylex.props(s.panel)}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>colour scheme</span>
            <select value={scheme} onChange={(e) => setScheme(e.target.value as ColorSchemeMode)} style={field}>
              <option>light</option>
              <option>dark</option>
              <option>system</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>variant</span>
            <select value={variant} onChange={(e) => setVariant(e.target.value as TextFieldVariant)} style={field}>
              <option>filled</option>
              <option>outlined</option>
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} /> disabled
          </label>
        </section>
        <section {...stylex.props(s.stage)}>
          <TextField
            variant={variant}
            label="Company name"
            value={name}
            onValueChange={setName}
            supportingText="As registered at Companies House"
            disabled={disabled}
            sx={s.wide}
          />
          <TextField
            variant={variant}
            label="Email"
            type="email"
            value={email}
            onValueChange={setEmail}
            error={emailError}
            errorText="Enter a valid email address"
            supportingText="We'll send the statement here"
            disabled={disabled}
            sx={s.wide}
          />
          <TextField
            variant={variant}
            label="Search payees"
            placeholder="Name or sort code"
            leadingIcon={<Icon name="search" />}
            trailingIcon={
              query ? (
                <button
                  type="button"
                  aria-label="Clear"
                  onClick={() => setQuery('')}
                  style={{
                    display: 'flex',
                    cursor: 'pointer',
                    padding: 0,
                    border: 0,
                    background: 'none',
                    color: 'inherit',
                  }}
                >
                  <Icon name="cancel" />
                </button>
              ) : undefined
            }
            value={query}
            onValueChange={setQuery}
            disabled={disabled}
            sx={s.wide}
          />
        </section>
      </main>
    </M3Provider>
  );
}
