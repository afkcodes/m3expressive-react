import * as stylex from '@stylexjs/stylex';
import { Card, typescale } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { GROUPS, PAGES } from './routes.ts';
import { Icon } from './ui/Icon.tsx';

const s = stylex.create({
  page: { display: 'flex', flexDirection: 'column', gap: 40, paddingBottom: 96 },
  hero: { display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 24 },
  title: { margin: 0, color: color.onSurface },
  text: { margin: 0, color: color.onSurfaceVariant, maxWidth: 760 },
  group: { display: 'flex', flexDirection: 'column', gap: 16 },
  grid: { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' },
  link: { textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' },
  card: { height: '100%' },
  cardBody: { display: 'flex', flexDirection: 'column', gap: 8, padding: 16 },
  cardIcon: { color: color.primary },
});

/** Overview: what the library is, and a card per page. */
export function Home() {
  return (
    <div {...stylex.props(s.page)}>
      <header {...stylex.props(s.hero)}>
        <h1 {...stylex.props(typescale.displayMedium, s.title)}>Material 3 Expressive for React</h1>
        <p {...stylex.props(typescale.bodyLarge, s.text)}>
          Every component of the M3 Expressive kit, built on Base UI and StyleX, matched pixel for pixel against the
          Figma kit and animated with the Compose motion springs. Use the palette button to try dynamic colour (from a
          seed or an image), dark mode, contrast levels and the standard motion scheme.
        </p>
      </header>
      {GROUPS.map((group) => (
        <section key={group} {...stylex.props(s.group)}>
          <h2 {...stylex.props(typescale.headlineSmall, s.title)}>{group}</h2>
          <div {...stylex.props(s.grid)}>
            {PAGES.filter((p) => p.group === group).map((p) => (
              <a key={p.id} href={`#/${p.id}`} {...stylex.props(s.link)}>
                <Card variant="filled" sx={s.card}>
                  <div {...stylex.props(s.cardBody)}>
                    <span {...stylex.props(s.cardIcon)}>
                      <Icon name={p.icon} size={28} />
                    </span>
                    <span {...stylex.props(typescale.titleMedium, s.title)}>{p.title}</span>
                    <span {...stylex.props(typescale.bodyMedium, s.text)}>{p.summary}</span>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
