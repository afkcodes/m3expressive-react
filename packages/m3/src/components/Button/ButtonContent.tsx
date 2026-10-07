import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { textBox } from '../../primitives/textBox.ts';
import { buttonBase, buttonDisabled, gaps, iconSizes, labelRole, type ButtonSize } from './buttonStyles.ts';

export interface ButtonContentProps {
  size: ButtonSize;
  disabled: boolean;
  /** Leading icon, sized by the button (20/20/24/32/40px). */
  icon?: ReactNode;
  /** The label (hug text box, the size's type role). */
  children?: ReactNode;
  /** Extra styles for the content row, after the disabled opacity. */
  sx?: StyleXStyles;
}

/**
 * A button's content row — leading icon + label, the kit's State-layer item spacing between them —
 * shared by Button, ToggleButton, the split button's leading part and connected group segments.
 */
export function ButtonContent({ size, disabled, icon, children, sx }: ButtonContentProps) {
  return (
    <span {...stylex.props(buttonBase.content, gaps[size], disabled && buttonDisabled.content, sx)}>
      {icon != null && <span {...stylex.props(buttonBase.icon, iconSizes[size])}>{icon}</span>}
      {children != null && <span {...stylex.props(labelRole[size], textBox.hug, buttonBase.label)}>{children}</span>}
    </span>
  );
}
