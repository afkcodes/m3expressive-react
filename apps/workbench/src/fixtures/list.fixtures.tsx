import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '@m3x/react/tokens/color.stylex';
import { elevation } from '@m3x/react/tokens/elevation.stylex';
import {
  AccordionButton,
  Avatar,
  Checkbox,
  ExpandableListItem,
  IconButton,
  List,
  ListItem,
  ListItemImage,
  ListItemMonogram,
  ListItemVideo,
  Radio,
  SwipeActions,
  SwipeableListItem,
  Switch,
  swipeLayout,
  swipeOffset,
  type SwipeAction,
  type SwipeRevealState,
} from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/list/manifest.json';
import assets from '../../../../figma/list/assets.json';
import toggleIconAssets from '../../../../figma/toggle-icon-button/assets.json';
import placeholder700 from '../../../../figma/list/assets/placeholder-700.png';
import placeholder350 from '../../../../figma/list/assets/placeholder-350.png';
import slotPlaceholder from '../../../../figma/list/assets/slot.png';
import type { FixtureModule, FixtureVariant } from './types.ts';

const fxBox = stylex.create({
  onSurfaceVariant: { color: color.onSurfaceVariant },
  /** The kit's placeholder art is blended with LUMINOSITY over the thumbnail's container fill. */
  kitPlaceholder: { mixBlendMode: 'luminosity' },
  kitPlaceholderBg: { backgroundColor: color.surfaceContainerHigh },
});
type IconName = keyof typeof assets.icons;
const Icon = ({ name }: { name: IconName }) => {
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
/** The kit's "⌘C" shortcut, outlined: Roboto has no ⌘ (U+2318) and Figma's fallback glyph has no
 *  browser equivalent — demo content, so the fixture draws the kit's own outline. */
const Shortcut = () => (
  <svg width={21} height={20} viewBox="0 0 21 20" fill="currentColor" aria-label="⌘C" style={{ display: 'block' }}>
    <path d={assets.shortcut.d} />
  </svg>
);
const StarsFilled24 = () => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
    <path d={toggleIconAssets.selectedIcon} />
  </svg>
);
const asForced = (s: string): ForcedState | undefined =>
  s === 'hovered' || s === 'focused' || s === 'pressed' ? s : undefined;
const box = (w: number, h: number, children: ReactNode) => (
  <div
    {...stylex.props(fxBox.onSurfaceVariant)}
    style={{
      position: 'relative',
      width: w,
      height: h,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </div>
);

/** Swipe actions as the kit uses them: toggle (star), tonal (move), primary (edit); full swipe archives. */
const ACTIONS: SwipeAction[] = [
  { icon: <Icon name="star-24" />, label: 'Favourite' },
  { icon: <Icon name="move_item-24" />, label: 'Move' },
  { icon: <Icon name="edit-24" />, label: 'Edit' },
];
const ARCHIVE: SwipeAction = {
  icon: <Icon name="archive-24" />,
  label: 'Archive',
};
const SWIPE_STATE: Record<string, SwipeRevealState> = {
  default: 'closed',
  'initiate-reveal': 'peek',
  revealed: 'revealed',
  'swipe-action': 'action',
};

/**
 * The kit's slot placeholder (Shared Building Blocks / Slot-component): a design-time stand-in, not
 * a library part, so the fixture shows the kit's own 2× raster (dashed 8/4 stroke, Roboto Mono).
 */
const Slot = () => <img src={slotPlaceholder} alt="" width={53} height={40} style={{ display: 'block' }} />;

/** Expressive item content shared by the item set and the list compositions. */
const itemProps = {
  leading: <Icon name="stars-20" />,
  trailingText: <Shortcut />,
  trailing: <Icon name="arrow_right-20" />,
};

const fx = stylex.create({
  slot: { backgroundColor: color.surfaceContainer },
  // Kit slip: only the Top-aligned · Dragged · Unselected item frame clips its content, and Figma
  // applies shadow spread only to clipping frames — so that one variant's shadow has the 6px spread.
  spreadShadow: { boxShadow: elevation.level5 },
});
function DraggedSlot({ height, children }: { height: number; children: ReactNode }) {
  return (
    <div {...stylex.props(fx.slot)} style={{ position: 'relative', width: 280, height, borderRadius: 16 }}>
      <div style={{ position: 'absolute', left: 16, top: 16, width: 280 }}>{children}</div>
    </div>
  );
}

function listComposition(name: string): ReactNode {
  const [, ...rest] = name.split('-');
  const multi = rest[rest.length - 1] === 'multi';
  const type = rest.slice(0, -1).join('-');
  // Only the kit's standard list words its fourth row "Secondary".
  const support = (i: number) =>
    multi
      ? i === 3 && type === 'standard'
        ? 'Secondary line text, lorem ipsum dolor'
        : 'Supporting line text, lorem ipsum dolor'
      : undefined;
  const items = (from: number, render: (i: number) => ReactNode) =>
    Array.from({ length: 6 - from }, (_, k) => render(k + from));
  if (type === 'standard' || type === 'segmented-filled') {
    return (
      <List type={type === 'standard' ? 'standard' : 'segmented'} aria-label="List">
        {items(0, (i) => (
          <ListItem key={i} {...itemProps} supportingText={support(i)} supportingMaxLines={1}>
            Label text
          </ListItem>
        ))}
      </List>
    );
  }
  if (type === 'expandable') {
    return (
      <List type="segmented" aria-label="List">
        <ExpandableListItem
          leading={<Icon name="stars-20" />}
          supportingText={multi ? 'Supporting line text, lorem ipsum dolor' : undefined}
          supportingMaxLines={1}
          expanded
          items={items(1, (i) => (
            <ListItem
              key={i}
              {...itemProps}
              supportingText={multi ? 'Supporting line text, lorem ipsum dolor' : undefined}
              supportingMaxLines={1}
            >
              Label text
            </ListItem>
          ))}
        >
          Label text
        </ExpandableListItem>
      </List>
    );
  }
  if (type === 'draggable') {
    return (
      <List aria-label="List">
        {items(0, (i) =>
          i === 2 ? (
            <li key={i} style={{ listStyle: 'none' }}>
              <DraggedSlot height={multi ? 76 : 52}>
                <ListItem
                  dragged
                  leading={<Icon name="stars-20" />}
                  trailingText={<Shortcut />}
                  trailing={<Icon name="drag_handle-20" />}
                  supportingText={support(i)}
                  supportingMaxLines={1}
                >
                  Label text
                </ListItem>
              </DraggedSlot>
            </li>
          ) : (
            <ListItem key={i} {...itemProps} supportingText={support(i)} supportingMaxLines={1}>
              Label text
            </ListItem>
          ),
        )}
      </List>
    );
  }
  // swipable-standard / swipable-segmented. The kit composes the standard list from plain items
  // (transparent) plus the one swiped "List Item - Swipe" (Surface).
  const segmented = type.endsWith('segmented');
  return (
    <List type={segmented ? 'segmented' : 'standard'} aria-label="List">
      {items(0, (i) =>
        !segmented && i !== 2 ? (
          <ListItem
            key={i}
            leading={<Icon name="stars-20" />}
            trailingText={<Shortcut />}
            trailing={<Icon name="more_vert-20" />}
            supportingText={support(i)}
            supportingMaxLines={1}
          >
            Label text
          </ListItem>
        ) : (
          <SwipeableListItem
            key={i}
            actions={ACTIONS}
            swipeAction={ARCHIVE}
            revealState={i === 2 ? 'revealed' : 'closed'}
            leading={<Icon name="stars-20" />}
            trailingText={<Shortcut />}
            trailing={<Icon name="more_vert-20" />}
            supportingText={support(i)}
            supportingMaxLines={1}
          >
            Label text
          </SwipeableListItem>
        ),
      )}
    </List>
  );
}

function baselineItem(name: string): ReactNode {
  const [lines, leading, trailing, flags] = name.slice(1).split('-') as [string, string, string, string];
  const n = Number(lines) as 1 | 2 | 3;
  // The baseline kit lays the radio out at its visual 24px (checkboxes keep their 48px box); our
  // radio keeps its 48px touch target, overflowing that footprint.
  const control = (kind: string, on: boolean, _side: 'lead' | 'trail') => {
    if (kind === 'switch') return <Switch checked={on} aria-label="Toggle" />;
    if (kind === 'checkbox') return <Checkbox checked={on} aria-label="Select" />;
    return (
      <span style={{ display: 'flex', margin: -12 }}>
        <Radio checked={on} value="a" aria-label="Select" />
      </span>
    );
  };
  const lead: Record<string, ReactNode> = {
    none: undefined,
    monogram: <ListItemMonogram>A</ListItemMonogram>,
    icon: <Icon name="person-24" />,
    image: <ListItemImage expressive={false} src={placeholder350} imageSx={fxBox.kitPlaceholder} />,
    video: <ListItemVideo expressive={false} src={placeholder700} imageSx={fxBox.kitPlaceholder} />,
    checkbox: control('checkbox', true, 'lead'),
    radiobutton: control('radiobutton', true, 'lead'),
    switch: control('switch', false, 'lead'),
  };
  const trail: Record<string, ReactNode> = {
    none: undefined,
    icon: <Icon name="arrow_right-24" />,
    checkbox: control('checkbox', true, 'trail'),
    radiobutton: control('radiobutton', true, 'trail'),
    switch: control('switch', false, 'trail'),
  };
  return (
    <ListItem
      variant="baseline"
      lines={n}
      overline={flags[0] === 'o' ? 'Overline' : undefined}
      supportingText={
        flags[1] === 's' || (n > 1 && flags[0] !== 'o')
          ? 'Supporting line text lorem ipsum dolor sit amet, consectetur.'
          : undefined
      }
      supportingMaxLines={n === 2 ? 1 : undefined}
      leading={lead[leading]}
      trailing={trail[trailing]}
    >
      List item
    </ListItem>
  );
}

function render(name: string): ReactNode {
  const p = name.split('-');
  if (p[0] === 'item') {
    const [, align, state, sel] = p as [string, 'mid' | 'top', string, string];
    const selected = sel === 'sel';
    const top = align === 'top';
    const item = (props: Partial<React.ComponentProps<typeof ListItem>>) => (
      <ListItem
        alignment={top ? 'top' : 'middle'}
        overline="Overline"
        // The kit's Top-aligned · Enabled frame has a stray "Ω" typed into its demo text.
        supportingText={
          top && state === 'enabled' && !selected
            ? 'SuppΩorting line text, lorem ipsum dolor'
            : 'Supporting line text, lorem ipsum dolor'
        }
        supportingMaxLines={top ? undefined : 1}
        leading={<Icon name={selected ? 'stars_filled-20' : 'stars-20'} />}
        trailingText={<Shortcut />}
        trailing={<Icon name="arrow_right-20" />}
        selected={selected}
        disabled={state === 'disabled'}
        {...props}
      >
        Label text
      </ListItem>
    );
    if (state === 'dragged') {
      return (
        <DraggedSlot height={top ? 96 : 76}>
          {item({
            dragged: true,
            selected: false,
            trailing: <Icon name="drag_handle-20" />,
            sx: top && !selected ? fx.spreadShadow : undefined,
          })}
        </DraggedSlot>
      );
    }
    const ripple = state === 'pressed' ? (assets.ripple as Record<string, string>)[`${align}-${sel}`] : undefined;
    return (
      <ForceState state={asForced(state)} ripplePath={ripple}>
        {item({})}
      </ForceState>
    );
  }
  if (p[0] === 'accordion') {
    return (
      <ExpandableListItem leading={<Icon name="stars-20" />} expanded={p[1] === 'expanded'}>
        Label text
      </ExpandableListItem>
    );
  }
  if (p[0] === 'swipe') {
    return (
      <SwipeableListItem
        actions={ACTIONS}
        swipeAction={ARCHIVE}
        revealState={SWIPE_STATE[p.slice(1).join('-')]}
        leading={<Icon name="stars-20" />}
        trailingText={<Shortcut />}
        trailing={<Icon name="more_vert-20" />}
      >
        Label text
      </SwipeableListItem>
    );
  }
  if (p[0] === 'leading') {
    const type = p.slice(1).join('-');
    const el: Record<string, ReactNode> = {
      icon: <Icon name="stars-20" />,
      indent: null,
      image: <ListItemImage src={placeholder700} imageSx={fxBox.kitPlaceholder} selected />,
      video: <ListItemVideo src={placeholder350} imageSx={fxBox.kitPlaceholder} />,
      avatar: (
        <Avatar size={40} src={placeholder700} alt="" sx={fxBox.kitPlaceholderBg} imageSx={fxBox.kitPlaceholder} />
      ),
      'icon-button': (
        <IconButton variant="filled" aria-label="Favourite">
          <StarsFilled24 />
        </IconButton>
      ),
      checkbox: <Checkbox checked aria-label="Select" />,
      radio: <Radio checked value="a" aria-label="Select" />,
      switch: <Switch checked aria-label="Toggle" />,
      slot: <Slot />,
    };
    return el[type];
  }
  if (p[0] === 'trailing') {
    const type = p.slice(1).join('-');
    const text = <Shortcut />;
    const el: Record<string, ReactNode> = {
      icon: <Icon name="arrow_right-20" />,
      'trailing-text-only': null,
      checkbox: <Checkbox checked aria-label="Select" />,
      radio: <Radio checked value="a" aria-label="Select" />,
      switch: <Switch checked aria-label="Toggle" />,
      'icon-button': (
        <IconButton variant="tonal" width="narrow" aria-label="More">
          <StarsFilled24 />
        </IconButton>
      ),
      'accordion-button': <AccordionButton expanded={false} />,
      slot: <Slot />,
    };
    if (type === 'accordion-button' || type === 'slot') return el[type];
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          columnGap: 8,
          color: '#49454F',
        }}
      >
        {text}
        {el[type]}
      </div>
    );
  }
  if (p[0] === 'reveal') {
    const n = Number(p[1]);
    const type = p.slice(2).join('-');
    const actions = ACTIONS.slice(3 - n);
    const state: SwipeRevealState = type === 'initiate-reveal' ? 'peek' : type === 'revealed' ? 'revealed' : 'action';
    const offset = swipeOffset(n, state) - 2;
    void swipeLayout;
    return (
      <div style={{ position: 'relative', width: offset, height: 48 }}>
        <SwipeActions
          actions={actions}
          swipeAction={ARCHIVE}
          offset={offset + 2}
          mode={state === 'action' ? 'action' : 'drag'}
          revealed={state === 'revealed'}
        />
      </div>
    );
  }
  if (p[0] === 'accbtn') {
    // Kit ripple (34×22 at -2,10 in the 32×32 layer), in layer coordinates.
    const ripple = 'M32 12.4545V32H-2C-2 19.8497 8.4301 10 21.2963 10C25.1552 10 28.795 10.8861 32 12.4545Z';
    return (
      <ForceState state={asForced(p[2]!)} ripplePath={p[2] === 'pressed' ? ripple : undefined}>
        <AccordionButton expanded={p[1] === 'collapse'} forcedState={asForced(p[2]!)} aria-label="Toggle" />
      </ForceState>
    );
  }
  if (p[0] === 'list') return listComposition(name);
  return baselineItem(name);
}

/** Live: the kit's middle-aligned item (List item set), selectable. */
function LiveItem() {
  const [selected, setSelected] = useState(false);
  return (
    <ListItem
      overline="Overline"
      supportingText="Supporting line text, lorem ipsum dolor"
      supportingMaxLines={1}
      leading={<Icon name={selected ? 'stars_filled-20' : 'stars-20'} />}
      trailingText={<Shortcut />}
      trailing={<Icon name="arrow_right-20" />}
      selected={selected}
      onClick={() => setSelected((v) => !v)}
    >
      Label text
    </ListItem>
  );
}

/** Live: the kit's accordion header (uncontrolled), with two nested items. */
function LiveAccordion() {
  return (
    <ExpandableListItem
      leading={<Icon name="stars-20" />}
      items={[1, 2].map((i) => (
        <ListItem key={i} {...itemProps}>
          Nested item {i}
        </ListItem>
      ))}
    >
      Label text
    </ExpandableListItem>
  );
}

/** Live: the kit's swipe item (uncontrolled) — drag left to reveal. */
function LiveSwipe() {
  const [state, setState] = useState<SwipeRevealState>('closed');
  return (
    <div>
      <SwipeableListItem
        actions={ACTIONS}
        swipeAction={ARCHIVE}
        onRevealStateChange={setState}
        leading={<Icon name="stars-20" />}
        trailingText={<Shortcut />}
        trailing={<Icon name="more_vert-20" />}
      >
        Label text
      </SwipeableListItem>
      <output data-state style={{ position: 'absolute', left: -9999 }}>
        {state}
      </output>
    </div>
  );
}

/** Live: a three-item list whose middle item is lifted while "Drag" is pressed (motion tests). */
function LiveDrag() {
  const [dragged, setDragged] = useState(false);
  return (
    <div style={{ width: 280 }}>
      <List aria-label="Reorder">
        {[0, 1, 2].map((i) => (
          <ListItem key={i} {...itemProps} dragged={i === 1 && dragged} onClick={() => {}}>
            Label text {i + 1}
          </ListItem>
        ))}
      </List>
      <button
        type="button"
        data-toggle-drag
        onClick={() => setDragged((v) => !v)}
        style={{ position: 'absolute', left: -9999 }}
      >
        Drag
      </button>
    </div>
  );
}

const fixture: FixtureModule = {
  component: 'list',
  variants: Object.fromEntries([
    ['live', { width: 280, height: 80, render: () => <LiveItem /> } satisfies FixtureVariant],
    [
      'live-accordion',
      {
        width: 280,
        height: 52,
        render: () => (
          <div style={{ width: 280 }}>
            <LiveAccordion />
          </div>
        ),
      } satisfies FixtureVariant,
    ],
    ['live-drag', { width: 280, height: 156, render: () => <LiveDrag /> } satisfies FixtureVariant],
    [
      'live-swipe',
      {
        width: 280,
        height: 52,
        render: () => (
          <div style={{ width: 280 }}>
            <LiveSwipe />
          </div>
        ),
      } satisfies FixtureVariant,
    ],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const [w, h] = v.size as [number, number];
      const node = render(name);
      const isBlock = /^(leading|trailing|accbtn|reveal)/.test(name);
      return [
        name,
        {
          node: v.node,
          width: w,
          height: h,
          render: () => (isBlock ? box(w, h, node) : <div style={{ width: w }}>{node}</div>),
        },
      ];
    }),
  ]),
};
export default fixture;
