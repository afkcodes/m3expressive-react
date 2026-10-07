import type { ComponentPropsWithRef, ReactNode, Ref } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { usePortalContainer } from '../theme/portal.tsx';
import { scrim } from './scrim.ts';

export type ModalOpenChangeDetails = BaseDialog.Root.ChangeEventDetails;

export interface ModalShellProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'className' | 'style' | 'role' | 'children'
> {
  open: boolean;
  /** Base UI's event details (reason, event, `cancel()`) come second (docs/API-CONVENTIONS.md §3). */
  onOpenChange: (open: boolean, details: ModalOpenChangeDetails) => void;
  /** `alertdialog`: a decision that interrupts — the scrim doesn't dismiss (Escape still does). */
  role?: 'dialog' | 'alertdialog';
  /** Draw the 32% scrim (default true; full-screen surfaces cover the page instead). */
  scrim?: boolean;
  /** The scrim element (drag-to-dismiss fades it with the gesture). */
  backdropRef?: Ref<HTMLDivElement>;
  /** Popup placement and motion (e.g. `dialogMotion.fadeScale`). */
  sx?: StyleXStyles;
  children: ReactNode;
}

/**
 * The modal plumbing every M3 modal shares, on Base UI Dialog: portalled into `<M3Provider>` (so it
 * keeps the theme), scrim, focus trap and restore, Escape and scrim dismissal. Components supply the
 * surface and its motion through `sx` / children; `ref` and the remaining props (ARIA, pointer
 * handlers) go to the popup element.
 */
export function ModalShell({
  open,
  onOpenChange,
  role = 'dialog',
  scrim: withScrim = true,
  backdropRef,
  sx,
  children,
  ...popupProps
}: ModalShellProps) {
  const portal = usePortalContainer();
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange} disablePointerDismissal={role === 'alertdialog'}>
      <BaseDialog.Portal container={portal}>
        {withScrim && <BaseDialog.Backdrop ref={backdropRef} {...stylex.props(scrim.backdrop)} />}
        <BaseDialog.Popup role={role} {...popupProps} {...stylex.props(sx)}>
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
