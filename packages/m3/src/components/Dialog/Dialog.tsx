import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { typescale } from '../../tokens/typescale.ts';
import { Divider } from '../Divider/Divider.tsx';
import { InheritSurfaceContext } from '../List/surface.ts';
import { useControllableState } from '../../hooks/useControllableState.ts';
import { ModalShell, type ModalOpenChangeDetails } from '../../primitives/ModalShell.tsx';
import { dialogMotion } from '../../primitives/dialogMotion.ts';
import type { SxProps } from '../../primitives/types.ts';

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
 *   (150ms) emphasized-accelerate — see primitives/dialogMotion.ts.
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
  header: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: 16,
    flexShrink: 0,
    paddingBlock: '24px 0',
    paddingInline: 24,
  },
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

/** `ref`, native props and `sx` go to the surface `<div>`. */
export interface DialogSurfaceProps extends SxProps<Omit<ComponentPropsWithRef<'div'>, 'children'>> {
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
}

type DialogParts = Pick<
  DialogSurfaceProps,
  'icon' | 'headline' | 'supportingText' | 'actions' | 'divider' | 'children'
>;

/** The surface's parts (header, content, divider, actions); the modal ids name its popup. */
function DialogBody({
  icon,
  headline,
  supportingText,
  actions,
  divider = false,
  children,
  headlineId,
  descriptionId,
}: DialogParts & { headlineId?: string; descriptionId?: string }) {
  const hasHeader = icon != null || headline != null || supportingText != null;
  return (
    <>
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
    </>
  );
}

/** The dialog surface on its own (see `Dialog` for the modal). */
export function DialogSurface({
  icon,
  headline,
  supportingText,
  actions,
  divider,
  children,
  sx,
  ...rest
}: DialogSurfaceProps) {
  return (
    <div {...rest} {...stylex.props(s.surface, sx)}>
      <DialogBody icon={icon} headline={headline} supportingText={supportingText} actions={actions} divider={divider}>
        {children}
      </DialogBody>
    </div>
  );
}

/** The surface's props; `ref`, native props and `sx` go to the popup, which is the dialog surface. */
export interface DialogProps extends Omit<DialogSurfaceProps, 'role'> {
  open?: boolean;
  defaultOpen?: boolean;
  /** Base UI's change details (reason, event, `cancel()`) come second. */
  onOpenChange?: (open: boolean, details: ModalOpenChangeDetails) => void;
  /** `alertdialog` for decisions that interrupt (no outside-click dismiss). */
  role?: 'dialog' | 'alertdialog';
}

/** A modal dialog: scrim, focus trap, Escape (and, for `dialog`, scrim click) to dismiss. */
export function Dialog({
  open,
  defaultOpen = false,
  onOpenChange,
  role = 'dialog',
  icon,
  headline,
  supportingText,
  actions,
  divider,
  children,
  sx,
  ...rest
}: DialogProps) {
  const id = useId();
  const [isOpen, setOpen] = useControllableState(open, defaultOpen, onOpenChange);
  return (
    <ModalShell
      open={isOpen}
      onOpenChange={setOpen}
      role={role}
      aria-labelledby={headline != null ? `${id}-h` : undefined}
      aria-describedby={supportingText != null ? `${id}-d` : undefined}
      {...rest}
      sx={[s.surface, s.popup, dialogMotion.fadeScale, sx]}
    >
      <DialogBody
        icon={icon}
        headline={headline}
        supportingText={supportingText}
        actions={actions}
        divider={divider}
        headlineId={`${id}-h`}
        descriptionId={`${id}-d`}
      >
        {children}
      </DialogBody>
    </ModalShell>
  );
}
