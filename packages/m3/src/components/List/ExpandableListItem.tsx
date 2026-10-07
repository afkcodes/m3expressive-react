import { forwardRef, useContext, useId, useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Collapsible } from '@base-ui/react/collapsible';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { forcedStateLayer, StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { useForcedState, type ForcedState } from '../../testing/ForceState.tsx';
import { ListContext } from './context.ts';
import { ListItem, type ListItemProps } from './ListItem.tsx';
import { expandPanelMarker } from './list.stylex.ts';

const CHEVRON_DOWN = 'M10 12.8334L5 7.83341L6.16667 6.66675L10 10.5001L13.8333 6.66675L15 7.83341L10 12.8334Z';
const CHEVRON_UP = 'M10 9.00008L6.16667 12.8334L5 11.6667L10 6.66675L15 11.6667L13.8333 12.8334L10 9.00008Z';
const flip = stylex.keyframes({ from: { transform: 'rotate(-180deg)' }, to: { transform: 'none' } });

/*
 * Kit "Accordion buttton" (59106:13414): a 32×40 pill — Surface while collapsed, Surface Container
 * while expanded — with a 20px chevron (down = expand, up = collapse). The pill is filled only at
 * rest: hover / focus / press drop it for a 32×32 on-surface-variant layer 4px from the top, round
 * while hovered or focused and squaring to 8px corners (with the ripple clipped to it) when pressed.
 * Opening (Compose SegmentedListItemWithExpansionSample: expandVertically / shrinkVertically on
 * FastSpatial, expandFrom Bottom): the panel's height springs on fast spatial while its items stay
 * anchored to the panel's bottom edge, so they slide down out of the header.
 */
const s = stylex.create({
  button: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: 32,
    height: 40,
    padding: 0,
    margin: 0,
    borderWidth: 0,
    borderStyle: 'none',
    borderRadius: 16,
    // No clip: the pressed layer's 8px corners reach past the pill's 16px ones (kit Pressed).
    cursor: 'pointer',
    color: color.onSurfaceVariant,
    backgroundColor: {
      default: color.surface,
      ':hover': 'transparent',
      ':focus-visible': 'transparent',
      ':active': 'transparent',
    },
    outlineStyle: 'none',
    [interaction.layerColor]: color.onSurfaceVariant,
    transitionProperty: 'background-color',
    transitionDuration: motion.defaultEffectsDuration,
    transitionTimingFunction: motion.defaultEffectsEasing,
  },
  expanded: {
    backgroundColor: {
      default: color.surfaceContainer,
      ':hover': 'transparent',
      ':focus-visible': 'transparent',
      ':active': 'transparent',
    },
  },
  unfilled: { backgroundColor: 'transparent' },
  layerBox: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 32,
    height: 32,
    borderRadius: { default: 16, [stylex.when.ancestor(':active')]: 8 },
    isolation: 'isolate',
    pointerEvents: 'none',
    transitionProperty: 'border-radius',
    transitionDuration: motion.fastSpatialDuration,
    transitionTimingFunction: motion.fastSpatialEasing,
  },
  layerPressed: { borderRadius: 8 },
  // At rest the exact kit glyphs (keyboard_arrow_down / _up); a toggle flips in from the other
  // orientation (180° about (10, 9.75) maps one glyph onto the other).
  chevron: { display: 'block', transformOrigin: '10px 9.75px' },
  chevronFlip: {
    animationName: { default: flip, '@media (prefers-reduced-motion: reduce)': 'none' },
    animationDuration: motion.defaultSpatialDuration,
    animationTimingFunction: motion.defaultSpatialEasing,
  },
  headerOpen: { backgroundColor: color.surface },
  panel: {
    overflow: 'hidden',
    height: 'var(--collapsible-panel-height)',
    transitionProperty: 'height',
    transitionDuration: motion.fastSpatialDuration,
    transitionTimingFunction: motion.fastSpatialEasing,
    [':is([data-starting-style], [data-ending-style])' as string]: { height: 0 },
  },
  // Bottom-anchored: while the panel is h of its full height H, the list is shifted by h − H
  // (−100% when closed). Same duration and easing as the height, so the two stay in step.
  panelList: {
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
    padding: 0,
    listStyle: 'none',
    transform: {
      default: 'none',
      [stylex.when.ancestor(':is([data-starting-style], [data-ending-style])', expandPanelMarker)]: 'translateY(-100%)',
    },
    transitionProperty: 'transform',
    transitionDuration: motion.fastSpatialDuration,
    transitionTimingFunction: motion.fastSpatialEasing,
  },
  panelListGap: { rowGap: 2, paddingTop: 2 },
  li: { listStyle: 'none', margin: 0, padding: 0 },
});

export interface AccordionButtonProps {
  expanded: boolean;
  'aria-label'?: string;
  /** Visual-test hook (the kit's state variants). */
  forcedState?: ForcedState;
}

/** The kit's accordion toggle (used by ExpandableListItem; exported for custom headers). */
export const AccordionButton = forwardRef<
  HTMLButtonElement,
  AccordionButtonProps & ButtonHTMLAttributes<HTMLButtonElement>
>(function AccordionButton({ expanded, forcedState, ...rest }, ref) {
  // The chevron flips on every toggle after mount (not on the first render).
  const [initial] = useState(expanded);
  const [toggled, setToggled] = useState(false);
  if (!toggled && expanded !== initial) setToggled(true);
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={expanded}
      data-ripple-host=""
      {...rest}
      {...stylex.props(stylex.defaultMarker(), s.button, expanded && s.expanded, forcedState != null && s.unfilled)}
    >
      <span
        aria-hidden
        {...stylex.props(
          stateLayerHost.host,
          // after host: the layer box is absolutely placed 4px from the top
          s.layerBox,
          // The kit's Pressed variant keeps the hover layer under the ripple and squares the box.
          forcedState !== 'dragged' && forcedStateLayer(forcedState, 'hover'),
          forcedState === 'pressed' && s.layerPressed,
        )}
      >
        <StateLayer />
        <Ripple />
      </span>
      <svg
        key={String(expanded)}
        width={20}
        height={20}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
        {...stylex.props(s.chevron, toggled && s.chevronFlip)}
      >
        <path d={expanded ? CHEVRON_UP : CHEVRON_DOWN} />
      </svg>
    </button>
  );
});

export interface ExpandableListItemProps extends Omit<ListItemProps, 'trailing' | 'onClick' | 'href' | 'selected'> {
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** The nested items revealed when expanded. */
  items?: ReactNode;
  /**
   * The accordion button's verb (default "Expand"). Its accessible name is this verb followed by the
   * item's label, the same in both states; aria-expanded announces whether it is open.
   */
  toggleLabel?: string;
  sx?: StyleXStyles;
}

/** List item with an accordion toggle that reveals nested items (kit "Expandable" list). */
export function ExpandableListItem({
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  items,
  toggleLabel = 'Expand',
  sx,
  ...item
}: ExpandableListItemProps) {
  const forced = useForcedState();
  const list = useContext(ListContext);
  const headerList = useMemo(() => ({ ...list, inList: false }), [list]);
  const panelList = useMemo(() => ({ ...list, inList: true }), [list]);
  const [open, setOpen] = useControllableState(expanded, defaultExpanded, onExpandedChange);
  // Name = verb (the button's own aria-label) + the item's label text.
  const buttonId = useId();
  const labelId = useId();
  const header = (
    <ListItem
      {...item}
      sx={[open && s.headerOpen, sx]}
      trailing={
        <Collapsible.Trigger
          render={
            <AccordionButton
              expanded={open}
              forcedState={forced.state}
              id={buttonId}
              aria-label={toggleLabel}
              aria-labelledby={`${buttonId} ${labelId}`}
            />
          }
        />
      }
    >
      <span id={labelId}>{item.children}</span>
    </ListItem>
  );
  return (
    <Collapsible.Root
      open={open}
      onOpenChange={(next) => setOpen(next)}
      render={list.inList ? <li {...stylex.props(s.li)} /> : <div />}
    >
      <ListContext value={headerList}>{header}</ListContext>
      <Collapsible.Panel {...stylex.props(expandPanelMarker, s.panel)}>
        <ListContext value={panelList}>
          <ul {...stylex.props(s.panelList, list.segmented && s.panelListGap)}>{items}</ul>
        </ListContext>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
