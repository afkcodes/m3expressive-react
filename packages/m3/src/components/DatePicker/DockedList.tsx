import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import { SvgIcon } from '../../primitives/SvgIcon.tsx';
import { DATE_PICKER_ICONS } from './icons.ts';

/*
 * The docked picker's month / year lists (Figma "Docked input date picker [desktop]", 51954:18567):
 * a 336px list of 48px rows (check + body-large, the selected row under an 8% layer; 16px end
 * gutter for the Outline scroll thumb).
 */
const s = stylex.create({
  listWrap: { position: 'relative', height: 336, flexShrink: 0 },
  list: {
    height: '100%',
    overflowY: 'auto',
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none' },
    margin: 0,
    padding: 0,
    paddingInlineEnd: 16,
    listStyle: 'none',
  },
  item: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    columnGap: 16,
    width: '100%',
    height: 48,
    boxSizing: 'border-box',
    margin: 0,
    paddingInline: 16,
    borderWidth: 0,
    borderStyle: 'none',
    outlineStyle: 'none',
    textAlign: 'start',
    cursor: 'pointer',
    color: color.onSurface,
    backgroundColor: {
      default: 'transparent',
      ':hover': `color-mix(in srgb, ${color.onSurface} 8%, transparent)`,
      ':focus-visible': `color-mix(in srgb, ${color.onSurface} 10%, transparent)`,
    },
  },
  itemSelected: { backgroundColor: `color-mix(in srgb, ${color.onSurface} 8%, transparent)` },
  check: { width: 24, height: 24, flexShrink: 0, color: color.onSurfaceVariant },
  thumb: {
    position: 'absolute',
    right: 4.4,
    width: 8.8,
    borderRadius: 4.4,
    backgroundColor: color.outline,
    pointerEvents: 'none',
  },
});

/** The scroll thumb's minimum length (px). */
const MIN_THUMB = 32;

/** Places the list's scroll thumb; false when the list doesn't scroll (no thumb). */
function paintThumb(list: HTMLElement | null, thumb: HTMLElement | null): boolean {
  if (!list) return false;
  const ratio = list.clientHeight / list.scrollHeight;
  if (ratio >= 1) return false;
  const height = Math.max(MIN_THUMB, list.clientHeight * ratio);
  if (thumb) {
    thumb.style.top = `${(list.scrollTop / (list.scrollHeight - list.clientHeight)) * (list.clientHeight - height)}px`;
    thumb.style.height = `${height}px`;
  }
  return true;
}

export function DockedList({
  items,
  selected,
  onPick,
  initialScroll,
}: {
  items: { key: number; label: ReactNode }[];
  selected: number;
  onPick: (key: number) => void;
  initialScroll: number;
}) {
  const list = useRef<HTMLUListElement>(null);
  const thumb = useRef<HTMLSpanElement | null>(null);
  // Only whether there is a thumb is state: scrolling moves it directly (no re-render of the rows).
  const [hasThumb, setHasThumb] = useState(false);
  useLayoutEffect(() => {
    if (list.current) list.current.scrollTop = initialScroll;
    setHasThumb(paintThumb(list.current, thumb.current));
  }, [initialScroll]);

  // A listbox with one tab stop (the selected item) that the arrow keys move; Home / End jump to
  // the first / last item, PageUp / PageDown by a list height (seven rows).
  const [focusKey, setFocusKey] = useState<number | null>(null);
  const keys = items.map((it) => it.key);
  const tabKey = focusKey ?? (keys.includes(selected) ? selected : keys[0]);
  const onKey = (e: KeyboardEvent) => {
    const i = keys.indexOf(tabKey!);
    const last = keys.length - 1;
    const steps: Record<string, number> = { ArrowUp: i - 1, ArrowDown: i + 1, Home: 0, End: last };
    const pages: Record<string, number> = { PageUp: Math.max(0, i - 7), PageDown: Math.min(last, i + 7) };
    const next = steps[e.key] ?? pages[e.key];
    if (next === undefined) return;
    e.preventDefault();
    if (next < 0 || next > last) return;
    setFocusKey(keys[next]!);
    list.current?.querySelector<HTMLElement>(`[data-key="${keys[next]}"]`)?.focus();
  };

  return (
    <div {...stylex.props(s.listWrap)}>
      <ul
        ref={list}
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role -- a styled list with listbox semantics (options are its <li> buttons)
        role="listbox"
        onScroll={() => setHasThumb(paintThumb(list.current, thumb.current))}
        onKeyDown={onKey}
        {...stylex.props(s.list)}
      >
        {items.map((it) => (
          <li key={it.key} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={it.key === selected}
              tabIndex={it.key === tabKey ? 0 : -1}
              data-key={it.key}
              onClick={() => onPick(it.key)}
              {...stylex.props(s.item, it.key === selected && s.itemSelected)}
            >
              <span {...stylex.props(s.check)}>{it.key === selected && <SvgIcon d={DATE_PICKER_ICONS.check} />}</span>
              <span {...stylex.props(typescale.bodyLarge, textBox.hug)}>{it.label}</span>
            </button>
          </li>
        ))}
      </ul>
      {hasThumb && (
        <span
          aria-hidden
          ref={(el) => {
            thumb.current = el;
            paintThumb(list.current, el);
          }}
          {...stylex.props(s.thumb)}
        />
      )}
    </div>
  );
}
