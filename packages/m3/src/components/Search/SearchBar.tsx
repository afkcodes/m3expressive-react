import { forwardRef, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
import { interaction } from '../../primitives/state.stylex';
import { state } from '../../tokens/state.stylex';
import { StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
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
      ':has([data-search-trigger]:focus-visible)': { default: state.focusOpacity, '@media (hover: hover)': state.focusOpacity },
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
  caretBox: { position: 'absolute', left: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none' },
  caretMirror: { visibility: 'hidden', whiteSpace: 'pre' },
  caret: { width: 1, height: 16, marginInlineStart: 1, backgroundColor: color.primary, transform: 'translateX(-0.5px)' },
});

export interface SearchBarProps {
  /** Hint text (placeholder). */
  placeholder?: string;
  /** Provide value / onValueChange to make the bar an input; otherwise it's a trigger. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Leading icon button (search / menu / back). */
  leading?: ReactNode;
  /** Trailing icon buttons. */
  trailing?: ReactNode;
  /** A 30px avatar after the trailing icons. */
  avatar?: ReactNode;
  /** Trigger mode: activate (e.g. open a search view). */
  onActivate?: () => void;
  'aria-label'?: string;
  autoFocus?: boolean;
  sx?: StyleXStyles;
}

export const SearchBar = forwardRef<HTMLDivElement, SearchBarProps>(function SearchBar(
  { placeholder, value, onValueChange, leading, trailing, avatar, onActivate, 'aria-label': ariaLabel, autoFocus, sx },
  ref,
) {
  const forced = useForcedState();
  const input = onValueChange != null;
  return (
    <div
      ref={ref}
      role={input ? 'search' : undefined}
      {...stylex.props(
        s.bar,
        // The expanded input bar is a text field: no state layer (Compose InputField).
        !input && s.triggerHost,
        !input && forced.state === 'hovered' && stateLayerHost.forceHover,
        !input && forced.state === 'pressed' && stateLayerHost.forceHover,
        !input && forced.state === 'focused' && stateLayerHost.forceFocus,
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
              value={value ?? ''}
              placeholder={placeholder}
              aria-label={ariaLabel ?? placeholder}
              autoFocus={autoFocus}
              onChange={(e) => onValueChange?.(e.target.value)}
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
});
