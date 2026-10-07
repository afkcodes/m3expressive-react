import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '@m3x/react/tokens/color.stylex';
import { typescale } from '@m3x/react';
import {
  Badge,
  Button,
  IconButton,
  Menu,
  MenuDivider,
  MenuGroup,
  MenuCheckboxItem,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuScope,
  MenuSectionLabel,
  MenuSurface,
  Submenu,
  type MenuDensity,
} from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/menu/manifest.json';
import assets from '../../../../figma/menu/assets.json';
import listAssets from '../../../../figma/list/assets.json';
import slotLead from '../../../../figma/menu/assets/slot-lead.png';
import slotContent from '../../../../figma/menu/assets/slot-content.png';
import slotTrail from '../../../../figma/menu/assets/slot-trail.png';
import type { FixtureModule, FixtureVariant } from './types';

const fx = stylex.create({
  // Kit slip: the vibrant 3-group menu's middle group spaces its items 2px apart (all others: 0).
  slipGap: { rowGap: 2 },
  groupStandard: { backgroundColor: color.surfaceContainerLow },
  groupVibrant: { backgroundColor: color.tertiaryContainer },
  onSurface: { color: color.onSurface },
  onSurfaceVariant: { color: color.onSurfaceVariant },
  onSecondaryContainer: { color: color.onSecondaryContainer },
});

type IconName = keyof typeof assets.icons;
const Icon = ({ name }: { name: IconName }) => {
  const size = Number(name.split('-').pop());
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="currentColor" aria-hidden style={{ display: 'block' }}>
      <path d={assets.icons[name]} />
    </svg>
  );
};
/** The kit's outlined "⌘C" (Roboto has no ⌘): label-large (expressive) and body-large (baseline). */
const Shortcut = () => (
  <svg width={21} height={20} viewBox="0 0 21 20" fill="currentColor" aria-label="⌘C" style={{ display: 'block', flexShrink: 0 }}>
    <path d={listAssets.shortcut.d} />
  </svg>
);
const ShortcutBaseline = () => (
  <svg width={37} height={24} viewBox={assets.shortcutBaseline.viewBox} fill="currentColor" aria-label="⌘C" style={{ display: 'block' }}>
    <path d={assets.shortcutBaseline.d} />
  </svg>
);
const Img = ({ src, w, h }: { src: string; w: number; h: number }) => <img src={src} alt="" width={w} height={h} style={{ display: 'block', flexShrink: 0 }} />;
/*
 * Chrome snaps painted box sizes to whole CSS px, so the kit's half-pixel blocks (62.5px slot,
 * 119.5px labels) are drawn at 2x and scaled down: transforms keep device-pixel precision.
 */
const HalfPxImg = ({ src, w, h }: { src: string; w: number; h: number }) => (
  <div style={{ width: w, height: h, flexShrink: 0 }}>
    <img src={src} alt="" width={w * 2} height={h * 2} style={{ display: 'block', transform: 'scale(0.5)', transformOrigin: '0 0' }} />
  </div>
);
const LabelBlock = ({ vibrant }: { vibrant: boolean }) => (
  <MenuScope variant={vibrant ? 'vibrant' : 'standard'}>
    <div style={{ position: 'relative', width: 119.5, height: 32, isolation: 'isolate' }}>
      <div
        {...stylex.props(vibrant ? fx.groupVibrant : fx.groupStandard)}
        style={{ position: 'absolute', left: 0, top: 0, width: 239, height: 64, borderRadius: 8, transform: 'scale(0.5)', transformOrigin: '0 0', zIndex: -1 }}
      />
      <MenuSectionLabel>Label</MenuSectionLabel>
    </div>
  </MenuScope>
);
const asForced = (s: string): ForcedState | undefined => (s === 'hovered' || s === 'focused' || s === 'pressed' ? s : undefined);
const row = (children: ReactNode, gap = 8) => <div style={{ display: 'flex', alignItems: 'center', columnGap: gap }}>{children}</div>;

const items = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => (
    <MenuItem key={i + offset} leading={<Icon name="stars-20" />} trailing={<Icon name="arrow_right-20" />}>
      Label
    </MenuItem>
  ));

function render(name: string): ReactNode {
  const p = name.split('-');
  if (p[0] === 'item') {
    // item-{std|vib}-{state}-{sel|unsel}
    const vib = p[1] === 'vib';
    const state = p[2]!;
    const sel = p[3] === 'sel';
    const ripple = state === 'pressed' ? (vib && sel ? assets.ripple['vibrant-selected'] : assets.ripple.default) : undefined;
    return (
      <div {...stylex.props(vib ? fx.groupVibrant : fx.groupStandard)} style={{ width: 228 }}>
        <MenuScope variant={vib ? 'vibrant' : 'standard'}>
          <ForceState state={asForced(state)} ripplePath={ripple}>
            <MenuItem
              leading={<Icon name={sel ? 'stars_filled-20' : 'stars-20'} />}
              trailing={<Icon name="arrow_right-20" />}
              selected={sel}
              disabled={state === 'disabled'}
              active={state === 'active'}
            >
              Label
            </MenuItem>
          </ForceState>
        </MenuScope>
      </div>
    );
  }
  if (p[0] === 'menu') {
    // menu-{std|vib}-{groups}
    const groups = Number(p[2]);
    return (
      <MenuSurface variant={p[1] === 'vib' ? 'vibrant' : 'standard'} width={208}>
        {groups === 1
          ? <MenuGroup>{items(6)}</MenuGroup>
          : Array.from({ length: groups }, (_, g) => (
              <MenuGroup key={g} sx={p[1] === 'vib' && groups === 3 && g === 1 ? fx.slipGap : undefined}>
                {items(4, g * 4)}
              </MenuGroup>
            ))}
      </MenuSurface>
    );
  }
  if (p[0] === 'bmenu') {
    const density = (p[1] === 'd0' ? 0 : p[1] === 'dm2' ? -2 : -4) as MenuDensity;
    return (
      <MenuSurface variant="baseline" density={density} width={200}>
        {Array.from({ length: 12 }, (_, i) => (
          <MenuItem key={i} selected={i === 9}>
            Menu item
          </MenuItem>
        ))}
      </MenuSurface>
    );
  }
  if (p[0] === 'bitem') {
    // bitem-d{0|m2|m4}-{state}
    const density = (p[1] === 'd0' ? 0 : p[1] === 'dm2' ? -2 : -4) as MenuDensity;
    const state = p[2]!;
    return (
      <MenuScope variant="baseline" density={density}>
        <div style={{ width: 200 }}>
          <ForceState state={asForced(state)}>
            <MenuItem leading={<Icon name="content_cut-24" />} trailing={<Icon name="arrow_right-24" />} selected={state === 'selected'} disabled={state === 'disabled'}>
              Menu item
            </MenuItem>
          </ForceState>
          <MenuDivider />
        </div>
      </MenuScope>
    );
  }
  // Building blocks.
  const blocks: Record<string, ReactNode> = {
    'lead-indent': <div style={{ width: 20, height: 20 }} />,
    'lead-icon': <span {...stylex.props(fx.onSurfaceVariant)}><Icon name="stars-20" /></span>,
    'lead-slot': <Img src={slotLead} w={44} h={36} />,
    'content-text': <span {...stylex.props(typescale.labelLarge, fx.onSurface)} style={{ display: 'block', width: 62.5 }}>Label</span>,
    'content-slot': <HalfPxImg src={slotContent} w={62.5} h={36} />,
    'trail-text': <span {...stylex.props(fx.onSurfaceVariant)}><Shortcut /></span>,
    'trail-icon': <span {...stylex.props(fx.onSurfaceVariant)}>{row(<><Shortcut /><Icon name="arrow_right-20" /></>)}</span>,
    'trail-slot': <span {...stylex.props(fx.onSurfaceVariant)}>{row(<><Shortcut /><Img src={slotTrail} w={40} h={36} /></>)}</span>,
    'trail-badge': <span {...stylex.props(fx.onSurfaceVariant)}>{row(<><Badge>New</Badge><Shortcut /></>)}</span>,
    'label-std': <LabelBlock vibrant={false} />,
    'label-vib': <LabelBlock vibrant />,
    'blead-icon': <span {...stylex.props(fx.onSurfaceVariant)}><Icon name="content_cut-24" /></span>,
    'blead-indent': <div style={{ width: 24, height: 24 }} />,
    'blead-slot': <div style={{ width: 24, height: 24 }} />,
    'btrail-icon': <span {...stylex.props(fx.onSurfaceVariant)}><Icon name="arrow_right-24" /></span>,
    'btrail-text': <span {...stylex.props(fx.onSurfaceVariant)}><ShortcutBaseline /></span>,
    'btrail-slot': <div style={{ width: 24, height: 24 }} />,
    'btrail-sel-icon': <span {...stylex.props(fx.onSecondaryContainer)}><Icon name="arrow_right-24" /></span>,
    'btrail-sel-text': <span {...stylex.props(fx.onSecondaryContainer)}><ShortcutBaseline /></span>,
    'btrail-sel-slot': <div style={{ width: 24, height: 24 }} />,
  };
  return blocks[name];
}

/** Live: the kit's 2-group standard menu (menu-std-2), opened from a tonal button. */
function LiveMenu() {
  const [log, setLog] = useState('—');
  return (
    <div style={{ width: 208 }}>
      <Menu trigger={<Button variant="tonal">Options</Button>} width={208}>
        {[0, 1].map((g) => (
          <MenuGroup key={g}>
            {[0, 1, 2, 3].map((i) => (
              <MenuItem key={i} leading={<Icon name="stars-20" />} trailing={<Icon name="arrow_right-20" />} onClick={() => setLog(String(g * 4 + i + 1))}>
                Label
              </MenuItem>
            ))}
          </MenuGroup>
        ))}
      </Menu>
      <output data-log style={{ position: 'absolute', left: -9999 }}>
        {log}
      </output>
    </div>
  );
}

/** Live: single-choice options and a toggle; choosing keeps the menu open. */
function LiveSelectMenu() {
  const [view, setView] = useState<unknown>('list');
  const [wrap, setWrap] = useState(false);
  return (
    <div style={{ width: 208 }}>
      <Menu trigger={<Button variant="tonal">View</Button>} variant="vibrant" width={208}>
        <MenuRadioGroup label="Layout" value={view} onValueChange={setView}>
          <MenuRadioItem value="list" leading={<Icon name="stars-20" />}>
            List
          </MenuRadioItem>
          <MenuRadioItem value="grid" leading={<Icon name="stars-20" />}>
            Grid
          </MenuRadioItem>
        </MenuRadioGroup>
        <MenuGroup>
          <MenuCheckboxItem checked={wrap} onCheckedChange={setWrap} leading={<Icon name="stars-20" />}>
            Wrap text
          </MenuCheckboxItem>
        </MenuGroup>
      </Menu>
      <output data-state style={{ position: 'absolute', left: -9999 }}>
        {String(view)}|{String(wrap)}
      </output>
    </div>
  );
}

const Check = () => (
  <svg width={20} height={20} viewBox="0 0 20 20" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={listAssets.icons['check-20']} />
  </svg>
);

/** Live (motion): checkable items with only a selected icon, and a submenu; opened from an icon button. */
function LiveMotionMenu() {
  const [wrap, setWrap] = useState(false);
  return (
    <div style={{ width: 208, display: 'flex', justifyContent: 'flex-end' }}>
      <Menu
        trigger={
          <IconButton aria-label="More">
            <Icon name="stars-20" />
          </IconButton>
        }
        align="end"
      >
        <MenuCheckboxItem checked={wrap} onCheckedChange={setWrap} selectedLeading={<Check />}>
          Word wrap
        </MenuCheckboxItem>
        <Submenu items={['Email', 'Link'].map((t) => <MenuItem key={t}>{t}</MenuItem>)} trailing={<Icon name="arrow_right-20" />}>
          Share
        </Submenu>
      </Menu>
    </div>
  );
}

const fixture: FixtureModule = {
  component: 'menu',
  variants: Object.fromEntries([
    ['live', { width: 208, height: 40, render: () => <LiveMenu /> } satisfies FixtureVariant],
    ['live-select', { width: 208, height: 40, render: () => <LiveSelectMenu /> } satisfies FixtureVariant],
    ['live-motion', { width: 208, height: 48, render: () => <LiveMotionMenu /> } satisfies FixtureVariant],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [w, h] = v.size as [number, number];
      const node = render(name);
      const isBlock = /^(lead|content|trail|blead|btrail|label)/.test(name);
      return [
        name,
        {
          node: v.node,
          width: w,
          height: h,
          render: () =>
            isBlock ? (
              <div style={{ width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: name.startsWith('trail') ? 'flex-end' : 'flex-start' }}>{node}</div>
            ) : (
              <div style={{ width: w }}>{node}</div>
            ),
        },
      ];
    }),
  ]),
};
export default fixture;
