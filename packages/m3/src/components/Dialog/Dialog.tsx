import { forwardRef, useId, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { color } from '../../tokens/color.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { usePortalContainer } from '../../theme/portal.tsx';
import { Divider } from '../Divider/Divider.tsx';
import { InheritSurfaceContext } from '../List/surface.ts';
import { scrim } from '../Sheet/scrim.ts';
import { dialogMotion } from './dialogMotion.ts';

/*
 * Figma kit, "Dialogs" page (Basic dialog 50723:10929, List dialog 52112:28937, Scrollable list
 * dialog 52112:29186).
 *   312px, Surface Container High, 28px corners. Header: 24px padding (24px below it only when
 *   content follows), 16px gaps; optional 24px Secondary icon that centres the headline-small
 *   On Surface headline; body-medium On Surface Variant supporting text. Content (lists) runs
 *   edge to edge and scrolls when the dialog is height-bound. Actions: 20px above / below, 24px
 *   end, 8px gaps, end-aligned text buttons.
 * Motion: Compose dialogs use the platform window animation; Material Components' M3 dialog
 *   (MaterialAlertDialog.Material3.Animation → m3_motion_fade_enter / _exit) fades in while
 *   scaling 0.8 → 1 over medium4 (400ms) emphasized-decelerate, and fades out over short3
 *   (150ms) emphasized-accelerate — see ./dialogMotion.ts.
 */

const s = stylex.create({
  surface: {
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    width: 312,
    maxWidth: 'calc(100vw - 48px)',
    maxHeight: 'calc(100dvh - 48px)',
    overflow: 'hidden',
    color: color.onSurface,
    backgroundColor: color.surfaceContainerHigh,
    borderRadius: 28,
  },
  header: { display: 'flex', flexDirection: 'column', rowGap: 16, flexShrink: 0, paddingBlock: '24px 0', paddingInline: 24 },
  headerWithContent: { paddingBottom: 24 },
  icon: { display: 'flex', justifyContent: 'center', color: color.secondary },
  headline: { margin: 0, color: color.onSurface },
  centered: { textAlign: 'center' },
  supporting: { margin: 0, color: color.onSurfaceVariant },
  content: { flexGrow: 1, minHeight: 0, overflowY: 'auto' },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    columnGap: 8,
    flexShrink: 0,
    paddingBlock: 20,
    paddingInline: '8px 24px',
  },
  popup: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    translate: '-50% -50%',
    outlineStyle: 'none',
  },
});

export interface DialogSurfaceProps {
  /** A 24px icon above the headline (centres the headline). */
  icon?: ReactNode;
  headline?: ReactNode;
  supportingText?: ReactNode;
  /** Buttons at the bottom (text buttons; the confirming action last). */
  actions?: ReactNode;
  /** A divider between the content and the actions (scrolling content). */
  divider?: boolean;
  /** Content under the header (lists, fields); scrolls when the dialog is height-bound. */
  children?: ReactNode;
  headlineId?: string;
  descriptionId?: string;
  sx?: StyleXStyles;
}

/** The dialog surface (see `Dialog` for the modal). */
export const DialogSurface = forwardRef<HTMLDivElement, DialogSurfaceProps>(function DialogSurface(
  { icon, headline, supportingText, actions, divider = false, children, headlineId, descriptionId, sx },
  ref,
) {
  const hasHeader = icon != null || headline != null || supportingText != null;
  return (
    <div ref={ref} {...stylex.props(s.surface, sx)}>
      {hasHeader && (
        <div {...stylex.props(s.header, children != null && s.headerWithContent)}>
          {icon != null && <span {...stylex.props(s.icon)}>{icon}</span>}
          {headline != null && (
            <h2 id={headlineId} {...stylex.props(typescale.headlineSmall, s.headline, icon != null && s.centered)}>
              {headline}
            </h2>
          )}
          {supportingText != null && (
            <p id={descriptionId} {...stylex.props(typescale.bodyMedium, s.supporting)}>
              {supportingText}
            </p>
          )}
        </div>
      )}
      {children != null && (
        <div {...stylex.props(s.content)}>
          <InheritSurfaceContext value>{children}</InheritSurfaceContext>
        </div>
      )}
      {divider && <Divider />}
      {actions != null && <div {...stylex.props(s.actions)}>{actions}</div>}
    </div>
  );
});

export interface DialogProps extends Omit<DialogSurfaceProps, 'headlineId' | 'descriptionId'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `alertdialog` for decisions that interrupt (no outside-click dismiss). */
  role?: 'dialog' | 'alertdialog';
}

/** A modal dialog: scrim, focus trap, Escape (and, for `dialog`, scrim click) to dismiss. */
export function Dialog({ open, onOpenChange, role = 'dialog', ...surface }: DialogProps) {
  const portal = usePortalContainer();
  const id = useId();
  return (
    <BaseDialog.Root open={open} onOpenChange={(next) => onOpenChange(next)} disablePointerDismissal={role === 'alertdialog'}>
      <BaseDialog.Portal container={portal}>
        <BaseDialog.Backdrop {...stylex.props(scrim.backdrop)} />
        <BaseDialog.Popup
          role={role}
          aria-labelledby={surface.headline != null ? `${id}-h` : undefined}
          aria-describedby={surface.supportingText != null ? `${id}-d` : undefined}
          {...stylex.props(s.popup, dialogMotion.fadeScale)}
        >
          <DialogSurface headlineId={`${id}-h`} descriptionId={`${id}-d`} {...surface} />
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
