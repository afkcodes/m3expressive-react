import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { List } from '../List/List.tsx';
import { ForceStateBoundary } from '../../testing/ForceState.tsx';
import { SearchBar } from './SearchBar.tsx';
import { searchViewVars } from './searchView.stylex.ts';
import { useSearchViewMotion } from './useSearchViewMotion.ts';

/*
 * Figma kit, "Search full-screen layout" / "Search docked layout" (59178:4963 / 4992; Compose
 * ExpandedFullScreenContainedSearchBar / ExpandedDockedSearchBarWithGap — the kit's geometry wins,
 * e.g. the 12px input inset).
 *   Full screen: the input bar 12px in from the sides over results 2px below, in a 16px-cornered
 *   surface (results clipped to 12px corners). Docked: the 360px bar over a Surface Container High
 *   result panel (12px corners) 2px below.
 * Motion (Compose SearchBarState, SearchBar.kt):
 *   - one progress drives the layout: full screen expands and collapses on fast spatial
 *     (rememberContainedSearchBarState), docked expands on default spatial and collapses on fast
 *     spatial (rememberSearchBarWithGapState);
 *   - full screen: the surface is full size at once with alpha = progress; the input's width lerps
 *     from the collapsed bar's width to the view's (minus its insets) and its centre from the
 *     collapsed bar's, its top from the bar's top (FullScreenSearchBarLayout); the results follow
 *     below it;
 *   - results fade with contentProgress: in 100ms after 50ms on standard accelerate
 *     (0.3, 0, 1, 1), out 100ms on standard decelerate (0, 0, 0, 1);
 *   - docked: the result panel shows once progress > 0.1, its list sliding in from −height/2 on
 *     the expand spring (out on the collapse spring), at alpha = contentProgress;
 *   - collapsing keeps the view mounted until the motion ends (content fades first), then it
 *     unmounts and calls onCollapsed.
 * Focus: expanding from a bar (`expandedFrom`) moves focus to the input; collapsing returns it to
 * the bar's trigger (when it was in the view); Tab stays inside the full-screen view while it's
 * open; Escape asks to collapse (`onDismiss` / `onOpenChange(false)`).
 */
const s = stylex.create({
  view: {
    position: 'relative',
    isolation: 'isolate',
    display: 'flex',
    flexDirection: 'column',
    rowGap: 2,
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  fullScreen: {
    borderRadius: 16,
    // The surface (searchViewVars.containerColor), faded by the expand progress.
    '::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      zIndex: -1,
      borderRadius: 'inherit',
      backgroundColor: searchViewVars.containerColor,
      opacity: 'var(--m3-search-surface-alpha, 1)',
      pointerEvents: 'none',
    },
  },
  header: { flexShrink: 0 },
  headerFull: { paddingInline: 12 },
  results: { overflow: 'hidden', borderRadius: 12 },
  resultsDocked: { backgroundColor: color.surfaceContainerHigh },
});

const TABBABLE = 'a[href], button, input, select, textarea, [tabindex]';
const tabbables = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (el) => el.tabIndex >= 0 && !el.matches(':disabled') && !el.closest('[inert]') && el.getClientRects().length > 0,
  );

export interface SearchViewProps {
  mode?: 'full-screen' | 'docked';
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Leading icon button (typically "back", closing the view). */
  leading?: ReactNode;
  /** Trailing icon buttons (clear / voice). */
  trailing?: ReactNode;
  /** Result rows (`ListItem`s). */
  children?: ReactNode;
  autoFocus?: boolean;
  /** Escape (Compose: back): collapse the view (set `open` false). Focus returns to the bar. */
  onDismiss?: () => void;
  /** Called with false on Escape, like `onDismiss` (for a controlled `open`). */
  onOpenChange?: (open: boolean) => void;
  /**
   * Expanded (default true). Set false to collapse: the view animates back and then unmounts
   * itself (keep rendering it), calling `onCollapsed`.
   */
  open?: boolean;
  /** The collapsed `SearchBar` the view expands from and collapses into. */
  expandedFrom?: RefObject<HTMLElement | null>;
  onCollapsed?: () => void;
  'aria-label'?: string;
  sx?: StyleXStyles;
}

/** The expanded search: an input bar over its results (place it in a dialog / popover). */
export function SearchView({
  mode = 'full-screen',
  value,
  onValueChange,
  placeholder,
  leading,
  trailing,
  children,
  autoFocus,
  onDismiss,
  onOpenChange,
  open = true,
  expandedFrom,
  onCollapsed,
  'aria-label': ariaLabel,
  sx,
}: SearchViewProps) {
  const full = mode === 'full-screen';
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLDivElement>(null);

  // Focus follows the expansion: into the input when the view opens from a bar, back to the bar's
  // trigger when it collapses (if focus was in the view, or nowhere).
  const wasOpen = useRef(false);
  useLayoutEffect(() => {
    if (!mounted) return;
    const from = expandedFrom?.current;
    if (open && !wasOpen.current && from) {
      bar.current?.querySelector('input')?.focus({ preventScroll: true });
    } else if (!open && wasOpen.current && from) {
      const active = document.activeElement;
      if (!active || active === document.body || root.current?.contains(active)) {
        const trigger = from.querySelector<HTMLElement>('[data-search-trigger]') ?? tabbables(from)[0];
        trigger?.focus({ preventScroll: true });
      }
    }
    wasOpen.current = open;
  }, [open, mounted, expandedFrom]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && (onDismiss || onOpenChange)) {
      e.stopPropagation();
      onDismiss?.();
      onOpenChange?.(false);
      return;
    }
    // Full screen covers the page: Tab cycles through the view.
    const el = root.current;
    if (e.key !== 'Tab' || !full || !open || !el) return;
    const list = tabbables(el);
    const active = document.activeElement;
    if (list.length === 0 || !active) {
      e.preventDefault();
      return;
    }
    const following = (other: Element) => !!(active.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING);
    const preceding = (other: Element) => !!(active.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_PRECEDING);
    if (e.shiftKey ? !list.some(preceding) : !list.some(following)) {
      e.preventDefault();
      (e.shiftKey ? list.at(-1) : list[0])?.focus();
    }
  };
  useSearchViewMotion({
    full,
    open,
    mounted,
    expandedFrom,
    rootRef: root,
    barRef: bar,
    resultsRef: results,
    onCollapsed: () => {
      setMounted(false);
      onCollapsed?.();
    },
  });

  if (!mounted) return null;
  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- Escape / Tab bubbling up from the field / results (delegation)
    <div
      ref={root}
      inert={!open || undefined}
      onKeyDown={onKeyDown}
      {...stylex.props(s.view, full && s.fullScreen, sx)}
    >
      <div {...stylex.props(s.header, full && s.headerFull)}>
        <SearchBar
          ref={bar}
          value={value}
          onValueChange={onValueChange}
          placeholder={placeholder}
          leading={leading}
          trailing={trailing}
          autoFocus={autoFocus}
          aria-label={ariaLabel}
        />
      </div>
      {children != null && (
        <div ref={results} {...stylex.props(s.results, !full && s.resultsDocked)}>
          <ForceStateBoundary>
            <List aria-label="Results">{children}</List>
          </ForceStateBoundary>
        </div>
      )}
    </div>
  );
}
