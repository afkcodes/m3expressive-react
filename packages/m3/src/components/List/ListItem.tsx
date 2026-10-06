import { createContext, forwardRef, useContext, type MouseEventHandler, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex';
import { elevation } from '../../tokens/elevation.stylex';
import { motion } from '../../tokens/motion.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { Divider } from '../Divider/Divider.tsx';
import { InheritSurfaceContext } from './surface.ts';
import { legacyLeading, textBox, textEnd } from '../../primitives/textBox.ts';
import { interaction } from '../../primitives/state.stylex';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';

export type ListItemVariant = 'expressive' | 'baseline';

/** Provided by <List>: items render as <li> and pick up the list's style. */
export const ListContext = createContext<{ inList: boolean; segmented: boolean; variant: ListItemVariant }>({
  inList: false,
  segmented: false,
  variant: 'expressive',
});

/*
 * Figma kit, "Lists" page.
 * Expressive (List item set 59106:13183; Compose ListItem(onClick, selected…) + ListTokens): 10/16
 *   padding, 12px gaps, 20px icons in 28px-tall slots, content column ≥ 32px (top-stacked), overline
 *   label-medium · label body-large · supporting body-medium, trailing label-large text + icon.
 *   Shape per interaction (Compose ListItemShapes, FastSpatial): rest 4 · hover 12 · focus /
 *   press / selected / dragged 16. Colours on DefaultEffects. Selected = secondary container;
 *   dragged = tertiary container, 16% layer, elevation 5, text column centred.
 * Baseline (List Item: 0 Density set 51964:63037; the classic M3 list): Surface container, 16px
 *   insets and gaps, 24px icons, 56 / 72 / 88px for 1 / 2 / 3 lines (8px vertical padding, 12px and
 *   top-aligned at 3 lines), label-small overline.
 */
const s = stylex.create({
  li: { listStyle: 'none', margin: 0, padding: 0, display: 'block' },
  root: {
    position: 'relative',
    display: 'flex',
    boxSizing: 'border-box',
    width: '100%',
    margin: 0,
    borderWidth: 0,
    borderStyle: 'none',
    textAlign: 'inherit',
    textDecoration: 'none',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    outlineStyle: 'none',
    isolation: 'isolate',
    color: color.onSurface,
    backgroundColor: 'transparent',
    [interaction.layerColor]: color.onSurface,
    transitionProperty: 'border-radius, background-color, color, box-shadow',
    transitionDuration: `${motion.fastSpatialDuration}, ${motion.defaultEffectsDuration}, ${motion.defaultEffectsDuration}, ${motion.fastSpatialDuration}`,
    transitionTimingFunction: `${motion.fastSpatialEasing}, ${motion.defaultEffectsEasing}, ${motion.defaultEffectsEasing}, ${motion.fastSpatialEasing}`,
  },
  interactive: { cursor: 'pointer', userSelect: 'none' },
  expressive: { columnGap: 12, paddingBlock: 10, paddingInline: 16, minHeight: 48, alignItems: 'center', borderRadius: 4 },
  expressiveShapes: { borderRadius: { default: 4, ':hover': 12, ':focus-visible': 16, ':active': 16 } },
  forceHover: { borderRadius: 12 },
  forceFull: { borderRadius: 16 },
  segmentedFill: { backgroundColor: color.surface },
  inheritSurface: { backgroundColor: 'transparent' },
  // Video thumbnails (64px) get 12px vertical padding: the kit's 1- and 2-line video rows are 88px.
  baseline: {
    columnGap: 16,
    paddingInline: 16,
    paddingBlock: { default: 8, ':has([data-media="video"])': 12 },
    alignItems: 'center',
    backgroundColor: color.surface,
  },
  lines1: { minHeight: 56 },
  // Baseline checkboxes (kit "Checkboxes": a 48px target around the 40px layer). A 1-line row keeps
  // its 56px and lets the target spill 4px into the padding; trailing, the target's left 4px
  // overlaps the gap (the kit's trailing instance drops its left inset).
  slotControl1: { marginBlock: { default: 0, ':has(> [role="checkbox"])': -4 } },
  slotTrailingControl: { marginInlineStart: { default: 0, ':has(> [role="checkbox"])': -4 } },
  lines2: { minHeight: 72 },
  lines3: { minHeight: 88, paddingBlock: 12, alignItems: 'flex-start' },
  top: { alignItems: 'flex-start' },
  selected: { backgroundColor: color.secondaryContainer, color: color.onSecondaryContainer, [interaction.layerColor]: color.onSecondaryContainer },
  selectedDisabled: { backgroundColor: `color-mix(in srgb, ${color.onSurface} 10%, transparent)` },
  // Lifted above its siblings: the shadow falls over the neighbouring rows.
  dragged: {
    zIndex: 1,
    backgroundColor: color.tertiaryContainer,
    color: color.onTertiaryContainer,
    boxShadow: elevation.level5NoSpread,
    [interaction.layerColor]: color.onTertiaryContainer,
    [interaction.layerOpacity]: '0.16',
  },
  slot: { display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: color.onSurfaceVariant },
  slotExpressive: { minHeight: 28 },
  // The text sets the row height (10 + content + 10); taller slots (40px accordion button, 48px
  // controls) are centred and spill into the padding, as the kit's fixed-height rows do.
  slotSpill: { marginBlock: -10 },
  slotTrailing: { columnGap: 8 },
  // Baseline "Trailing element": supporting text 10px before the control (the kit's list dialogs);
  // a checkbox's 48px target already brings 4px of that.
  slotTrailingBaseline: { columnGap: { default: 10, ':has(> [role="checkbox"])': 6 } },
  slotOnSelected: { color: color.onSecondaryContainer },
  slotOnDragged: { color: color.onTertiaryContainer },
  dim: { opacity: 0.38 },
  content: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  contentExpressive: { minHeight: 32 },
  // The kit's Dragged variants centre the text column (the rest stack it from the top).
  contentCentered: { justifyContent: 'center' },
  overline: { color: color.onSurfaceVariant },
  headline: { color: color.onSurface },
  supporting: { color: color.onSurfaceVariant },
  clamp: (lines: number) => ({
    display: '-webkit-box',
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: lines,
    textOverflow: 'ellipsis',
  }),
  onSelected: { color: color.onSecondaryContainer },
  onDragged: { color: color.onTertiaryContainer },
  textDisabled: { color: `color-mix(in srgb, ${color.onSurface} 38%, transparent)` },
  trailingText: { color: 'inherit', whiteSpace: 'nowrap' },
});

export interface ListItemProps {
  /** The headline (label text). */
  children: ReactNode;
  overline?: ReactNode;
  supportingText?: ReactNode;
  /** Clamp the supporting text (ellipsis). The kit's 2-line items clamp to 1. */
  supportingMaxLines?: number;
  /** Icon (20px expressive / 24px baseline), media, avatar or a control. */
  leading?: ReactNode;
  /** Trailing icon or control. */
  trailing?: ReactNode;
  /** Trailing supporting text, e.g. a shortcut ("⌘C"). */
  trailingText?: ReactNode;
  variant?: ListItemVariant;
  /**
   * Baseline line count (56 / 72 / 88px, top-aligned at 3). When omitted: 3 with an overline and
   * supporting text, or supporting text clamped to 2+ lines; 2 with either; otherwise 1.
   */
  lines?: 1 | 2 | 3;
  /** Expressive only: vertical alignment of the leading / trailing slots. */
  alignment?: 'middle' | 'top';
  selected?: boolean;
  disabled?: boolean;
  /** Lifted while being reordered. */
  dragged?: boolean;
  /** A middle-inset divider under the item (the baseline kit's list items in dialogs). */
  divider?: boolean;
  onClick?: MouseEventHandler<HTMLElement>;
  href?: string;
  sx?: StyleXStyles;
}

export const ListItem = forwardRef<HTMLElement, ListItemProps>(function ListItem(
  {
    children,
    overline,
    supportingText,
    supportingMaxLines,
    leading,
    trailing,
    trailingText,
    variant: variantProp,
    lines: linesProp,
    alignment = 'middle',
    selected = false,
    disabled = false,
    dragged = false,
    divider = false,
    onClick,
    href,
    sx,
  },
  ref,
) {
  const list = useContext(ListContext);
  const inheritSurface = useContext(InheritSurfaceContext);
  const forced = useForcedState();
  const variant = variantProp ?? list.variant;
  const expressive = variant === 'expressive';
  const interactive = !disabled && (onClick != null || href != null || forced.state != null);
  const lines =
    linesProp ??
    (supportingText != null && (overline != null || (supportingMaxLines ?? 1) > 1) ? 3 : supportingText != null || overline != null ? 2 : 1);
  const tone = disabled ? null : dragged ? 'dragged' : selected ? 'selected' : null;
  const textTone = disabled ? s.textDisabled : tone === 'dragged' ? s.onDragged : tone === 'selected' ? s.onSelected : null;

  const body = (
    <>
      {interactive && !dragged && <StateLayer />}
      {interactive && !dragged && <Ripple disabled={disabled} />}
      {dragged && <StateLayer />}
      {leading != null && (
        <span
          {...stylex.props(
            s.slot,
            expressive && s.slotExpressive,
            expressive && alignment === 'middle' && s.slotSpill,
            !expressive && lines === 1 && s.slotControl1,
            tone === 'selected' && s.slotOnSelected,
            tone === 'dragged' && s.slotOnDragged,
            disabled && s.dim,
          )}
        >
          {leading}
        </span>
      )}
      <span {...stylex.props(s.content, expressive && s.contentExpressive, expressive && dragged && s.contentCentered)}>
        {overline != null && (
          <span {...stylex.props(expressive ? typescale.labelMedium : typescale.labelSmall, s.overline, textTone)}>{overline}</span>
        )}
        <span {...stylex.props(typescale.bodyLarge, s.headline, textTone)}>{children}</span>
        {supportingText != null && (
          // Measured per kit layer: the baseline list's supporting text and the expressive list's
          // truncated (single-line) supporting text use Figma's legacy line height (baseline 2px
          // higher); the expressive multi-line layer doesn't.
          <span
            {...stylex.props(
              typescale.bodyMedium,
              s.supporting,
              textTone,
              supportingMaxLines != null && s.clamp(supportingMaxLines),
              (!expressive || supportingMaxLines != null) && legacyLeading.shift(14, 20),
            )}
          >
            {supportingText}
          </span>
        )}
      </span>
      {(trailing != null || trailingText != null) && (
        <span
          {...stylex.props(
            s.slot,
            s.slotTrailing,
            !expressive && s.slotTrailingBaseline,
            expressive && s.slotExpressive,
            expressive && alignment === 'middle' && s.slotSpill,
            !expressive && lines === 1 && s.slotControl1,
            !expressive && s.slotTrailingControl,
            tone === 'selected' && s.slotOnSelected,
            tone === 'dragged' && s.slotOnDragged,
            disabled && s.dim,
          )}
        >
          {trailingText != null && (
            <span {...stylex.props(expressive ? typescale.labelLarge : [typescale.labelSmall, textBox.hug, textEnd.trimTracking], s.trailingText)}>{trailingText}</span>
          )}
          {trailing}
        </span>
      )}
    </>
  );

  const styles = stylex.props(
    s.root,
    expressive ? s.expressive : [s.baseline, lines === 1 ? s.lines1 : lines === 2 ? s.lines2 : s.lines3, inheritSurface && s.inheritSurface],
    expressive && alignment === 'top' && s.top,
    expressive && list.segmented && s.segmentedFill,
    interactive && s.interactive,
    interactive && stateLayerHost.host,
    expressive && interactive && s.expressiveShapes,
    forced.state === 'hovered' && [stateLayerHost.forceHover, expressive && s.forceHover],
    forced.state === 'focused' && [stateLayerHost.forceFocus, expressive && s.forceFull],
    forced.state === 'pressed' && [stateLayerHost.forceHover, expressive && s.forceFull],
    selected && !disabled && s.selected,
    selected && disabled && s.selectedDisabled,
    expressive && (selected || dragged) && s.forceFull,
    dragged && s.dragged,
    sx,
  );
  const common = { ...styles, 'data-ripple-host': interactive ? '' : undefined, 'data-selected': selected ? '' : undefined };

  let el: ReactNode;
  if (href != null && !disabled) {
    el = (
      <a ref={ref as React.Ref<HTMLAnchorElement>} href={href} onClick={onClick} {...common}>
        {body}
      </a>
    );
  } else if (onClick != null) {
    el = (
      <button ref={ref as React.Ref<HTMLButtonElement>} type="button" disabled={disabled} aria-pressed={selected || undefined} onClick={onClick} {...common}>
        {body}
      </button>
    );
  } else {
    el = (
      <div ref={ref as React.Ref<HTMLDivElement>} aria-disabled={disabled || undefined} {...common}>
        {body}
      </div>
    );
  }
  const withDivider = divider ? (
    <>
      {el}
      <Divider inset="middle" />
    </>
  ) : (
    el
  );
  return list.inList ? <li {...stylex.props(s.li)}>{withDivider}</li> : withDivider;
});
