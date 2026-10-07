import type { ComponentPropsWithRef, MouseEventHandler, ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import { interaction } from '../../primitives/state.stylex.ts';
import { state } from '../../tokens/state.stylex.ts';
import { forcedStateLayer, StateLayer } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import type { SxProps } from '../../primitives/types.ts';
import { ForceStateBoundary, useForcedState } from '../../testing/ForceState.tsx';

/*
 * Figma kit, "Search" page (Search bar 52977:33813; Compose SearchBar / SearchBarDefaults).
 *   56px, fully rounded, Surface Container High; 4px inner padding around a 48px leading icon
 *   button, the body-large hint (On Surface Variant) or input (On Surface) 4px after it, and
 *   trailing icon buttons / a 30px avatar (8 / 12px around it). Hover 8%; press adds the ripple
 *   (under the icons, like the kit's Ripple layer).
 */
const s = stylex.create({
  bar: {
    position: 'relative',
    isolation: 'isolate',
    display: 'flex',
    alignItems: 'center',
    columnGap: 4,
    boxSizing: 'border-box',
    width: '100%',
    height: 56,
    padding: 4,
    borderRadius: 28,
    overflow: 'hidden',
    color: color.onSurfaceVariant,
    backgroundColor: color.surfaceContainerHigh,
    [interaction.layerColor]: color.onSurface,
    [interaction.rippleColor]: color.onSurface,
  },
  // Trigger mode: the hint is a real button stretched over the bar (::after), so the icon buttons
  // aren't nested in an interactive element; the bar shows the button's focus as its own.
  triggerHost: {
    [interaction.layerOpacity]: {
      default: '0',
      ':hover': { default: '0', '@media (hover: hover)': state.hoverOpacity },
      ':has([data-search-trigger]:focus-visible)': {
        default: state.focusOpacity,
        '@media (hover: hover)': state.focusOpacity,
      },
    },
    [interaction.layerDuration]: {
      default: '15ms',
      ':has([data-search-trigger]:focus-visible)': { default: '45ms', '@media (hover: hover)': '45ms' },
    },
  },
  trigger: {
    display: 'block',
    width: '100%',
    margin: 0,
    padding: 0,
    borderWidth: 0,
    borderStyle: 'none',
    outlineStyle: 'none',
    backgroundColor: 'transparent',
    textAlign: 'start',
    cursor: 'text',
    '::after': { content: '""', position: 'absolute', inset: 0 },
  },
  // Above the trigger's stretched hit area.
  slot: { position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', flexShrink: 0 },
  text: { flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center' },
  textNoLeading: { paddingInlineStart: 20 },
  hint: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: color.onSurfaceVariant },
  input: {
    flexGrow: 1,
    minWidth: 0,
    margin: 0,
    padding: 0,
    borderWidth: 0,
    borderStyle: 'none',
    outlineStyle: 'none',
    backgroundColor: 'transparent',
    color: color.onSurface,
    caretColor: color.primary,
    '::placeholder': { color: color.onSurfaceVariant, opacity: 1 },
    // The view draws its own clear button.
    '::-webkit-search-cancel-button': { appearance: 'none' },
    '::-webkit-search-decoration': { appearance: 'none' },
  },
  // Trailing icons and the avatar share one slot (the kit's Trailing-Elements: no gap between them).
  avatar: { display: 'flex', alignItems: 'center', paddingInlineStart: 8, paddingInlineEnd: 12, height: 48 },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: 0 },
  // The kit's static caret (visual tests only; live inputs use the native caret): 1px, 16px tall,
  // 1px after the text, centred on that x (a half-pixel stroke — transform, layout snaps).
  caretBox: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  caretMirror: { visibility: 'hidden', whiteSpace: 'pre' },
  caret: {
    width: 1,
    height: 16,
    marginInlineStart: 1,
    backgroundColor: color.primary,
    transform: 'translateX(-0.5px)',
  },
});

/**
 * The root is the bar `<div>` (`ref`, native props, `sx`). `aria-label` and `autoFocus` go to the
 * trigger button / the input, which they name and focus.
 */
export interface SearchBarProps extends SxProps<Omit<ComponentPropsWithRef<'div'>, 'children' | 'defaultValue'>> {
  /**
   * `trigger` (default): the bar is a button that opens a search view (`onActivate`). `input`: the
   * bar is the search field (`value` / `defaultValue` / `onValueChange`), e.g. in a `SearchView`.
   */
  mode?: 'trigger' | 'input';
  /** Hint text (placeholder). */
  placeholder?: string;
  /** Input mode: the query. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Leading icon button (search / menu / back). */
  leading?: ReactNode;
  /** Trailing icon buttons. */
  trailing?: ReactNode;
  /** A 30px avatar after the trailing icons. */
  avatar?: ReactNode;
  /** Trigger mode: activate (e.g. open a search view). */
  onActivate?: MouseEventHandler<HTMLButtonElement>;
}

export function SearchBar({
  mode = 'trigger',
  placeholder,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  leading,
  trailing,
  avatar,
  onActivate,
  'aria-label': ariaLabel,
  autoFocus,
  sx,
  ...rest
}: SearchBarProps) {
  const forced = useForcedState();
  const input = mode === 'input';
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange);
  return (
    <div
      role={input ? 'search' : undefined}
      {...rest}
      {...stylex.props(
        s.bar,
        // The expanded input bar is a text field: no state layer (Compose InputField).
        !input && s.triggerHost,
        !input && forcedStateLayer(forced.state, 'hover'),
        sx,
      )}
    >
      {!input && <StateLayer />}
      {leading != null && (
        <span {...stylex.props(s.slot)}>
          <ForceStateBoundary>{leading}</ForceStateBoundary>
        </span>
      )}
      <span {...stylex.props(s.text, leading == null && s.textNoLeading)}>
        {input ? (
          <span {...stylex.props(s.inputWrap)}>
            <input
              type="search"
              value={value}
              placeholder={placeholder}
              aria-label={ariaLabel ?? placeholder}
              autoFocus={autoFocus}
              onChange={(e) => setValue(e.target.value)}
              {...stylex.props(typescale.bodyLarge, s.input)}
            />
            {forced.state === 'focused' && (
              <span aria-hidden {...stylex.props(s.caretBox)}>
                <span {...stylex.props(typescale.bodyLarge, textBox.hug, s.caretMirror)}>{value}</span>
                <span {...stylex.props(s.caret)} />
              </span>
            )}
          </span>
        ) : (
          <button
            type="button"
            data-search-trigger=""
            data-ripple-host=""
            aria-label={ariaLabel}
            autoFocus={autoFocus}
            onClick={onActivate}
            {...stylex.props(typescale.bodyLarge, s.hint, s.trigger)}
          >
            <Ripple />
            {placeholder}
          </button>
        )}
      </span>
      {(trailing != null || avatar != null) && (
        <span {...stylex.props(s.slot)}>
          <ForceStateBoundary>
            {trailing}
            {avatar != null && <span {...stylex.props(s.avatar)}>{avatar}</span>}
          </ForceStateBoundary>
        </span>
      )}
    </div>
  );
}
