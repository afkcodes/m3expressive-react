import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Badge,
  ExtendedFab,
  Fab,
  IconButton,
  M3Provider,
  NavigationBar,
  NavigationItem,
  NavigationRail,
  typescale,
  type ColorSchemeMode,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import assets from '../../../../figma/navigation/assets.json';

const s = stylex.create({
  page: { minHeight: '100vh', backgroundColor: color.surface, color: color.onSurface, padding: 32, display: 'grid', gap: 24, alignContent: 'start' },
  panel: { display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'end', padding: 16, borderRadius: 16, backgroundColor: color.surfaceContainer },
  frame: { display: 'flex', height: 560, borderRadius: 16, overflow: 'hidden', backgroundColor: color.surfaceContainerLow },
  content: { flexGrow: 1, padding: 24, color: color.onSurfaceVariant },
  phone: { display: 'flex', flexDirection: 'column', width: 412, height: 320, borderRadius: 16, overflow: 'hidden', backgroundColor: color.surfaceContainerLow },
  muted: { color: color.onSurfaceVariant },
});

type IconName = keyof typeof assets.icons;
const Icon = ({ name }: { name: IconName }) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={assets.icons[name]} />
  </svg>
);
const DESTINATIONS = ['Home', 'Activity', 'Saved', 'Profile'];

/** Navigation bar (vertical / horizontal items) and rail (collapsed ↔ expanded, docked / floating). */
export function NavigationPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [barValue, setBarValue] = useState<unknown>(0);
  const [railValue, setRailValue] = useState<unknown>(0);
  const [expanded, setExpanded] = useState(false);
  const [floating, setFloating] = useState(false);
  const [horizontal, setHorizontal] = useState(false);
  const field = { font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8 } as const;
  const item = (i: number, t: string) => (
    <NavigationItem
      key={t}
      value={i}
      icon={<Icon name="stars-24" />}
      selectedIcon={<Icon name="stars_filled-24" />}
      label={t}
      badge={i === 1 ? <Badge>3</Badge> : i === 2 ? <Badge /> : undefined}
      badgeSize={i === 2 ? 'small' : 'large'}
    />
  );
  return (
    <M3Provider colorScheme={scheme}>
      <main {...stylex.props(s.page)}>
        <p style={{ margin: 0 }}>
          <a href="/" style={{ color: 'inherit' }}>
            ← all
          </a>
        </p>
        <h1 {...stylex.props(typescale.headlineMedium)} style={{ margin: 0 }}>
          Navigation playground
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
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={expanded} onChange={(e) => setExpanded(e.target.checked)} /> expanded rail
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={floating} onChange={(e) => setFloating(e.target.checked)} /> floating
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={horizontal} onChange={(e) => setHorizontal(e.target.checked)} /> horizontal bar items
          </label>
        </section>
        <div {...stylex.props(s.frame)}>
          <NavigationRail
            value={railValue}
            onValueChange={setRailValue}
            expanded={expanded}
            type={floating ? 'floating' : 'docked'}
            aria-label="Main"
            header={
              <>
                <IconButton size="medium" shape="square" aria-label={expanded ? 'Collapse' : 'Expand'} onClick={() => setExpanded((v) => !v)}>
                  <Icon name="menu-24" />
                </IconButton>
                {expanded ? (
                  <ExtendedFab size="small" elevated={false} icon={<Icon name="edit-24" />}>
                    Compose
                  </ExtendedFab>
                ) : (
                  <Fab aria-label="Compose" elevated={false}>
                    <Icon name="edit-24" />
                  </Fab>
                )}
              </>
            }
          >
            {DESTINATIONS.map((t, i) => item(i, t))}
          </NavigationRail>
          <div {...stylex.props(s.content)}>
            <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: '0 0 8px' }}>
              {DESTINATIONS[railValue as number]}
            </h2>
            The menu button toggles the rail: it widens to 220px on the default spatial spring and
            its items switch to rows. A newly selected pill grows from its centre.
          </div>
        </div>
        <div {...stylex.props(s.phone)}>
          <div {...stylex.props(s.content)}>{DESTINATIONS[barValue as number]}</div>
          <NavigationBar value={barValue} onValueChange={setBarValue} itemLayout={horizontal ? 'horizontal' : 'vertical'} aria-label="Bottom">
            {DESTINATIONS.slice(0, horizontal ? 3 : 4).map((t, i) => item(i, t))}
          </NavigationBar>
        </div>
      </main>
    </M3Provider>
  );
}
