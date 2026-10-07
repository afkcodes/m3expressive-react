import {
  memo,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import { typescale } from '../../tokens/typescale.ts';
import { Divider } from '../Divider/Divider.tsx';
import { InheritSurfaceContext } from './surface.ts';
import { legacyLeading, textBox, textEnd } from '../../primitives/textBox.ts';
import { forcedStateLayer, isInteractionState, StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import type { LinkOrButtonProps, SxProps } from '../../primitives/types.ts';
import { useForcedState } from '../../testing/ForceState.tsx';
import { ListContext, ListItemContext, type ListVariant } from './context.ts';
import { listItemStyles as s } from './listItemStyles.ts';

/** Leaving drag fades the 16% layer out over this (Compose material-ripple StateLayer). */
const DRAG_LAYER_OUT_MS = 150;

/** A list row's content and state (shared with the expandable and swipeable items). */
export interface ListItemOwnProps {
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
  /** The item's style; by default the enclosing list's (`standard` outside a list). */
  variant?: ListVariant;
  /**
   * Baseline line count (56 / 72 / 88px, top-aligned at 3). When omitted: 3 with an overline and
   * supporting text, or supporting text clamped to 2+ lines; 2 with either; otherwise 1.
   */
  lines?: 1 | 2 | 3;
  /** Expressive only: vertical alignment of the leading / trailing slots. */
  alignment?: 'middle' | 'top';
  /**
   * The selected look. Controlled only: selection is display state owned by the list (the item
   * never toggles itself), so there is no `defaultSelected` / `onSelectedChange`.
   */
  selected?: boolean;
  disabled?: boolean;
  /** Lifted while being reordered. */
  dragged?: boolean;
  /** A middle-inset divider under the item (the baseline kit's list items in dialogs). */
  divider?: boolean;
  /** Makes the row a `<button>` (`aria-pressed` follows `selected`). */
  onClick?: MouseEventHandler<HTMLElement>;
  /** Makes the row a link (`<a>`). */
  href?: string;
}

/** Native props of the row, whichever element it renders (`<a>` with `href`, `<button>` with `onClick`, else `<div>`). */
type RowNativeProps = LinkOrButtonProps;

/**
 * `ref`, native props and `sx` all go to the row (`<a>` / `<button>` / `<div>`): the element that
 * takes focus and events, so a ListItem works as a menu / tooltip trigger (Base UI puts `ref` and
 * props on one element). Inside a `List` the row sits in a semantic `<li>`.
 */
export interface ListItemProps extends ListItemOwnProps, SxProps<Omit<RowNativeProps, keyof ListItemOwnProps>> {
  ref?: Ref<HTMLElement>;
}

function ListItemImpl({
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
  ref,
  ...rest
}: ListItemProps) {
  const list = useContext(ListContext);
  const inheritSurface = useContext(InheritSurfaceContext);
  const forced = useForcedState();
  const variant = variantProp ?? list.variant;
  const expressive = variant !== 'baseline';
  const interactive = !disabled && (onClick != null || href != null || forced.state != null);
  const lines =
    linesProp ??
    (supportingText != null && (overline != null || (supportingMaxLines ?? 1) > 1)
      ? 3
      : supportingText != null || overline != null
        ? 2
        : 1);
  const tone = disabled ? null : dragged ? 'dragged' : selected ? 'selected' : null;
  // Leaving drag fades the 16% layer over 150ms; the flag clears once that has run.
  const [leavingDrag, setLeavingDrag] = useState(false);
  const wasDragged = useRef(dragged);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useLayoutEffect(() => {
    if (wasDragged.current === dragged) return;
    wasDragged.current = dragged;
    clearTimeout(leaveTimer.current);
    setLeavingDrag(!dragged);
    if (!dragged) leaveTimer.current = setTimeout(() => setLeavingDrag(false), DRAG_LAYER_OUT_MS);
  }, [dragged]);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);
  const itemContext = useMemo(() => ({ variant, selected }), [variant, selected]);
  const textTone = disabled
    ? s.textDisabled
    : tone === 'dragged'
      ? s.onDragged
      : tone === 'selected'
        ? s.onSelected
        : null;

  const body = (
    <>
      {(interactive || dragged) && <StateLayer />}
      {interactive && <Ripple disabled={disabled} />}
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
          <span {...stylex.props(expressive ? typescale.labelMedium : typescale.labelSmall, s.overline, textTone)}>
            {overline}
          </span>
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
            <span
              {...stylex.props(
                expressive ? typescale.labelLarge : [typescale.labelSmall, textBox.hug, textEnd.trimTracking],
                s.trailingText,
              )}
            >
              {trailingText}
            </span>
          )}
          {trailing}
        </span>
      )}
    </>
  );

  const styles = stylex.props(
    s.root,
    expressive
      ? s.expressive
      : [s.baseline, lines === 1 ? s.lines1 : lines === 2 ? s.lines2 : s.lines3, inheritSurface && s.inheritSurface],
    expressive && alignment === 'top' && s.top,
    variant === 'segmented' && s.segmentedFill,
    interactive && s.interactive,
    interactive && stateLayerHost.host,
    expressive && interactive && s.expressiveShapes,
    // Forced interaction states: the press keeps the hover layer under the ripple (kit).
    isInteractionState(forced.state) && [
      forcedStateLayer(forced.state, 'hover'),
      expressive && (forced.state === 'hovered' ? s.forceHover : s.forceFull),
    ],
    selected && !disabled && s.selected,
    selected && disabled && s.selectedDisabled,
    expressive && (selected || dragged) && s.forceFull,
    dragged && [stateLayerHost.forceDragged, s.dragged],
    !dragged && leavingDrag && s.leavingDrag,
    sx,
  );
  const common = {
    ...rest,
    ...styles,
    'data-ripple-host': interactive ? '' : undefined,
    'data-selected': selected ? '' : undefined,
  };

  let el: ReactNode;
  if (href != null && !disabled) {
    el = (
      <a ref={ref as Ref<HTMLAnchorElement>} href={href} onClick={onClick} {...common}>
        {body}
      </a>
    );
  } else if (onClick != null) {
    el = (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        type="button"
        disabled={disabled}
        aria-pressed={selected || undefined}
        onClick={onClick}
        {...common}
      >
        {body}
      </button>
    );
  } else {
    el = (
      <div ref={ref as Ref<HTMLDivElement>} aria-disabled={disabled || undefined} {...common}>
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
  const item = <ListItemContext value={itemContext}>{withDivider}</ListItemContext>;
  return list.inList ? <li {...stylex.props(s.li)}>{item}</li> : item;
}

/** A list row; memoised, so a parent re-render with the same props skips it. */
export const ListItem = memo(ListItemImpl);
