import { forwardRef, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Dialog } from '@base-ui/react/dialog';
import { color } from '../../tokens/color.stylex';
import { elevation } from '../../tokens/elevation.stylex';
import { motion } from '../../tokens/motion.stylex';
import { usePortalContainer } from '../../theme/portal.tsx';
import { scrim } from './scrim.ts';

/*
 * Figma kit, "Sheets" page (Bottom sheet set 51827:5859; Compose ModalBottomSheet /
 * BottomSheetScaffold, BottomSheetDefaults).
 *   Surface Container Low, 28px top corners, a 36px header holding the 32×4 Outline drag handle
 *   (16px padding), then the content. Standard sheets cast elevation 3; modal sheets sit flat on a
 *   32% Scrim.
 * Motion (Compose BottomSheet): shows on the default spatial spring, hides on fast effects, drags
 *   settle on default spatial; the scrim fades on default effects. Dragging dismisses past 56px or
 *   faster than 125px/s (BottomSheetDefaults.PositionalThreshold / VelocityThreshold).
 */
const s = stylex.create({
  sheet: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    width: '100%',
    maxWidth: 640,
    overflow: 'hidden',
    color: color.onSurface,
    backgroundColor: color.surfaceContainerLow,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  standard: { boxShadow: elevation.level3 },
  header: { display: 'flex', justifyContent: 'center', flexShrink: 0, padding: 16, touchAction: 'none' },
  handleButton: {
    margin: 0,
    borderWidth: 0,
    borderStyle: 'none',
    backgroundColor: 'transparent',
    cursor: 'grab',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineColor: color.secondary,
    outlineWidth: 3,
    outlineOffset: 2,
  },
  handle: { display: 'block', width: 32, height: 4, borderRadius: 2, backgroundColor: color.outline },
  content: { flexGrow: 1, minHeight: 0, overflowY: 'auto' },
  // Modal placement and motion.
  popup: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    maxHeight: 'calc(100% - 72px)',
    outlineStyle: 'none',
    translate: { default: '0 0', ':is([data-starting-style], [data-ending-style])': '0 100%' },
    transitionProperty: 'translate',
    transitionDuration: { default: motion.defaultSpatialDuration, ':is([data-ending-style])': motion.fastEffectsDuration },
    transitionTimingFunction: { default: motion.defaultSpatialEasing, ':is([data-ending-style])': motion.fastEffectsEasing },
  },
  popupSheet: { maxHeight: '100%' },
});

export interface BottomSheetProps {
  /** Modal styling (flat, over a scrim). `ModalBottomSheet` sets it. */
  modal?: boolean;
  /** The drag handle (default true). */
  dragHandle?: boolean;
  /** Accessible name of the handle when it can dismiss the sheet. */
  handleLabel?: string;
  /** Activating the handle (click / Enter) dismisses the sheet. */
  onHandleActivate?: () => void;
  onHandlePointerDown?: (e: ReactPointerEvent<HTMLElement>) => void;
  children?: ReactNode;
  sx?: StyleXStyles;
}

/** The bottom sheet surface (standard sheets sit in the layout; see `ModalBottomSheet`). */
export const BottomSheet = forwardRef<HTMLDivElement, BottomSheetProps>(function BottomSheet(
  { modal = false, dragHandle = true, handleLabel = 'Close sheet', onHandleActivate, onHandlePointerDown, children, sx },
  ref,
) {
  return (
    <div ref={ref} {...stylex.props(s.sheet, !modal && s.standard, sx)}>
      {dragHandle && (
        <div onPointerDown={onHandlePointerDown} {...stylex.props(s.header)}>
          {onHandleActivate ? (
            <button type="button" aria-label={handleLabel} onClick={onHandleActivate} {...stylex.props(s.handleButton, s.handle)} />
          ) : (
            <span aria-hidden {...stylex.props(s.handle)} />
          )}
        </div>
      )}
      <div {...stylex.props(s.content)}>{children}</div>
    </div>
  );
});

const POSITIONAL = 56;
const VELOCITY = 0.125; // px / ms

export interface ModalBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dragHandle?: boolean;
  'aria-label'?: string;
  children?: ReactNode;
  sx?: StyleXStyles;
}

/** A modal bottom sheet: scrim, focus trap, Escape / scrim / handle / drag to dismiss. */
export function ModalBottomSheet({ open, onOpenChange, dragHandle = true, 'aria-label': ariaLabel, children, sx }: ModalBottomSheetProps) {
  const portal = usePortalContainer();
  const popup = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; y0: number; dy: number; t: number; v: number; active: boolean } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0 || !popup.current) return;
    drag.current = { id: e.pointerId, y0: e.clientY, dy: 0, t: e.timeStamp, v: 0, active: false };
    const target = e.currentTarget;
    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d || ev.pointerId !== d.id || !popup.current) return;
      const raw = ev.clientY - d.y0;
      // Start dragging past a 4px slop, so a tap still clicks the handle.
      if (!d.active) {
        if (Math.abs(raw) < 4) return;
        d.active = true;
        target.setPointerCapture(d.id);
        popup.current.style.transition = 'none';
      }
      // Above the expanded anchor the sheet resists (Compose boundary dampening).
      const dy = raw < 0 ? raw / 4 : raw;
      d.v = (dy - d.dy) / Math.max(1, ev.timeStamp - d.t);
      d.dy = dy;
      d.t = ev.timeStamp;
      popup.current.style.translate = `0 ${dy}px`;
    };
    const up = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d || ev.pointerId !== d.id) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      drag.current = null;
      const el = popup.current;
      if (!d.active || !el) return;
      // A pointer that rested before release has no fling velocity (VelocityTracker horizon).
      const v = ev.timeStamp - d.t > 100 ? 0 : d.v;
      const dismiss = v > VELOCITY || (v > -VELOCITY && d.dy > POSITIONAL);
      // Settles on the default spatial spring either way (anchoredDraggableMotionSpec).
      el.style.transition = `translate ${motion.defaultSpatialDuration} ${motion.defaultSpatialEasing}`;
      el.style.translate = dismiss ? '0 100%' : '0 0';
      if (dismiss) onOpenChange(false);
      else
        el.addEventListener(
          'transitionend',
          () => {
            el.style.transition = '';
            el.style.translate = '';
          },
          { once: true },
        );
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal container={portal}>
        <Dialog.Backdrop {...stylex.props(scrim.backdrop)} />
        <Dialog.Popup ref={popup} aria-label={ariaLabel} {...stylex.props(s.popup)}>
          <BottomSheet
            modal
            dragHandle={dragHandle}
            onHandleActivate={() => onOpenChange(false)}
            onHandlePointerDown={onPointerDown}
            sx={[s.popupSheet, sx]}
          >
            {children}
          </BottomSheet>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
