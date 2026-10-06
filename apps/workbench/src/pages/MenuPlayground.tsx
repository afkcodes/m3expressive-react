import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Badge,
  Button,
  IconButton,
  M3Provider,
  Menu,
  MenuCheckboxItem,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSurface,
  Submenu,
  typescale,
  type ColorSchemeMode,
  type MenuDensity,
  type MenuVariant,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import menuAssets from '../../../../figma/menu/assets.json';
import listAssets from '../../../../figma/list/assets.json';

const s = stylex.create({
  page: { minHeight: '100vh', backgroundColor: color.surface, color: color.onSurface, padding: 32, display: 'grid', gap: 24, alignContent: 'start' },
  panel: { display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'end', padding: 16, borderRadius: 16, backgroundColor: color.surfaceContainer },
  stage: { display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'start' },
  column: { display: 'grid', gap: 8, justifyItems: 'start', maxWidth: 320 },
  muted: { color: color.onSurfaceVariant },
});

const icons = { ...listAssets.icons, ...menuAssets.icons } as Record<string, string>;
const Icon = ({ name }: { name: string }) => {
  const size = Number(name.split('-').pop());
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="currentColor" aria-hidden style={{ display: 'block' }}>
      <path d={icons[name]} />
    </svg>
  );
};

const Section = ({ title, note, children }: { title: string; note: string; children: ReactNode }) => (
  <section {...stylex.props(s.column)}>
    <h2 {...stylex.props(typescale.titleMedium)} style={{ margin: 0 }}>
      {title}
    </h2>
    <p {...stylex.props(typescale.bodySmall, s.muted)} style={{ margin: 0 }}>
      {note}
    </p>
    {children}
  </section>
);

/** Dropdown menus: groups, section labels, selection, submenus, the three kit styles. */
export function MenuPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [variant, setVariant] = useState<MenuVariant>('standard');
  const [density, setDensity] = useState<MenuDensity>(0);
  const [log, setLog] = useState('—');
  const [sort, setSort] = useState<unknown>('name');
  const [hidden, setHidden] = useState(false);
  const field = { font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8 } as const;
  const leading = (name: string) => (variant === 'baseline' ? <Icon name="content_cut-24" /> : <Icon name={name} />);
  return (
    <M3Provider colorScheme={scheme}>
      <main {...stylex.props(s.page)}>
        <p style={{ margin: 0 }}>
          <a href="/" style={{ color: 'inherit' }}>
            ← all
          </a>
        </p>
        <h1 {...stylex.props(typescale.headlineMedium)} style={{ margin: 0 }}>
          Menu playground
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
            <span {...stylex.props(s.muted)}>style</span>
            <select value={variant} onChange={(e) => setVariant(e.target.value as MenuVariant)} style={field}>
              <option>standard</option>
              <option>vibrant</option>
              <option>baseline</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>density (baseline)</span>
            <select value={density} onChange={(e) => setDensity(Number(e.target.value) as MenuDensity)} style={field} disabled={variant !== 'baseline'}>
              <option value={0}>0</option>
              <option value={-2}>-2</option>
              <option value={-4}>-4</option>
            </select>
          </label>
          <span {...stylex.props(typescale.bodyMedium, s.muted)}>Last action: {log}</span>
        </section>
        <div {...stylex.props(s.stage)}>
          <Section title="Actions" note="Groups 2px apart; arrows / Home / End move, Enter runs, Escape closes. Opens with scale 0.8 → 1 on the fast spatial spring.">
            <Menu trigger={<Button variant="tonal">Edit</Button>} variant={variant} density={density}>
              <MenuGroup>
                <MenuItem leading={leading('stars-20')} trailingText="Ctrl+X" onClick={() => setLog('Cut')}>
                  Cut
                </MenuItem>
                <MenuItem leading={leading('stars-20')} trailingText="Ctrl+C" onClick={() => setLog('Copy')}>
                  Copy
                </MenuItem>
                <MenuItem leading={leading('stars-20')} trailingText="Ctrl+V" onClick={() => setLog('Paste')}>
                  Paste
                </MenuItem>
              </MenuGroup>
              <MenuGroup>
                <MenuItem leading={leading('stars-20')} trailing={variant === 'baseline' ? undefined : <Badge>New</Badge>} onClick={() => setLog('Select all')}>
                  Select all
                </MenuItem>
                <MenuItem leading={leading('stars-20')} disabled>
                  Delete
                </MenuItem>
              </MenuGroup>
            </Menu>
          </Section>
          <Section title="Selection" note="Radio and checkbox items keep the menu open; the chosen item takes the selected shape (12px corners) and container.">
            <Menu trigger={<Button variant="outlined">Sort &amp; filter</Button>} variant={variant} density={density}>
              <MenuRadioGroup label={variant === 'baseline' ? undefined : 'Sort by'} value={sort} onValueChange={setSort}>
                {['name', 'date', 'size'].map((v) => (
                  <MenuRadioItem key={v} value={v} leading={leading('stars-20')}>
                    {v[0]!.toUpperCase() + v.slice(1)}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
              {variant === 'baseline' && <MenuDivider />}
              <MenuGroup>
                <MenuCheckboxItem checked={hidden} onCheckedChange={setHidden} leading={leading('stars-20')}>
                  Show hidden files
                </MenuCheckboxItem>
              </MenuGroup>
            </Menu>
          </Section>
          <Section title="Submenu" note="The trigger item keeps its hover layer while its submenu is open (kit “Active”).">
            <Menu
              trigger={
                <IconButton aria-label="More">
                  <Icon name="more_vert-20" />
                </IconButton>
              }
              variant={variant}
              density={density}
            >
              <MenuItem leading={leading('stars-20')} onClick={() => setLog('Rename')}>
                Rename
              </MenuItem>
              <Submenu
                leading={leading('stars-20')}
                trailing={<Icon name={variant === 'baseline' ? 'arrow_right-24' : 'arrow_right-20'} />}
                items={['Email', 'Link', 'Message'].map((t) => (
                  <MenuItem key={t} onClick={() => setLog(`Share → ${t}`)}>
                    {t}
                  </MenuItem>
                ))}
              >
                Share
              </Submenu>
              <MenuItem leading={leading('stars-20')} onClick={() => setLog('Archive')}>
                Archive
              </MenuItem>
            </Menu>
          </Section>
          <Section title="Static surfaces" note="MenuSurface renders the same parts without a popup (e.g. inside your own popover).">
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {(['standard', 'vibrant'] as const).map((v) => (
                <MenuSurface key={v} variant={v} width={200}>
                  <MenuGroup label={v === 'standard' ? 'Standard' : 'Vibrant'}>
                    <MenuItem leading={<Icon name="stars-20" />}>Item</MenuItem>
                    <MenuItem leading={<Icon name="stars_filled-20" />} selected>
                      Selected
                    </MenuItem>
                  </MenuGroup>
                  <MenuGroup>
                    <MenuItem leading={<Icon name="stars-20" />} disabled>
                      Disabled
                    </MenuItem>
                  </MenuGroup>
                </MenuSurface>
              ))}
              <MenuSurface variant="baseline" density={density} width={200}>
                <MenuItem leading={<Icon name="content_cut-24" />}>Baseline</MenuItem>
                <MenuItem leading={<Icon name="content_cut-24" />} selected>
                  Selected
                </MenuItem>
                <MenuDivider />
                <MenuItem leading={<Icon name="content_cut-24" />} disabled>
                  Disabled
                </MenuItem>
              </MenuSurface>
            </div>
          </Section>
        </div>
      </main>
    </M3Provider>
  );
}
