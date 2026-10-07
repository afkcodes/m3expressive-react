import { useState } from 'react';
import {
  Button,
  IconButton,
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSurface,
  Submenu,
} from '@m3x/react';
import assets from '../../../../figma/menu/assets.json';
import listAssets from '../../../../figma/list/assets.json';

/* Menu fixture parts: the kit's icons and the live (interaction / motion / a11y) menus. */

export type IconName = keyof typeof assets.icons;
export const Icon = ({ name }: { name: IconName }) => {
  const size = Number(name.split('-').pop());
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="currentColor"
      aria-hidden
      style={{ display: 'block' }}
    >
      <path d={assets.icons[name]} />
    </svg>
  );
};

/** Live: the kit's 2-group standard menu (menu-std-2), opened from a tonal button. */
export function LiveMenu() {
  const [log, setLog] = useState('—');
  return (
    <div style={{ width: 208 }}>
      <Menu trigger={<Button variant="tonal">Options</Button>} width={208}>
        {[0, 1].map((g) => (
          <MenuGroup key={g}>
            {[0, 1, 2, 3].map((i) => (
              <MenuItem
                key={i}
                leading={<Icon name="stars-20" />}
                trailing={<Icon name="arrow_right-20" />}
                onClick={() => setLog(String(g * 4 + i + 1))}
              >
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
export function LiveSelectMenu() {
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
export function LiveMotionMenu() {
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
        <Submenu
          items={['Email', 'Link'].map((t) => (
            <MenuItem key={t}>{t}</MenuItem>
          ))}
          trailing={<Icon name="arrow_right-20" />}
        >
          Share
        </Submenu>
      </Menu>
    </div>
  );
}

/** Two groups rendered by a wrapper component (not direct children of the menu). */
function WrappedGroups() {
  return (
    <>
      <MenuGroup>
        <MenuItem>Cut</MenuItem>
        <MenuItem>Copy</MenuItem>
      </MenuGroup>
      <MenuGroup>
        <MenuItem>Paste</MenuItem>
      </MenuGroup>
    </>
  );
}

/** Live (a11y): group detection — direct children, a wrapper component, a fragment, loose items. */
export function LiveWrapped() {
  return (
    <div style={{ display: 'flex', columnGap: 16, alignItems: 'flex-start' }}>
      <div data-case="direct">
        <MenuSurface>
          <MenuGroup>
            <MenuItem>Cut</MenuItem>
            <MenuItem>Copy</MenuItem>
          </MenuGroup>
          <MenuGroup>
            <MenuItem>Paste</MenuItem>
          </MenuGroup>
        </MenuSurface>
      </div>
      <div data-case="wrapped">
        <MenuSurface>
          <WrappedGroups />
        </MenuSurface>
      </div>
      <div data-case="fragment">
        <MenuSurface>
          <>
            <MenuGroup>
              <MenuItem>Cut</MenuItem>
              <MenuItem>Copy</MenuItem>
            </MenuGroup>
            <MenuGroup>
              <MenuItem>Paste</MenuItem>
            </MenuGroup>
          </>
        </MenuSurface>
      </div>
      <div data-case="loose">
        <MenuSurface>
          <MenuItem>Cut</MenuItem>
          <MenuItem>Copy</MenuItem>
        </MenuSurface>
      </div>
    </div>
  );
}
