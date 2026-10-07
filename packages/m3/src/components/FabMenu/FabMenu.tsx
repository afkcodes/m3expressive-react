import {
  Children,
  isValidElement,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { FabMenuContext, FabMenuIndexContext } from './context.ts';
import { fabMenuStyles as s, type FabMenuColor } from './fabMenuStyles.ts';
import { FabMenuToggle } from './FabMenuToggle.tsx';
import { rovingIndex } from './roving.ts';
import { useStagger } from './useStagger.ts';

export type { FabMenuColor };

/*
 * FAB menu — Figma kit, Buttons page, "FAB menu" (layout and colours in fabMenuStyles.ts); motion
 * from Compose FloatingActionButtonMenu.kt (androidx-main):
 *   - The FAB and the close button are one toggle morphing on a checked progress (FabMenuToggle).
 *   - Items stagger in from the bottom and out from the top (useStagger); each reveals from its
 *     end edge with its width and alpha (useItemReveal). The list unmounts once every item has
 *     faded out.
 * Keyboard (menu pattern): opening from the toggle moves focus to the first item as soon as it is
 * drawn; the items are one tab stop (roving tabindex: arrows, Home / End); Escape closes and
 * returns focus to the toggle.
 */
export interface FabMenuProps {
  color?: FabMenuColor;
  /** Controlled open state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Icon of the closed FAB (use currentColor). */
  icon?: ReactNode;
  /** Accessible name of the closed FAB. */
  'aria-label': string;
  /** Accessible name of the close button. */
  closeLabel?: string;
  /** <FabMenuItem/>s, top to bottom. */
  children?: ReactNode;
  sx?: StyleXStyles;
}

export function FabMenu({
  color = 'primary',
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  icon,
  'aria-label': label,
  closeLabel = 'Close menu',
  children,
  sx,
}: FabMenuProps) {
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange);
  const listRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  // Roving tab stop (item index) and a pending "focus the first item once it is drawn".
  const [tabStop, setTabStop] = useState(0);
  const focusFirst = useRef(false);
  const menuItems = () => Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? []);
  const close = useCallback(() => {
    focusFirst.current = false;
    setOpen(false);
    requestAnimationFrame(() => fabRef.current?.focus());
  }, [setOpen]);
  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'Escape') return close();
    const list = menuItems();
    const next = rovingIndex(e.key, list.indexOf(document.activeElement as HTMLElement), list.length);
    // Home / End only within the items (the toggle keeps its own keys).
    if (next == null || ((e.key === 'Home' || e.key === 'End') && !listRef.current?.contains(e.target as Node))) return;
    focusFirst.current = false;
    list[next]?.focus();
    e.preventDefault();
  };
  const items = Children.toArray(children).filter(isValidElement);
  const total = items.length;
  const { count, mounted, onShown } = useStagger(open, total, (index) => {
    // The first item is drawn (alpha > 0): it can take focus now.
    if (index !== 0 || !focusFirst.current) return;
    focusFirst.current = false;
    menuItems()[0]?.focus();
  });
  const hasMenu = total > 0;
  const menu = useMemo(
    () => ({ color, close, animated: true, total, visibleCount: count, tabStop, onShown, onItemFocus: setTabStop }),
    [color, close, total, count, tabStop, onShown],
  );

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- arrow-key navigation delegated from the items
    <span {...stylex.props(s.root, sx)} onKeyDown={onKeyDown}>
      {mounted && hasMenu && (
        // Closing: the items fade out but are no longer part of the menu.
        <div ref={listRef} id={listId} role="menu" aria-label={label} inert={!open} {...stylex.props(s.list)}>
          <FabMenuContext value={menu}>
            {items.map((child, index) => (
              <FabMenuIndexContext key={child.key ?? index} value={index}>
                {child}
              </FabMenuIndexContext>
            ))}
          </FabMenuContext>
        </div>
      )}
      <FabMenuToggle
        ref={fabRef}
        open={open}
        color={color}
        icon={icon}
        aria-label={open ? closeLabel : label}
        aria-haspopup={hasMenu ? 'menu' : undefined}
        aria-controls={mounted && hasMenu ? listId : undefined}
        onClick={() => {
          if (open) return close();
          setTabStop(0);
          focusFirst.current = hasMenu;
          setOpen(true);
          // Reopened while the first item is still drawn (closing): it won't report being shown.
          requestAnimationFrame(() => {
            if (!focusFirst.current) return;
            const first = menuItems()[0];
            first?.focus();
            if (first && document.activeElement === first) focusFirst.current = false;
          });
        }}
      />
    </span>
  );
}
