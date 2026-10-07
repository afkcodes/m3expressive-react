import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Badge,
  Button,
  IconButton,
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
  type MenuDensity,
  type MenuVariant,
} from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import { Demo, Page, Section } from '../ui/Page.tsx';
import { Icon } from '../ui/Icon.tsx';

const s = stylex.create({
  stack: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  note: { margin: 0, color: color.onSurfaceVariant, textAlign: 'center' },
  surfaces: { display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center', alignItems: 'flex-start' },
  row: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  surfaceColumn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
});

/** Status line under a demo: what the menu did. */
function Note({ children }: { children: ReactNode }) {
  return (
    <p {...stylex.props(typescale.bodyMedium, s.note)} aria-live="polite">
      {children}
    </p>
  );
}

/** Menu icons: 20px in expressive menus, 24px in baseline ones. */
const glyph = (name: string, variant: MenuVariant = 'standard') => (
  <Icon name={name} size={variant === 'baseline' ? 24 : 20} />
);

function ActionsMenu({ variant }: { variant: MenuVariant }) {
  const [last, setLast] = useState('—');
  const label = variant === 'vibrant' ? 'Vibrant' : 'Standard';
  return (
    <div {...stylex.props(s.stack)}>
      <Menu
        variant={variant}
        trigger={
          <Button variant={variant === 'vibrant' ? 'filled' : 'tonal'} icon={glyph('edit')}>
            {label} menu
          </Button>
        }
      >
        <MenuGroup>
          <MenuItem leading={glyph('content_cut')} trailingText="⌘X" onClick={() => setLast('Cut')}>
            Cut
          </MenuItem>
          <MenuItem leading={glyph('content_copy')} trailingText="⌘C" onClick={() => setLast('Copy')}>
            Copy
          </MenuItem>
          <MenuItem leading={glyph('content_paste')} trailingText="⌘V" onClick={() => setLast('Paste')}>
            Paste
          </MenuItem>
        </MenuGroup>
        <MenuGroup>
          <MenuItem leading={glyph('select_all')} trailing={<Badge>New</Badge>} onClick={() => setLast('Select all')}>
            Select all
          </MenuItem>
          <MenuItem leading={glyph('delete')} disabled>
            Delete
          </MenuItem>
        </MenuGroup>
      </Menu>
      <Note>Last action: {last}</Note>
    </div>
  );
}

function LabelledGroupsMenu({ variant }: { variant: MenuVariant }) {
  const [last, setLast] = useState('—');
  return (
    <div {...stylex.props(s.stack)}>
      <Menu
        variant={variant}
        trigger={
          <Button variant="outlined" icon={glyph('folder_open')}>
            File
          </Button>
        }
      >
        <MenuGroup label="Create">
          <MenuItem leading={glyph('note_add')} supportingText="Blank document" onClick={() => setLast('New document')}>
            New document
          </MenuItem>
          <MenuItem
            leading={glyph('content_copy')}
            supportingText="From a template"
            onClick={() => setLast('New from template')}
          >
            From template
          </MenuItem>
        </MenuGroup>
        <MenuGroup label="Share">
          <MenuItem leading={glyph('link')} onClick={() => setLast('Copy link')}>
            Copy link
          </MenuItem>
          <MenuItem leading={glyph('mail')} onClick={() => setLast('Email')}>
            Email
          </MenuItem>
        </MenuGroup>
        <MenuGroup>
          <MenuItem leading={glyph('print')} trailingText="⌘P" onClick={() => setLast('Print')}>
            Print
          </MenuItem>
        </MenuGroup>
      </Menu>
      <Note>Last action: {last}</Note>
    </div>
  );
}

function SelectionMenu({ variant }: { variant: MenuVariant }) {
  const [sort, setSort] = useState<unknown>('name');
  const [hidden, setHidden] = useState(false);
  const [wrap, setWrap] = useState(true);
  return (
    <div {...stylex.props(s.stack)}>
      <Menu
        variant={variant}
        trigger={
          <Button variant="outlined" icon={glyph('filter_list')}>
            View options
          </Button>
        }
      >
        <MenuRadioGroup label="Sort by" value={sort} onValueChange={setSort}>
          <MenuRadioItem value="name" leading={glyph('sort_by_alpha')}>
            Name
          </MenuRadioItem>
          <MenuRadioItem value="date" leading={glyph('calendar_today')}>
            Date modified
          </MenuRadioItem>
          <MenuRadioItem value="size" leading={glyph('straighten')}>
            Size
          </MenuRadioItem>
        </MenuRadioGroup>
        <MenuGroup label="Show">
          <MenuCheckboxItem checked={hidden} onCheckedChange={setHidden} leading={glyph('visibility')}>
            Hidden files
          </MenuCheckboxItem>
          <MenuCheckboxItem checked={wrap} onCheckedChange={setWrap} selectedLeading={glyph('check')}>
            Word wrap
          </MenuCheckboxItem>
        </MenuGroup>
      </Menu>
      <Note>
        Sort by {String(sort)} · hidden files {hidden ? 'shown' : 'hidden'} · word wrap {wrap ? 'on' : 'off'}
      </Note>
    </div>
  );
}

function SubmenuDemo({ variant }: { variant: MenuVariant }) {
  const [last, setLast] = useState('—');
  return (
    <div {...stylex.props(s.stack)}>
      <Menu
        variant={variant}
        trigger={
          <IconButton aria-label="More options" variant="tonal">
            <Icon name="more_vert" />
          </IconButton>
        }
      >
        <MenuGroup>
          <MenuItem leading={glyph('drive_file_rename_outline')} onClick={() => setLast('Rename')}>
            Rename
          </MenuItem>
          <Submenu
            leading={glyph('share')}
            trailing={glyph('arrow_right')}
            items={['Email', 'Link', 'Message'].map((t) => (
              <MenuItem key={t} onClick={() => setLast(`Share → ${t}`)}>
                {t}
              </MenuItem>
            ))}
          >
            Share
          </Submenu>
          <Submenu
            leading={glyph('drive_file_move')}
            trailing={glyph('arrow_right')}
            items={
              <>
                <MenuItem leading={glyph('folder')} onClick={() => setLast('Move → Documents')}>
                  Documents
                </MenuItem>
                <Submenu
                  leading={glyph('folder')}
                  trailing={glyph('arrow_right')}
                  items={['2025', '2026'].map((y) => (
                    <MenuItem key={y} leading={glyph('folder')} onClick={() => setLast(`Move → Projects → ${y}`)}>
                      {y}
                    </MenuItem>
                  ))}
                >
                  Projects
                </Submenu>
              </>
            }
          >
            Move to
          </Submenu>
        </MenuGroup>
        <MenuGroup>
          <MenuItem leading={glyph('archive')} onClick={() => setLast('Archive')}>
            Archive
          </MenuItem>
        </MenuGroup>
      </Menu>
      <Note>Last action: {last}</Note>
    </div>
  );
}

const DENSITIES: readonly MenuDensity[] = [0, -2, -4];

function BaselineMenus() {
  const [last, setLast] = useState('—');
  const [bold, setBold] = useState(true);
  return (
    <div {...stylex.props(s.stack)}>
      <div {...stylex.props(s.row)}>
        {DENSITIES.map((density) => (
          <Menu
            key={density}
            variant="baseline"
            density={density}
            trigger={<Button variant="outlined">Density {density}</Button>}
          >
            <MenuItem leading={glyph('content_cut', 'baseline')} trailingText="⌘X" onClick={() => setLast('Cut')}>
              Cut
            </MenuItem>
            <MenuItem leading={glyph('content_copy', 'baseline')} trailingText="⌘C" onClick={() => setLast('Copy')}>
              Copy
            </MenuItem>
            <MenuItem leading={glyph('content_paste', 'baseline')} trailingText="⌘V" onClick={() => setLast('Paste')}>
              Paste
            </MenuItem>
            <MenuDivider />
            <MenuCheckboxItem
              checked={bold}
              onCheckedChange={setBold}
              leading={glyph('format_bold', 'baseline')}
              trailing={bold ? glyph('check', 'baseline') : undefined}
            >
              Bold
            </MenuCheckboxItem>
            <MenuItem leading={glyph('delete', 'baseline')} disabled>
              Delete
            </MenuItem>
          </Menu>
        ))}
      </div>
      <Note>
        Last action: {last} · bold {bold ? 'on' : 'off'}
      </Note>
    </div>
  );
}

function PlacementDemo() {
  const items = (
    <>
      <MenuItem>First</MenuItem>
      <MenuItem>Second</MenuItem>
      <MenuItem>Third</MenuItem>
    </>
  );
  return (
    <>
      <Menu trigger={<Button variant="text">Bottom start</Button>}>{items}</Menu>
      <Menu align="end" trigger={<Button variant="text">Bottom end</Button>}>
        {items}
      </Menu>
      <Menu side="top" trigger={<Button variant="text">Top</Button>}>
        {items}
      </Menu>
      <Menu side="right" align="center" trigger={<Button variant="text">Right</Button>}>
        {items}
      </Menu>
    </>
  );
}

export default function MenusPage() {
  return (
    <Page
      title="Menus"
      summary="Menus display a list of choices on a temporary surface. Expressive menus come in standard and vibrant colours, split into groups with section labels; the baseline menu keeps the classic look at three densities."
    >
      <Section
        title="Standard and vibrant"
        description="Items sit in groups 2px apart. Arrow keys, Home and End move; Enter runs an item; Escape closes. The menu scales in from the trigger on the fast spatial spring."
      >
        <Demo
          title="Standard"
          code={`
<Menu trigger={<Button variant="tonal">Edit</Button>}>
  <MenuGroup>
    <MenuItem leading={<Icon name="content_cut" size={20} />} trailingText="⌘X" onClick={cut}>
      Cut
    </MenuItem>
    <MenuItem leading={<Icon name="content_copy" size={20} />} trailingText="⌘C" onClick={copy}>
      Copy
    </MenuItem>
  </MenuGroup>
  <MenuGroup>
    <MenuItem leading={<Icon name="select_all" size={20} />} trailing={<Badge>New</Badge>}>
      Select all
    </MenuItem>
    <MenuItem leading={<Icon name="delete" size={20} />} disabled>Delete</MenuItem>
  </MenuGroup>
</Menu>`}
        >
          <ActionsMenu variant="standard" />
        </Demo>
        <Demo
          title="Vibrant"
          code={`
<Menu variant="vibrant" trigger={<Button>Edit</Button>}>
  <MenuGroup>
    <MenuItem leading={<Icon name="content_cut" size={20} />}>Cut</MenuItem>
    …
  </MenuGroup>
</Menu>`}
        >
          <ActionsMenu variant="vibrant" />
        </Demo>
      </Section>

      <Section
        title="Groups and section labels"
        description="A group can carry a section label; items can add a supporting line."
      >
        {(['standard', 'vibrant'] as const).map((variant) => (
          <Demo
            key={variant}
            title={variant === 'standard' ? 'Standard' : 'Vibrant'}
            code={`
<Menu${variant === 'vibrant' ? ' variant="vibrant"' : ''} trigger={<Button variant="outlined">File</Button>}>
  <MenuGroup label="Create">
    <MenuItem leading={<Icon name="note_add" size={20} />} supportingText="Blank document">
      New document
    </MenuItem>
    <MenuItem leading={<Icon name="content_copy" size={20} />} supportingText="From a template">
      From template
    </MenuItem>
  </MenuGroup>
  <MenuGroup label="Share">
    <MenuItem leading={<Icon name="link" size={20} />}>Copy link</MenuItem>
    <MenuItem leading={<Icon name="mail" size={20} />}>Email</MenuItem>
  </MenuGroup>
</Menu>`}
          >
            <LabelledGroupsMenu variant={variant} />
          </Demo>
        ))}
      </Section>

      <Section
        title="Selection"
        description="Radio and checkbox items keep the menu open. The chosen item takes the selected shape and container; an item with only a selected icon expands its check in."
      >
        {(['standard', 'vibrant'] as const).map((variant) => (
          <Demo
            key={variant}
            title={variant === 'standard' ? 'Standard' : 'Vibrant'}
            code={`
const [sort, setSort] = useState<unknown>('name');
const [hidden, setHidden] = useState(false);
const [wrap, setWrap] = useState(true);

<Menu${variant === 'vibrant' ? ' variant="vibrant"' : ''} trigger={<Button variant="outlined">View options</Button>}>
  <MenuRadioGroup label="Sort by" value={sort} onValueChange={setSort}>
    <MenuRadioItem value="name">Name</MenuRadioItem>
    <MenuRadioItem value="date">Date modified</MenuRadioItem>
    <MenuRadioItem value="size">Size</MenuRadioItem>
  </MenuRadioGroup>
  <MenuGroup label="Show">
    <MenuCheckboxItem checked={hidden} onCheckedChange={setHidden}>Hidden files</MenuCheckboxItem>
    <MenuCheckboxItem
      checked={wrap}
      onCheckedChange={setWrap}
      selectedLeading={<Icon name="check" size={20} />}
    >
      Word wrap
    </MenuCheckboxItem>
  </MenuGroup>
</Menu>`}
          >
            <SelectionMenu variant={variant} />
          </Demo>
        ))}
      </Section>

      <Section
        title="Submenus"
        description="A Submenu is an item that opens a nested menu to its side (hover, or the right arrow key). It keeps its hover layer while open; submenus nest."
      >
        {(['standard', 'vibrant'] as const).map((variant) => (
          <Demo
            key={variant}
            title={variant === 'standard' ? 'Standard' : 'Vibrant'}
            code={`
<Menu${variant === 'vibrant' ? ' variant="vibrant"' : ''} trigger={<IconButton aria-label="More options"><Icon name="more_vert" /></IconButton>}>
  <MenuItem leading={<Icon name="drive_file_rename_outline" size={20} />}>Rename</MenuItem>
  <Submenu
    leading={<Icon name="share" size={20} />}
    trailing={<Icon name="arrow_right" size={20} />}
    items={
      <>
        <MenuItem>Email</MenuItem>
        <MenuItem>Link</MenuItem>
        <MenuItem>Message</MenuItem>
      </>
    }
  >
    Share
  </Submenu>
</Menu>`}
          >
            <SubmenuDemo variant={variant} />
          </Demo>
        ))}
      </Section>

      <Section
        title="Baseline menu"
        description="The classic M3 menu: one surface, dividers between sections, 24px icons. Density removes 4px per step from each item (0, −2, −4)."
      >
        <Demo
          title="Densities"
          wide
          code={`
<Menu variant="baseline" density={-2} trigger={<Button variant="outlined">Edit</Button>}>
  <MenuItem leading={<Icon name="content_cut" />} trailingText="⌘X">Cut</MenuItem>
  <MenuItem leading={<Icon name="content_copy" />} trailingText="⌘C">Copy</MenuItem>
  <MenuItem leading={<Icon name="content_paste" />} trailingText="⌘V">Paste</MenuItem>
  <MenuDivider />
  <MenuCheckboxItem checked={bold} onCheckedChange={setBold} leading={<Icon name="format_bold" />}>
    Bold
  </MenuCheckboxItem>
  <MenuItem leading={<Icon name="delete" />} disabled>Delete</MenuItem>
</Menu>`}
        >
          <BaselineMenus />
        </Demo>
      </Section>

      <Section
        title="Placement"
        description="Menus open below the trigger, aligned to its start, by default; `side` and `align` move them. They flip when there's no room."
      >
        <Demo
          title="Side and align"
          wide
          code={`
<Menu trigger={<Button variant="text">Bottom start</Button>}>…</Menu>
<Menu align="end" trigger={<Button variant="text">Bottom end</Button>}>…</Menu>
<Menu side="top" trigger={<Button variant="text">Top</Button>}>…</Menu>
<Menu side="right" align="center" trigger={<Button variant="text">Right</Button>}>…</Menu>`}
        >
          <PlacementDemo />
        </Demo>
      </Section>

      <Section
        title="Static surfaces"
        description="MenuSurface renders the same parts without a popup — for your own popover, or a menu that's always visible."
      >
        <Demo
          title="Standard and vibrant"
          wide
          code={`
<MenuSurface variant="vibrant" width={200}>
  <MenuGroup label="Vibrant">
    <MenuItem leading={<Icon name="star" size={20} />}>Item</MenuItem>
    <MenuItem leading={<Icon name="star" size={20} filled />} selected>Selected</MenuItem>
  </MenuGroup>
  <MenuGroup>
    <MenuItem leading={<Icon name="star" size={20} />} disabled>Disabled</MenuItem>
  </MenuGroup>
</MenuSurface>`}
        >
          <div {...stylex.props(s.surfaces)}>
            {(['standard', 'vibrant'] as const).map((v) => (
              <MenuSurface key={v} variant={v} width={200}>
                <MenuGroup label={v === 'standard' ? 'Standard' : 'Vibrant'}>
                  <MenuItem leading={glyph('star')}>Item</MenuItem>
                  <MenuItem leading={<Icon name="star" size={20} filled />} selected>
                    Selected
                  </MenuItem>
                </MenuGroup>
                <MenuGroup>
                  <MenuItem leading={glyph('star')} disabled>
                    Disabled
                  </MenuItem>
                </MenuGroup>
              </MenuSurface>
            ))}
          </div>
        </Demo>
        <Demo
          title="Baseline at each density"
          wide
          code={`
<MenuSurface variant="baseline" density={-2} width={200}>
  <MenuItem leading={<Icon name="content_cut" />}>Baseline</MenuItem>
  <MenuItem leading={<Icon name="content_cut" />} selected>Selected</MenuItem>
  <MenuDivider />
  <MenuItem leading={<Icon name="content_cut" />} disabled>Disabled</MenuItem>
</MenuSurface>`}
        >
          <div {...stylex.props(s.surfaces)}>
            {DENSITIES.map((density) => (
              <div key={density} {...stylex.props(s.surfaceColumn)}>
                <MenuSurface variant="baseline" density={density} width={200}>
                  <MenuItem leading={glyph('content_cut', 'baseline')}>Baseline</MenuItem>
                  <MenuItem leading={glyph('content_cut', 'baseline')} selected>
                    Selected
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem leading={glyph('content_cut', 'baseline')} disabled>
                    Disabled
                  </MenuItem>
                </MenuSurface>
                <Note>Density {density}</Note>
              </div>
            ))}
          </div>
        </Demo>
      </Section>
    </Page>
  );
}
