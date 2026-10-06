import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex';
import { motion } from '../../tokens/motion.stylex';
import { List } from '../List/List.tsx';
import { ForceStateBoundary } from '../../testing/ForceState.tsx';
import { SearchBar } from './SearchBar.tsx';

/*
 * Figma kit, "Search full-screen layout" / "Search docked layout" (59178:4963 / 4992; Compose
 * ExpandedFullScreenSearchBar / ExpandedDockedSearchBar).
 *   Full screen: the input bar 12px in from the sides over results 2px below, in a 16px-cornered
 *   surface (results clipped to 12px corners). Docked: the 360px bar over a Surface Container High
 *   result panel (12px corners) 2px below.
 * Motion (Compose rememberSearchBarState): expands on the slow spatial spring, collapses on the
 * default spatial spring; results fade in on a short standard-accelerate tween.
 */
const expand = stylex.keyframes({ from: { opacity: 0, transform: 'scaleY(0.92)' }, to: { opacity: 1, transform: 'none' } });

const s = stylex.create({
  view: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: 2,
    boxSizing: 'border-box',
    overflow: 'hidden',
    transformOrigin: 'top center',
    animationName: expand,
    animationDuration: motion.slowSpatialDuration,
    animationTimingFunction: motion.slowSpatialEasing,
  },
  fullScreen: { borderRadius: 16 },
  header: { flexShrink: 0 },
  headerFull: { paddingInline: 12 },
  results: { overflow: 'hidden', borderRadius: 12 },
  resultsDocked: { backgroundColor: color.surfaceContainerHigh },
});

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
  /** Escape (Compose: back) — close the view and return focus to the bar. */
  onDismiss?: () => void;
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
  'aria-label': ariaLabel,
  sx,
}: SearchViewProps) {
  const full = mode === 'full-screen';
  return (
    <div
      onKeyDown={(e) => {
        if (e.key === 'Escape' && onDismiss) {
          e.stopPropagation();
          onDismiss();
        }
      }}
      {...stylex.props(s.view, full && s.fullScreen, sx)}
    >
      <div {...stylex.props(s.header, full && s.headerFull)}>
        <SearchBar
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
        <div {...stylex.props(s.results, !full && s.resultsDocked)}>
          <ForceStateBoundary>
            <List aria-label="Results">{children}</List>
          </ForceStateBoundary>
        </div>
      )}
    </div>
  );
}
