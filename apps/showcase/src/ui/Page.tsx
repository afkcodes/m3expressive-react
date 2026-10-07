import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button, IconButton, typescale } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';
import { Icon } from './Icon.tsx';

const s = stylex.create({
  page: { display: 'flex', flexDirection: 'column', gap: 48, paddingBottom: 96 },
  header: { display: 'flex', flexDirection: 'column', gap: 8 },
  title: { margin: 0, color: color.onSurface },
  summary: { margin: 0, color: color.onSurfaceVariant, maxWidth: 720 },
  section: { display: 'flex', flexDirection: 'column', gap: 16 },
  sectionText: { display: 'flex', flexDirection: 'column', gap: 4 },
  demos: { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))' },
  wide: { gridColumn: '1 / -1' },
  demo: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: shape.cornerLarge,
    backgroundColor: color.surfaceContainerLow,
    overflow: 'hidden',
    minWidth: 0,
  },
  demoTitle: { margin: 0, paddingBlock: 16, paddingInline: 20, color: color.onSurfaceVariant },
  stage: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingInline: 24,
    paddingBottom: 24,
    flexGrow: 1,
    minHeight: 120,
  },
  // No wrapping in a column: Chrome sizes a wrapping column's children too tall.
  stageColumn: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' },
  stageStart: { justifyContent: 'flex-start' },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingInline: 8,
    paddingBlock: 4,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: color.outlineVariant,
  },
  code: {
    margin: 0,
    padding: 20,
    overflowX: 'auto',
    backgroundColor: color.surfaceContainerHighest,
    color: color.onSurface,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 13,
    lineHeight: 1.6,
  },
});

/** A showcase page: title, summary, then sections. */
export function Page({ title, summary, children }: { title: string; summary: ReactNode; children: ReactNode }) {
  return (
    <article {...stylex.props(s.page)}>
      <header {...stylex.props(s.header)}>
        <h1 {...stylex.props(typescale.displaySmall, s.title)}>{title}</h1>
        <p {...stylex.props(typescale.bodyLarge, s.summary)}>{summary}</p>
      </header>
      {children}
    </article>
  );
}

/** A titled group of demos laid out in a responsive grid. */
export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section {...stylex.props(s.section)}>
      <div {...stylex.props(s.sectionText)}>
        <h2 {...stylex.props(typescale.headlineSmall, s.title)}>{title}</h2>
        {description != null && <p {...stylex.props(typescale.bodyMedium, s.summary)}>{description}</p>}
      </div>
      <div {...stylex.props(s.demos)}>{children}</div>
    </section>
  );
}

export interface DemoProps {
  title?: string;
  /** The example's source, shown under "Code". */
  code?: string;
  /** Span the whole row (wide components: app bars, carousels, tables of variants). */
  wide?: boolean;
  /** Stack children vertically, stretched (text fields, lists, sliders). */
  column?: boolean;
  /** Align children to the start instead of centring them. */
  start?: boolean;
  children: ReactNode;
}

/** One live example: a stage with the real components and its code. */
export function Demo({ title, code, wide = false, column = false, start = false, children }: DemoProps) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div {...stylex.props(s.demo, wide && s.wide)}>
      {title != null && <h3 {...stylex.props(typescale.titleSmall, s.demoTitle)}>{title}</h3>}
      <div {...stylex.props(s.stage, column && s.stageColumn, start && s.stageStart)}>{children}</div>
      {code != null && (
        <>
          <div {...stylex.props(s.footer)}>
            <Button
              variant="text"
              size="small"
              icon={<Icon name="code" size={20} />}
              aria-expanded={showCode}
              onClick={() => setShowCode((v) => !v)}
            >
              {showCode ? 'Hide code' : 'Show code'}
            </Button>
            <IconButton aria-label={copied ? 'Copied' : 'Copy code'} size="small" onClick={() => void copy()}>
              <Icon name={copied ? 'check' : 'content_copy'} size={20} />
            </IconButton>
          </div>
          {showCode && (
            <pre {...stylex.props(s.code)}>
              <code>{code.trim()}</code>
            </pre>
          )}
        </>
      )}
    </div>
  );
}
