import { Suspense, createElement, useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { IconButton, List, ListItem, ModalSideSheet, TopAppBar, typescale } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { GROUPS, PAGES, PAGE_COMPONENTS, pageById } from './routes.ts';
import { ThemePanel } from './ThemePanel.tsx';
import { ThemeRoot, useTheme } from './theme.tsx';
import { Home } from './Home.tsx';
import { Icon } from './ui/Icon.tsx';
import { useHashRoute } from './ui/useHashRoute.ts';
import { useMediaQuery } from './ui/useMediaQuery.ts';

const NAV_WIDTH = 280;

const s = stylex.create({
  shell: {
    display: 'flex',
    height: '100%',
    backgroundColor: color.surface,
    color: color.onSurface,
  },
  nav: {
    width: NAV_WIDTH,
    flexShrink: 0,
    overflowY: 'auto',
    backgroundColor: color.surfaceContainerLow,
    paddingBlock: 12,
  },
  brand: { margin: 0, paddingInline: 24, paddingBlock: 16, color: color.onSurface },
  groupLabel: { margin: 0, paddingInline: 24, paddingTop: 16, paddingBottom: 4, color: color.onSurfaceVariant },
  main: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  scroll: { flexGrow: 1, overflowY: 'auto' },
  content: { maxWidth: 1200, marginInline: 'auto', paddingInline: 24, paddingTop: 24 },
  missing: { color: color.onSurfaceVariant },
});

/** The navigation: home, then every page by group. */
function Nav({ current, onNavigate }: { current: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Components">
      <p {...stylex.props(typescale.titleLarge, s.brand)}>M3 Expressive</p>
      <List aria-label="Overview">
        <ListItem href="#/" selected={current === ''} leading={<Icon name="home" />} onClick={onNavigate}>
          Overview
        </ListItem>
      </List>
      {GROUPS.map((group) => (
        <div key={group}>
          <p {...stylex.props(typescale.titleSmall, s.groupLabel)}>{group}</p>
          <List aria-label={group}>
            {PAGES.filter((p) => p.group === group).map((p) => (
              <ListItem
                key={p.id}
                href={`#/${p.id}`}
                selected={current === p.id}
                leading={<Icon name={p.icon} />}
                onClick={onNavigate}
              >
                {p.title}
              </ListItem>
            ))}
          </List>
        </div>
      ))}
    </nav>
  );
}

function Shell() {
  const route = useHashRoute();
  const wide = useMediaQuery('(min-width: 1000px)');
  const [navOpen, setNavOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const { settings, update } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const info = pageById(route);
  const Page = route ? PAGE_COMPONENTS.get(route) : undefined;

  // A new page starts at the top.
  useEffect(() => {
    const toTop = () => scrollRef.current?.scrollTo({ top: 0 });
    window.addEventListener('hashchange', toTop);
    return () => window.removeEventListener('hashchange', toTop);
  }, []);

  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const dark = settings.mode === 'dark' || (settings.mode === 'system' && systemDark);

  return (
    <div {...stylex.props(s.shell)}>
      {wide && (
        <aside {...stylex.props(s.nav)}>
          <Nav current={route} />
        </aside>
      )}
      <div {...stylex.props(s.main)}>
        <TopAppBar
          headline={info?.title ?? (route ? 'Not found' : 'Overview')}
          scrollTarget={scrollRef}
          navigationIcon={
            wide ? undefined : (
              <IconButton aria-label="Open navigation" onClick={() => setNavOpen(true)}>
                <Icon name="menu" />
              </IconButton>
            )
          }
          actions={
            <>
              <IconButton
                aria-label={dark ? 'Use light theme' : 'Use dark theme'}
                onClick={() => update({ mode: dark ? 'light' : 'dark' })}
              >
                <Icon name={dark ? 'light_mode' : 'dark_mode'} />
              </IconButton>
              <IconButton aria-label="Theme settings" onClick={() => setThemeOpen(true)}>
                <Icon name="palette" />
              </IconButton>
            </>
          }
        />
        <div ref={scrollRef} {...stylex.props(s.scroll)}>
          <main {...stylex.props(s.content)}>
            {route === '' ? (
              <Home />
            ) : Page ? (
              // Module-level lazy components (stable identity), picked by route.
              <Suspense fallback={null}>{createElement(Page)}</Suspense>
            ) : (
              <p {...stylex.props(typescale.bodyLarge, s.missing)}>
                {info ? `${info.title} is coming soon.` : `No page called "${route}".`}
              </p>
            )}
          </main>
        </div>
      </div>
      <ModalSideSheet open={!wide && navOpen} onOpenChange={setNavOpen} side="start" aria-label="Navigation">
        <Nav current={route} onNavigate={() => setNavOpen(false)} />
      </ModalSideSheet>
      <ModalSideSheet
        open={themeOpen}
        onOpenChange={setThemeOpen}
        headline="Theme"
        close={
          <IconButton aria-label="Close theme settings" onClick={() => setThemeOpen(false)}>
            <Icon name="close" />
          </IconButton>
        }
      >
        <ThemePanel />
      </ModalSideSheet>
    </div>
  );
}

export function App() {
  return (
    <ThemeRoot>
      <Shell />
    </ThemeRoot>
  );
}
