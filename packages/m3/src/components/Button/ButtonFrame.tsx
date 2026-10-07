import { useContext, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { focusRing } from '../../primitives/focusRing.ts';
import { StateLayer } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { ButtonGroupContext, GROUP_BOX_ATTR } from '../ButtonGroup/context.ts';
import { ButtonContent } from './ButtonContent.tsx';
import {
  buttonBase,
  buttonDisabled,
  buttonRadii,
  containerSizes,
  PAD_INLINE,
  type ButtonShape,
  type ButtonSize,
} from './buttonStyles.ts';

export interface ButtonFrameProps {
  size: ButtonSize;
  shape: ButtonShape;
  /** Forced pressed (visual tests). Runtime press comes from :active. */
  pressed: boolean;
  disabled: boolean;
  /** Forced focus indicator (visual tests). Runtime focus comes from :focus-visible. */
  ringForced: boolean;
  /** Variant / selection styles for the container (colours, stroke, shadow). */
  container: ReadonlyArray<StyleXStyles | false | null | undefined>;
  icon?: ReactNode;
  children?: ReactNode;
}

/** Inner structure shared by Button and ToggleButton: container → state layer → icon + label. */
export function ButtonFrame({
  size,
  shape,
  pressed,
  disabled,
  ringForced,
  container,
  icon,
  children,
}: ButtonFrameProps) {
  const { inGroup } = useContext(ButtonGroupContext);
  return (
    <span
      // In a standard button group: the box the group widens on press; limit = end content padding.
      {...(inGroup ? { [GROUP_BOX_ATTR]: PAD_INLINE[size] } : {})}
      {...stylex.props(
        buttonBase.container,
        focusRing.part,
        containerSizes[size],
        buttonRadii[`${size}${shape === 'round' ? 'Round' : 'Square'}`],
        pressed && buttonRadii[`${size}Pressed`],
        ...container,
        disabled && buttonDisabled.container,
        ringForced && focusRing.forced,
      )}
    >
      <StateLayer />
      <Ripple disabled={disabled} />
      <ButtonContent size={size} disabled={disabled} icon={icon}>
        {children}
      </ButtonContent>
    </span>
  );
}
