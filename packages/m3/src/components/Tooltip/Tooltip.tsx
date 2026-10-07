import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactElement, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { color } from '../../tokens/color.stylex';
import { elevation } from '../../tokens/elevation.stylex';
import { motion } from '../../tokens/motion.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { textBox } from '../../primitives/textBox.ts';
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
 *   Keyboard focus shows it until blur / Escape. Rich tooltips with actions are persistent: they
 *   stay when the pointer leaves and close on an outside press or Escape.
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
  richContent: { display: 'flex', flexDirection: 'column', rowGap: 4, paddingTop: 12, paddingInline: 16, paddingBottom: 4 },
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

export interface PlainTooltipSurfaceProps {
  children: ReactNode;
  sx?: StyleXStyles;
}

/** The plain tooltip container on its own (static rendering, custom positioning). */
export function PlainTooltipSurface({ children, sx }: PlainTooltipSurfaceProps) {
  return (
    <span {...stylex.props(typescale.bodySmall, s.plain, sx)}>
      <span {...stylex.props(textBox.hug, s.plainText)}>{children}</span>
    </span>
  );
}

export interface RichTooltipSurfaceProps {
  subhead?: ReactNode;
  children: ReactNode;
  /** Text buttons (size small). */
  actions?: ReactNode;
  sx?: StyleXStyles;
}

/** The rich tooltip container on its own (static rendering, custom positioning). */
export function RichTooltipSurface({ subhead, children, actions, sx }: RichTooltipSurfaceProps) {
  return (
    <div {...stylex.props(s.rich, sx)}>
      <div {...stylex.props(s.richContent)}>
        {subhead != null && <p {...stylex.props(typescale.titleSmall, s.text)}>{subhead}</p>}
        <p {...stylex.props(typescale.bodyMedium, s.text)}>{children}</p>
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

/** Open state + Compose's long-press / persistence rules, shared by plain and rich tooltips. */
function useTooltipBehaviour(persistent: boolean) {
  const [open, setOpen] = useState(false);
  const press = useRef({ timer: 0, dismiss: 0, held: false, due: false, suppressClick: false, pointerType: '' });

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
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

  const hide = () => {
    window.clearTimeout(press.current.dismiss);
    press.current.due = false;
    setOpen(false);
  };

  const release = () => {
    const p = press.current;
    window.clearTimeout(p.timer);
    if (!p.held) return;
    p.held = false;
    if (p.due) hide();
  };

  const onOpenChange = (next: boolean, details: ChangeDetails) => {
    // Compose's hover Enter / Exit react to mouse pointers only: the compatibility mouse events
    // that follow a touch (or a long press whose click was swallowed) neither show nor hide it.
    if (details.reason === 'trigger-hover' && (press.current.pointerType === 'touch' || press.current.pointerType === 'pen')) return;
    if (next) {
      setOpen(true);
      return;
    }
    // A long press owns the tooltip until the finger lifts (Compose consumes that gesture).
    if (press.current.held) return;
    // Compose: pointer Exit dismisses only a non-persistent tooltip.
    if (persistent && details.reason === 'trigger-hover') return;
    hide();
  };

  const triggerProps = {
    onPointerEnter(event: ReactPointerEvent) {
      press.current.pointerType = event.pointerType;
    },
    onPointerDown(event: ReactPointerEvent) {
      const p = press.current;
      p.pointerType = event.pointerType;
      p.suppressClick = false;
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      window.clearTimeout(p.timer);
      p.timer = window.setTimeout(() => {
        p.held = true;
        p.suppressClick = true;
        window.clearTimeout(p.dismiss);
        p.due = false;
        setOpen(true);
        if (!persistent) {
          p.dismiss = window.setTimeout(() => {
            if (p.held) p.due = true;
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

export interface TooltipProps {
  /** Tooltip text. */
  content: ReactNode;
  /** The trigger (must forward its ref, e.g. an IconButton). */
  children: ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Hover delay in ms. Compose shows on pointer enter: 0. */
  delay?: number;
}

/** Plain tooltip: shows on hover (immediately), keyboard focus or a touch long press. */
export function Tooltip({ content, children, side = 'top', delay = 0 }: TooltipProps) {
  const portalContainer = usePortalContainer();
  const { open, onOpenChange, triggerProps } = useTooltipBehaviour(false);
  return (
    <BaseTooltip.Root open={open} onOpenChange={onOpenChange}>
      <BaseTooltip.Trigger delay={delay} render={children} {...triggerProps} />
      <BaseTooltip.Portal container={portalContainer}>
        <BaseTooltip.Positioner side={side} sideOffset={4}>
          <BaseTooltip.Popup {...stylex.props(s.popup)}>
            <PlainTooltipSurface>{content}</PlainTooltipSurface>
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

export interface RichTooltipProps extends Omit<RichTooltipSurfaceProps, 'sx'> {
  /** The trigger (must forward its ref). */
  trigger: ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Rich tooltip: opens on hover (immediately), click or a touch long press. With actions it is
 * persistent — it stays until an outside press or Escape.
 */
export function RichTooltip({ trigger, side = 'bottom', ...surface }: RichTooltipProps) {
  const portalContainer = usePortalContainer();
  const { open, onOpenChange, triggerProps } = useTooltipBehaviour(surface.actions != null);
  return (
    <BasePopover.Root open={open} onOpenChange={onOpenChange}>
      <BasePopover.Trigger openOnHover delay={0} render={trigger} {...triggerProps} />
      <BasePopover.Portal container={portalContainer}>
        <BasePopover.Positioner side={side} sideOffset={4}>
          <BasePopover.Popup {...stylex.props(s.popup)}>
            <RichTooltipSurface {...surface} />
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
