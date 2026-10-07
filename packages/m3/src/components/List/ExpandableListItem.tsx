import {
  useContext,
  useId,
  useMemo,
  useState,
  type ComponentPropsWithRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import { Collapsible } from '@base-ui/react/collapsible';
import { color } from '../../tokens/color.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { forcedStateLayer, StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import type { SxProps } from '../../primitives/types.ts';
import { useLabels, type M3Labels } from '../../theme/labels.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { ListContext } from './context.ts';
import { ListItem, type ListItemOwnProps } from './ListItem.tsx';
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

/** Native props, `ref` and `sx` go to the `<button>`. */
export interface AccordionButtonProps extends SxProps<ComponentPropsWithRef<'button'>> {
  /** Whether the content it controls is shown (mirrored to `aria-expanded`; the chevron points up). */
  open: boolean;
}

/** The kit's accordion toggle (used by ExpandableListItem; exported for custom headers). */
export function AccordionButton({ open, sx, ...rest }: AccordionButtonProps) {
  const forcedState = useForcedState().state;
  // The chevron flips on every toggle after mount (not on the first render).
  const [initial] = useState(open);
  const [toggled, setToggled] = useState(false);
  if (!toggled && open !== initial) setToggled(true);
  return (
    <button
      type="button"
      aria-expanded={open}
      data-ripple-host=""
      {...rest}
      {...stylex.props(stylex.defaultMarker(), s.button, open && s.expanded, forcedState != null && s.unfilled, sx)}
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
        key={String(open)}
        width={20}
        height={20}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
        {...stylex.props(s.chevron, toggled && s.chevronFlip)}
      >
        <path d={open ? CHEVRON_UP : CHEVRON_DOWN} />
      </svg>
    </button>
  );
}

/**
 * The header's content props (as `ListItem`'s) plus the disclosure. Native props, `ref` and `sx` go
 * to the root: the `<li>` inside a `List`, otherwise a `<div>`.
 */
export interface ExpandableListItemProps
  extends
    Omit<ListItemOwnProps, 'trailing' | 'onClick' | 'href' | 'selected'>,
    SxProps<Omit<HTMLAttributes<HTMLElement>, keyof ListItemOwnProps>> {
  ref?: Ref<HTMLElement>;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: Collapsible.Root.ChangeEventDetails) => void;
  /** The nested items revealed when open. */
  items?: ReactNode;
  /**
   * `expand`: the accordion button's verb. Its accessible name is the verb followed by the item's
   * label, the same in both states; `aria-expanded` announces whether it is open.
   */
  labels?: Partial<M3Labels>;
}

/** List item with an accordion toggle that reveals nested items (kit "Expandable" list). */
export function ExpandableListItem({
  open,
  defaultOpen = false,
  onOpenChange,
  items,
  labels,
  sx,
  ref,
  children,
  overline,
  supportingText,
  supportingMaxLines,
  leading,
  trailingText,
  variant,
  lines,
  alignment,
  disabled,
  dragged,
  divider,
  ...rest
}: ExpandableListItemProps) {
  const list = useContext(ListContext);
  const { expand } = useLabels(labels);
  const headerList = useMemo(() => ({ ...list, inList: false }), [list]);
  const panelList = useMemo(() => ({ ...list, inList: true }), [list]);
  const [isOpen, setOpen] = useControllableState(open, defaultOpen, onOpenChange);
  // Name = verb (the button's own aria-label) + the item's label text.
  const buttonId = useId();
  const labelId = useId();
  const header = (
    <ListItem
      overline={overline}
      supportingText={supportingText}
      supportingMaxLines={supportingMaxLines}
      leading={leading}
      trailingText={trailingText}
      variant={variant}
      lines={lines}
      alignment={alignment}
      disabled={disabled}
      dragged={dragged}
      divider={divider}
      sx={isOpen && s.headerOpen}
      trailing={
        <Collapsible.Trigger
          render={
            <AccordionButton
              open={isOpen}
              id={buttonId}
              aria-label={expand}
              aria-labelledby={`${buttonId} ${labelId}`}
            />
          }
        />
      }
    >
      <span id={labelId}>{children}</span>
    </ListItem>
  );
  return (
    <Collapsible.Root
      open={isOpen}
      onOpenChange={setOpen}
      render={
        list.inList ? (
          <li ref={ref as Ref<HTMLLIElement>} {...rest} {...stylex.props(s.li, sx)} />
        ) : (
          <div ref={ref as Ref<HTMLDivElement>} {...rest} {...stylex.props(sx)} />
        )
      }
    >
      <ListContext value={headerList}>{header}</ListContext>
      <Collapsible.Panel {...stylex.props(expandPanelMarker, s.panel)}>
        <ListContext value={panelList}>
          <ul {...stylex.props(s.panelList, list.variant === 'segmented' && s.panelListGap)}>{items}</ul>
        </ListContext>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
