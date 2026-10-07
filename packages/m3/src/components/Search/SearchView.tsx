import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { useMergedRefs } from '../../hooks/useMergedRefs.ts';
import type { SxProps } from '../../primitives/types.ts';
import { useLabels, type M3Labels } from '../../theme/labels.tsx';
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
 *     unmounts and calls onOpenChangeComplete(false).
 * Focus: expanding from a bar (`expandedFrom`) moves focus to the input; collapsing returns it to
 * the bar's trigger (when it was in the view); Tab stays inside the full-screen view while it's
 * open; Escape asks to collapse (`onOpenChange(false)`).
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

/**
 * The view's surface `<div>` takes `ref`, native props and `sx`; `aria-label` and `autoFocus` go to
 * its search field.
 */
export interface SearchViewProps extends SxProps<Omit<ComponentPropsWithRef<'div'>, 'children' | 'defaultValue'>> {
  /** Full screen (default), or docked: a result panel under the bar. */
  layout?: 'fullScreen' | 'docked';
  /** The query. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** Leading icon button (typically "back", closing the view). */
  leading?: ReactNode;
  /** Trailing icon buttons (clear / voice). */
  trailing?: ReactNode;
  /** Result rows (`ListItem`s). */
  children?: ReactNode;
  /**
   * Expanded (default true). Set false to collapse: the view animates back and then unmounts
   * itself (keep rendering it).
   */
  open?: boolean;
  defaultOpen?: boolean;
  /** Escape (Compose: back) asks to collapse: `onOpenChange(false)`. Focus returns to the bar. */
  onOpenChange?: (open: boolean) => void;
  /** The expand (true) or collapse (false, the view has unmounted) motion has finished. */
  onOpenChangeComplete?: (open: boolean) => void;
  /** The collapsed `SearchBar` the view expands from and collapses into. */
  expandedFrom?: RefObject<HTMLElement | null>;
  /** Overrides the built-in strings (`searchResults`, the results list's name). */
  labels?: Partial<M3Labels>;
}

/** The expanded search: an input bar over its results (place it in a dialog / popover). */
export function SearchView({
  layout = 'fullScreen',
  value: valueProp,
  defaultValue = '',
  onValueChange,
  placeholder,
  leading,
  trailing,
  children,
  autoFocus,
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  onOpenChangeComplete,
  expandedFrom,
  labels: labelOverrides,
  'aria-label': ariaLabel,
  sx,
  ref,
  onKeyDown: onKeyDownProp,
  ...rest
}: SearchViewProps) {
  const full = layout === 'fullScreen';
  const labels = useLabels(labelOverrides);
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange);
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange);
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const root = useRef<HTMLDivElement>(null);
  const setRoot = useMergedRefs(root, ref);
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
    onKeyDownProp?.(e);
    // Escape collapses an uncontrolled view, or asks the owner of `open` to.
    if (e.key === 'Escape' && (openProp === undefined || onOpenChange)) {
      e.stopPropagation();
      setOpen(false);
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
    onExpanded: () => onOpenChangeComplete?.(true),
    onCollapsed: () => {
      setMounted(false);
      onOpenChangeComplete?.(false);
    },
  });

  if (!mounted) return null;
  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- Escape / Tab bubbling up from the field / results (delegation)
    <div
      ref={setRoot}
      inert={!open || undefined}
      {...rest}
      onKeyDown={onKeyDown}
      {...stylex.props(s.view, full && s.fullScreen, sx)}
    >
      <div {...stylex.props(s.header, full && s.headerFull)}>
        <SearchBar
          ref={bar}
          mode="input"
          value={value}
          onValueChange={setValue}
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
            <List aria-label={labels.searchResults}>{children}</List>
          </ForceStateBoundary>
        </div>
      )}
    </div>
  );
}
