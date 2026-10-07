import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  type ComponentPropsWithRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { color } from '../../tokens/color.stylex.ts';
import { elevation } from '../../tokens/elevation.stylex.ts';
import { motion } from '../../tokens/motion.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { textBox } from '../../primitives/textBox.ts';
import type { SxProps } from '../../primitives/types.ts';
import { usePortalContainer } from '../../theme/portal.tsx';

/*
 * Figma kit, "Tooltips" page: "Plain Tooltip" and "Rich Tooltip".
 *   Plain: inverse-surface, 4px corners, padding 4/8, body-small inverse-on-surface; hugs one line
 *   (the kit's multi-line variant is hidden; long text wraps at 200px per M3).
 *   Rich: 312px, surface-container, 12px corners, level 2; content padding 12/16/4/16, title-small
 *   subhead + body-medium text (on-surface-variant), 4px apart; a 40px actions row (padding 0 4,
 *   gap 8) 8px below, 8px bottom padding.
 *
 * Motion and behaviour — Compose material3 Tooltip.kt (TooltipBox, TooltipStateImpl) and
 * internal/BasicTooltip.kt (handleGestures, keyboardBehavior, BasicTooltipDefaults):
 *   scale 0.8 ⇄ 1 on FastSpatial + alpha on FastEffects, about the tooltip's centre
 *   (graphicsLayer's default transform origin).
 *   Mouse: shows on pointer Enter (no delay), hides on Exit unless persistent.
 *   Touch / pen: shows after a long press (Android ViewConfiguration long-press timeout, 400ms)
 *   and swallows that press's click; a non-persistent tooltip shown that way dismisses
 *   TooltipDuration (1500ms) later, or when the finger lifts if it is still down then.
 *   Keyboard focus shows it until blur / Escape. A `persistent` rich tooltip stays when the
 *   pointer leaves and closes on an outside press or Escape (Compose's default is not persistent).
 *   One tooltip is visible at a time (Compose's GlobalMutatorMutex).
 */
/** Android `ViewConfiguration.DEFAULT_LONG_PRESS_TIMEOUT` (Compose `longPressTimeoutMillis`). */
const LONG_PRESS_MS = 400;
/** `BasicTooltipDefaults.TooltipDuration`. */
const TOOLTIP_DURATION_MS = 1500;
const s = stylex.create({
  plain: {
    boxSizing: 'border-box',
    display: 'inline-block',
    maxWidth: 200,
    paddingBlock: 4,
    paddingInline: 8,
    borderRadius: 4,
    backgroundColor: color.inverseSurface,
    color: color.inverseOnSurface,
  },
  rich: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    rowGap: 8,
    width: 312,
    maxWidth: '100%',
    paddingBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: color.surfaceContainer,
    boxShadow: elevation.level2,
  },
  plainText: { display: 'block' },
  richContent: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: 4,
    paddingTop: 12,
    paddingInline: 16,
    paddingBottom: 4,
  },
  text: { margin: 0, color: color.onSurfaceVariant },
  actions: { display: 'flex', alignItems: 'center', columnGap: 8, height: 40, paddingInline: 4 },
  popup: {
    transformOrigin: 'center',
    opacity: { default: 1, ':is([data-starting-style], [data-ending-style])': 0 },
    scale: { default: '1', ':is([data-starting-style], [data-ending-style])': '0.8' },
    transitionProperty: 'opacity, scale',
    transitionDuration: `${motion.fastEffectsDuration}, ${motion.fastSpatialDuration}`,
    transitionTimingFunction: `${motion.fastEffectsEasing}, ${motion.fastSpatialEasing}`,
  },
});

export interface PlainTooltipSurfaceProps extends SxProps<ComponentPropsWithRef<'span'>> {
  children: ReactNode;
}

/** The plain tooltip container on its own (static rendering, custom positioning). */
export function PlainTooltipSurface({ children, sx, ...rest }: PlainTooltipSurfaceProps) {
  return (
    <span {...rest} {...stylex.props(typescale.bodySmall, s.plain, sx)}>
      <span {...stylex.props(textBox.hug, s.plainText)}>{children}</span>
    </span>
  );
}

export interface RichTooltipSurfaceProps extends SxProps<ComponentPropsWithRef<'div'>> {
  subhead?: ReactNode;
  /** The supporting text. */
  children: ReactNode;
  /** Text buttons (size small). */
  actions?: ReactNode;
}

/** Inside a RichTooltip: ids for the surface's texts, which name and describe the popup dialog. */
const RichTooltipTextIds = createContext<{ subhead: string; text: string } | null>(null);

/** The rich tooltip container on its own (static rendering, custom positioning). */
export function RichTooltipSurface({ subhead, children, actions, sx, ...rest }: RichTooltipSurfaceProps) {
  const ids = useContext(RichTooltipTextIds);
  return (
    <div {...rest} {...stylex.props(s.rich, sx)}>
      <div {...stylex.props(s.richContent)}>
        {subhead != null && (
          <p id={ids?.subhead} {...stylex.props(typescale.titleSmall, s.text)}>
            {subhead}
          </p>
        )}
        <p id={ids?.text} {...stylex.props(typescale.bodyMedium, s.text)}>
          {children}
        </p>
      </div>
      {actions != null && <div {...stylex.props(s.actions)}>{actions}</div>}
    </div>
  );
}

// Compose's GlobalMutatorMutex: showing a tooltip dismisses the one on screen.
let closeVisibleTooltip: (() => void) | null = null;

interface ChangeDetails {
  reason: string;
}

interface OpenState<Details> {
  open?: boolean;
  defaultOpen?: boolean;
  /**
   * `details` are Base UI's when it changes the state; none for a long press, its timeout or
   * another tooltip showing.
   */
  onOpenChange?: (open: boolean, details?: Details) => void;
}

/** Open state + Compose's long-press / persistence rules, shared by plain and rich tooltips. */
function useTooltipBehaviour<Details extends ChangeDetails>(
  persistent: boolean,
  { open: openProp, defaultOpen = false, onOpenChange: onChange }: OpenState<Details>,
) {
  const [open, setOpenState] = useControllableState<boolean, [Details?]>(openProp, defaultOpen, onChange);
  // Timers and the one-tooltip rule outlive renders: they call the latest setter.
  const setOpenRef = useRef(setOpenState);
  useLayoutEffect(() => {
    setOpenRef.current = setOpenState;
  });
  const setOpen = (next: boolean, details?: Details) => setOpenRef.current(next, details);
  const press = useRef({ timer: 0, dismiss: 0, held: false, due: false, suppressClick: false, pointerType: '' });

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpenRef.current(false);
    closeVisibleTooltip?.();
    closeVisibleTooltip = close;
    return () => {
      if (closeVisibleTooltip === close) closeVisibleTooltip = null;
    };
  }, [open]);

  useEffect(
    () => () => {
      window.clearTimeout(press.current.timer);
      window.clearTimeout(press.current.dismiss);
    },
    [],
  );

  const hide = (details?: Details) => {
    window.clearTimeout(press.current.dismiss);
    press.current.due = false;
    setOpen(false, details);
  };

  const release = () => {
    const state = press.current;
    window.clearTimeout(state.timer);
    if (!state.held) return;
    state.held = false;
    if (state.due) hide();
  };

  const onOpenChange = (next: boolean, details: Details) => {
    // Compose's hover Enter / Exit react to mouse pointers only: the compatibility mouse events
    // that follow a touch (or a long press whose click was swallowed) neither show nor hide it.
    if (
      details.reason === 'trigger-hover' &&
      (press.current.pointerType === 'touch' || press.current.pointerType === 'pen')
    )
      return;
    if (next) {
      setOpen(true, details);
      return;
    }
    // A long press owns the tooltip until the finger lifts (Compose consumes that gesture).
    if (press.current.held) return;
    // Compose: pointer Exit dismisses only a non-persistent tooltip.
    if (persistent && details.reason === 'trigger-hover') return;
    hide(details);
  };

  const triggerProps = {
    onPointerEnter(event: ReactPointerEvent) {
      press.current.pointerType = event.pointerType;
    },
    onPointerDown(event: ReactPointerEvent) {
      const state = press.current;
      state.pointerType = event.pointerType;
      state.suppressClick = false;
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      window.clearTimeout(state.timer);
      state.timer = window.setTimeout(() => {
        state.held = true;
        state.suppressClick = true;
        window.clearTimeout(state.dismiss);
        state.due = false;
        setOpen(true);
        if (!persistent) {
          state.dismiss = window.setTimeout(() => {
            if (state.held) state.due = true;
            else hide();
          }, TOOLTIP_DURATION_MS);
        }
      }, LONG_PRESS_MS);
    },
    onPointerUp: release,
    onPointerCancel: release,
    onClickCapture(event: ReactMouseEvent) {
      if (!press.current.suppressClick) return;
      press.current.suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    },
    onContextMenu(event: ReactMouseEvent) {
      if (press.current.held) event.preventDefault();
    },
  };

  return { open, onOpenChange, triggerProps };
}

/**
 * `ref`, native props and `sx` go to the popup (the element that scales and fades in); `children`
 * is the trigger and `content` the text (the native `content` attribute is omitted).
 */
export interface TooltipProps
  extends
    SxProps<Omit<ComponentPropsWithRef<'div'>, 'content' | 'children'>>,
    OpenState<BaseTooltip.Root.ChangeEventDetails> {
  /** Tooltip text. */
  content: ReactNode;
  /** The trigger: an element that accepts `ref` and spreads its props (e.g. an IconButton). */
  children: ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Hover delay in ms. Compose shows on pointer enter: 0. */
  delay?: number;
}

/** Plain tooltip: shows on hover (immediately), keyboard focus or a touch long press. */
export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 0,
  open: openProp,
  defaultOpen,
  onOpenChange: onOpenChangeProp,
  sx,
  ...rest
}: TooltipProps) {
  const portalContainer = usePortalContainer();
  const { open, onOpenChange, triggerProps } = useTooltipBehaviour(false, {
    open: openProp,
    defaultOpen,
    onOpenChange: onOpenChangeProp,
  });
  return (
    <BaseTooltip.Root open={open} onOpenChange={onOpenChange}>
      <BaseTooltip.Trigger delay={delay} render={children} {...triggerProps} />
      <BaseTooltip.Portal container={portalContainer}>
        <BaseTooltip.Positioner side={side} sideOffset={4}>
          <BaseTooltip.Popup {...rest} {...stylex.props(s.popup, sx)}>
            <PlainTooltipSurface>{content}</PlainTooltipSurface>
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

/**
 * `ref`, native props and `sx` go to the popup (the element that scales and fades in), which holds
 * the rich tooltip surface: `subhead`, `children` (the supporting text) and `actions`.
 */
export interface RichTooltipProps
  extends SxProps<Omit<ComponentPropsWithRef<'div'>, 'children'>>, OpenState<BasePopover.Root.ChangeEventDetails> {
  /** The trigger: an element that accepts `ref` and spreads its props. */
  trigger: ReactElement;
  subhead?: ReactNode;
  /** The supporting text. */
  children: ReactNode;
  /** Text buttons (size small). */
  actions?: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  /**
   * Stay open when the pointer leaves, until an outside press or Escape (Compose
   * `rememberTooltipState(isPersistent = true)`). Default false, as in Compose: the tooltip
   * dismisses once the pointer has left both the trigger and the tooltip (moving into it to
   * reach its actions keeps it open).
   */
  persistent?: boolean;
}

/** Rich tooltip: opens on hover (immediately), click or a touch long press. */
export function RichTooltip({
  trigger,
  side = 'bottom',
  persistent = false,
  subhead,
  children,
  actions,
  open: openProp,
  defaultOpen,
  onOpenChange: onOpenChangeProp,
  sx,
  ...rest
}: RichTooltipProps) {
  const portalContainer = usePortalContainer();
  const { open, onOpenChange, triggerProps } = useTooltipBehaviour(persistent, {
    open: openProp,
    defaultOpen,
    onOpenChange: onOpenChangeProp,
  });
  // The popup is a dialog: named by the subhead (else the text), described by the text — unless the
  // app names it itself.
  const id = useId();
  const ids = useMemo(() => ({ subhead: `${id}-subhead`, text: `${id}-text` }), [id]);
  const named = rest['aria-label'] != null || rest['aria-labelledby'] != null;
  return (
    <BasePopover.Root open={open} onOpenChange={onOpenChange}>
      <BasePopover.Trigger openOnHover delay={0} render={trigger} {...triggerProps} />
      <BasePopover.Portal container={portalContainer}>
        <BasePopover.Positioner side={side} sideOffset={4}>
          <BasePopover.Popup
            aria-labelledby={named ? undefined : subhead != null ? ids.subhead : ids.text}
            aria-describedby={subhead != null ? ids.text : undefined}
            {...rest}
            {...stylex.props(s.popup, sx)}
          >
            <RichTooltipTextIds value={ids}>
              <RichTooltipSurface subhead={subhead} actions={actions}>
                {children}
              </RichTooltipSurface>
            </RichTooltipTextIds>
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
