import { forwardRef, useId, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { Dialog } from '@base-ui/react/dialog';
import { color } from '../../tokens/color.stylex';
import { motion } from '../../tokens/motion.stylex';
import { typescale } from '../../tokens/typescale.ts';
import { usePortalContainer } from '../../theme/portal.tsx';
import { Divider } from '../Divider/Divider.tsx';
import { scrim } from './scrim.ts';

/*
 * Figma kit, "Sheets" page (Side Sheet set 53198:27851).
 *   320px. Header 76px: 12px top / 12px end / 16px bottom padding, 4px start with the narrow back
 *   button (24px without), the title-large On Surface Variant headline 12px down, the close button.
 *   Content fills; actions sit under a full-width divider (12px top, 24px sides, 8px gaps) with
 *   20px below. Standard: Surface with a vertical divider on its start edge. Modal: Surface
 *   Container Low, 16px corners, over a 32% Scrim.
 * Motion: Compose has no side sheet; it moves like its sheets (in on the default spatial spring,
 *   out on fast effects; the scrim fades on default effects).
 */
const s = stylex.create({
  sheet: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    width: 320,
    minHeight: 0,
    paddingBottom: 20,
    color: color.onSurface,
    backgroundColor: color.surface,
  },
  modal: { backgroundColor: color.surfaceContainerLow, borderRadius: 16, overflow: 'hidden' },
  // The kit's divider instance runs 1px past the sheet's bottom edge.
  edge: { position: 'absolute', insetInlineStart: 0, top: 0, bottom: -1 },
  header: { display: 'flex', alignItems: 'flex-start', flexShrink: 0, paddingBlock: '12px 16px', paddingInline: '24px 12px' },
  headerNav: { paddingInlineStart: 4 },
  headline: { flexGrow: 1, minWidth: 0, margin: 0, paddingTop: 12, color: color.onSurfaceVariant },
  slot: { display: 'flex', flexShrink: 0 },
  content: { flexGrow: 1, minHeight: 0, overflowY: 'auto' },
  actions: { flexShrink: 0, display: 'flex', flexDirection: 'column' },
  buttons: { display: 'flex', alignItems: 'center', columnGap: 8, paddingTop: 12, paddingInline: 24 },
  // Modal placement (detached: 16px from the edges) and motion.
  popup: {
    position: 'fixed',
    top: 16,
    bottom: 16,
    insetInlineEnd: 16,
    display: 'flex',
    outlineStyle: 'none',
    translate: { default: '0 0', ':is([data-starting-style], [data-ending-style])': 'calc(100% + 16px) 0' },
    transitionProperty: 'translate',
    transitionDuration: { default: motion.defaultSpatialDuration, ':is([data-ending-style])': motion.fastEffectsDuration },
    transitionTimingFunction: { default: motion.defaultSpatialEasing, ':is([data-ending-style])': motion.fastEffectsEasing },
  },
  popupStart: {
    insetInlineEnd: 'auto',
    insetInlineStart: 16,
    translate: { default: '0 0', ':is([data-starting-style], [data-ending-style])': 'calc(-100% - 16px) 0' },
  },
});

export interface SideSheetProps {
  /** Modal styling (rounded, Surface Container Low, no edge divider). `ModalSideSheet` sets it. */
  modal?: boolean;
  headline?: ReactNode;
  /** Leading icon button, e.g. back (the kit's narrow icon button). */
  navigation?: ReactNode;
  /** Trailing icon button, e.g. close. */
  close?: ReactNode;
  /** Buttons under the divider at the bottom. */
  actions?: ReactNode;
  children?: ReactNode;
  /** Id for the headline (a modal sheet's dialog is labelled by it). */
  headlineId?: string;
  sx?: StyleXStyles;
}

/** The side sheet surface (standard sheets sit beside the content; see `ModalSideSheet`). */
export const SideSheet = forwardRef<HTMLDivElement, SideSheetProps>(function SideSheet(
  { modal = false, headline, navigation, close, actions, children, headlineId, sx },
  ref,
) {
  return (
    <div ref={ref} {...stylex.props(s.sheet, modal && s.modal, sx)}>
      {!modal && <Divider orientation="vertical" sx={s.edge} />}
      {(headline != null || navigation != null || close != null) && (
        <div {...stylex.props(s.header, navigation != null && s.headerNav)}>
          {navigation != null && <span {...stylex.props(s.slot)}>{navigation}</span>}
          <h2 id={headlineId} {...stylex.props(typescale.titleLarge, s.headline)}>
            {headline}
          </h2>
          {close != null && <span {...stylex.props(s.slot)}>{close}</span>}
        </div>
      )}
      <div {...stylex.props(s.content)}>{children}</div>
      {actions != null && (
        <div {...stylex.props(s.actions)}>
          <Divider />
          <div {...stylex.props(s.buttons)}>{actions}</div>
        </div>
      )}
    </div>
  );
});

export interface ModalSideSheetProps extends Omit<SideSheetProps, 'modal' | 'headlineId'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The edge it slides in from (default the end edge). */
  side?: 'end' | 'start';
}

/** A modal side sheet: scrim, focus trap, Escape / scrim to dismiss. */
export function ModalSideSheet({ open, onOpenChange, side = 'end', ...sheet }: ModalSideSheetProps) {
  const portal = usePortalContainer();
  const id = useId();
  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal container={portal}>
        <Dialog.Backdrop {...stylex.props(scrim.backdrop)} />
        <Dialog.Popup
          aria-labelledby={sheet.headline != null ? id : undefined}
          {...stylex.props(s.popup, side === 'start' && s.popupStart)}
        >
          <SideSheet modal headlineId={id} {...sheet} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
