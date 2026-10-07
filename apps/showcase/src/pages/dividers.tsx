import * as stylex from '@stylexjs/stylex';
import { Divider, IconButton, typescale } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { shape } from '@m3x/react/tokens/shape.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const s = stylex.create({
  // A surface to draw the dividers on, so the insets read against an edge.
  surface: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    borderRadius: shape.cornerMedium,
    backgroundColor: color.surface,
    paddingBlock: 8,
  },
  caption: { margin: 0, paddingInline: 16, paddingBlock: 12, color: color.onSurfaceVariant },
  // Rows with a 56px leading slot, so the start inset (16px) lines up with the text.
  row: { display: 'flex', alignItems: 'center', gap: 16, minHeight: 56, paddingInline: 16, color: color.onSurface },
  rowIcon: { display: 'inline-flex', color: color.onSurfaceVariant },
  rowText: { display: 'flex', flexDirection: 'column', flexGrow: 1 },
  rowSupport: { color: color.onSurfaceVariant },
  amount: { color: color.onSurface },
  vertical: {
    display: 'flex',
    alignItems: 'stretch',
    height: 120,
    width: '100%',
    borderRadius: shape.cornerMedium,
    backgroundColor: color.surface,
  },
  column: {
    flexGrow: 1,
    flexBasis: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    color: color.onSurface,
  },
  label: { color: color.onSurfaceVariant },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    height: 56,
    paddingInline: 8,
    borderRadius: shape.cornerFull,
    backgroundColor: color.surfaceContainer,
  },
  toolbarDivider: { height: 24, alignSelf: 'center', marginInline: 4 },
  // The start inset (16px) moved to the text: 16px padding + 24px icon + 16px gap.
  textInset: { paddingInlineStart: 56 },
});

const TRANSACTIONS = [
  { icon: 'storefront', name: 'Office supplies', when: 'Today', amount: '−£84.20' },
  { icon: 'local_shipping', name: 'Courier', when: 'Yesterday', amount: '−£12.50' },
  { icon: 'payments', name: 'Invoice 1042 paid', when: 'Monday', amount: '+£2,400.00' },
];

export default function DividersPage() {
  return (
    <Page
      title="Dividers"
      summary="Dividers are thin lines that group content in lists or other containers. Use them sparingly: spacing alone often separates content well enough."
    >
      <Section title="Horizontal" description="Full width, inset from the start, or inset on both sides (middle).">
        <Demo title="Full width" column code={`<Divider />`}>
          <div {...stylex.props(s.surface)}>
            <p {...stylex.props(typescale.bodyMedium, s.caption)}>Content above</p>
            <Divider />
            <p {...stylex.props(typescale.bodyMedium, s.caption)}>Content below</p>
          </div>
        </Demo>
        <Demo title="Start inset" column code={`<Divider inset="start" />`}>
          <div {...stylex.props(s.surface)}>
            <p {...stylex.props(typescale.bodyMedium, s.caption)}>Content above</p>
            <Divider inset="start" />
            <p {...stylex.props(typescale.bodyMedium, s.caption)}>Content below</p>
          </div>
        </Demo>
        <Demo title="Middle inset" column code={`<Divider inset="middle" />`}>
          <div {...stylex.props(s.surface)}>
            <p {...stylex.props(typescale.bodyMedium, s.caption)}>Content above</p>
            <Divider inset="middle" />
            <p {...stylex.props(typescale.bodyMedium, s.caption)}>Content below</p>
          </div>
        </Demo>
        <Demo title="With a subheader" column code={`<Divider subheader="Earlier this week" />`}>
          <div {...stylex.props(s.surface)}>
            <p {...stylex.props(typescale.bodyMedium, s.caption)}>Today’s activity</p>
            <Divider subheader="Earlier this week" />
            <p {...stylex.props(typescale.bodyMedium, s.caption)}>Monday’s activity</p>
          </div>
        </Demo>
      </Section>

      <Section title="Vertical" description="Separate side-by-side content or groups of actions.">
        <Demo
          title="Between columns"
          column
          code={`
<div style={{ display: 'flex', height: 120 }}>
  <Column />
  <Divider orientation="vertical" />
  <Column />
  <Divider orientation="vertical" inset="middle" />
  <Column />
</div>`}
        >
          <div {...stylex.props(s.vertical)}>
            <div {...stylex.props(s.column)}>
              <span {...stylex.props(typescale.titleLarge)}>£12,480</span>
              <span {...stylex.props(typescale.labelMedium, s.label)}>Balance</span>
            </div>
            <Divider orientation="vertical" />
            <div {...stylex.props(s.column)}>
              <span {...stylex.props(typescale.titleLarge)}>£3,120</span>
              <span {...stylex.props(typescale.labelMedium, s.label)}>Money in</span>
            </div>
            <Divider orientation="vertical" inset="middle" />
            <div {...stylex.props(s.column)}>
              <span {...stylex.props(typescale.titleLarge)}>£1,845</span>
              <span {...stylex.props(typescale.labelMedium, s.label)}>Money out</span>
            </div>
          </div>
        </Demo>
        <Demo
          title="Between groups of actions"
          code={`
<IconButton aria-label="Bold"><Icon name="format_bold" /></IconButton>
<IconButton aria-label="Italic"><Icon name="format_italic" /></IconButton>
<Divider orientation="vertical" sx={styles.short} />
<IconButton aria-label="Bulleted list"><Icon name="format_list_bulleted" /></IconButton>`}
        >
          <div {...stylex.props(s.toolbar)}>
            <IconButton aria-label="Bold">
              <Icon name="format_bold" />
            </IconButton>
            <IconButton aria-label="Italic">
              <Icon name="format_italic" />
            </IconButton>
            <IconButton aria-label="Underline">
              <Icon name="format_underlined" />
            </IconButton>
            <Divider orientation="vertical" sx={s.toolbarDivider} />
            <IconButton aria-label="Bulleted list">
              <Icon name="format_list_bulleted" />
            </IconButton>
            <IconButton aria-label="Numbered list">
              <Icon name="format_list_numbered" />
            </IconButton>
            <Divider orientation="vertical" sx={s.toolbarDivider} />
            <IconButton aria-label="Insert link">
              <Icon name="link" />
            </IconButton>
          </div>
        </Demo>
      </Section>

      <Section
        title="In context"
        description="Between list rows, a start-inset divider can line up with the text instead of the icons: widen its inset with sx."
      >
        <Demo
          wide
          column
          code={`
{transactions.map((t, i) => (
  <Fragment key={t.name}>
    {i > 0 && <Divider inset="start" sx={styles.textInset} />}  // paddingInlineStart: 56
    <Row {...t} />
  </Fragment>
))}`}
        >
          <div {...stylex.props(s.surface)}>
            {TRANSACTIONS.map((t, i) => (
              <div key={t.name}>
                {i > 0 && <Divider inset="start" sx={s.textInset} />}
                <div {...stylex.props(s.row)}>
                  <span {...stylex.props(s.rowIcon)}>
                    <Icon name={t.icon} />
                  </span>
                  <span {...stylex.props(s.rowText)}>
                    <span {...stylex.props(typescale.bodyLarge)}>{t.name}</span>
                    <span {...stylex.props(typescale.bodyMedium, s.rowSupport)}>{t.when}</span>
                  </span>
                  <span {...stylex.props(typescale.labelLarge, s.amount)}>{t.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </Demo>
      </Section>
    </Page>
  );
}
