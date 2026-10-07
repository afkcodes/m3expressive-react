import {
  forwardRef,
  memo,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { typescale } from '../../tokens/typescale.ts';
import { Divider } from '../Divider/Divider.tsx';
import { InheritSurfaceContext } from './surface.ts';
import { legacyLeading, textBox, textEnd } from '../../primitives/textBox.ts';
import { forcedStateLayer, isInteractionState, StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import { ListContext, type ListItemVariant } from './context.ts';
import { listItemStyles as s } from './listItemStyles.ts';

export { ListContext };
export type { ListItemVariant };

/** Leaving drag fades the 16% layer out over this (Compose material-ripple StateLayer). */
const DRAG_LAYER_OUT_MS = 150;

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

const ListItemImpl = forwardRef<HTMLElement, ListItemProps>(function ListItem(
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
    expressive && list.segmented && s.segmentedFill,
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
  return list.inList ? <li {...stylex.props(s.li)}>{withDivider}</li> : withDivider;
});

/** A list row; memoised, so a parent re-render with the same props skips it. */
export const ListItem = memo(ListItemImpl);
