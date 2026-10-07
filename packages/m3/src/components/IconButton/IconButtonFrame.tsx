import { useContext, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { focusRing } from '../../primitives/focusRing.ts';
import { StateLayer } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import type { ButtonShape, ButtonSize } from '../Button/buttonStyles.ts';
import { ButtonGroupContext, GROUP_BOX_ATTR } from '../ButtonGroup/context.ts';
import {
  GROUP_COMPRESSION_LIMIT,
  ICON_BUTTON_SIZE,
  iconButtonBase,
  iconButtonDims,
  iconButtonDisabled,
  iconButtonRadii,
  PRESSED_RADIUS,
  SQUARE_RADIUS,
  type IconButtonWidth,
} from './iconButtonStyles.ts';

export type { IconButtonWidth };

export interface IconButtonFrameProps {
  size: ButtonSize;
  width: IconButtonWidth;
  shape: ButtonShape;
  /** Forced pressed (visual tests). Runtime press comes from :active. */
  pressed: boolean;
  disabled: boolean;
  /** Forced focus indicator (visual tests). */
  ringForced: boolean;
  /** Variant / selection styles for the container (colours, stroke). */
  container: ReadonlyArray<StyleXStyles | false | null | undefined>;
  children: ReactNode;
}

/** Container + state layer + ripple + icon slot, shared by IconButton and ToggleIconButton. */
export function IconButtonFrame({
  size,
  width,
  shape,
  pressed,
  disabled,
  ringForced,
  container,
  children,
}: IconButtonFrameProps) {
  const { height, widths, icon } = ICON_BUTTON_SIZE[size];
  const containerWidth = widths[width];
  const restRadius = shape === 'round' ? `${Math.min(containerWidth, height) / 2}px` : `${SQUARE_RADIUS[size]}px`;
  const pressedRadius = `${PRESSED_RADIUS[size]}px`;
  const { inGroup } = useContext(ButtonGroupContext);
  return (
    <span
      {...(inGroup ? { [GROUP_BOX_ATTR]: GROUP_COMPRESSION_LIMIT } : {})}
      {...stylex.props(
        iconButtonBase.container,
        focusRing.part,
        iconButtonDims.box(containerWidth, height),
        iconButtonRadii.shape(restRadius, pressedRadius),
        pressed && iconButtonRadii.pressed(pressedRadius),
        ...container,
        ringForced && focusRing.forced,
      )}
    >
      <StateLayer />
      <Ripple disabled={disabled} />
      <span {...stylex.props(iconButtonBase.icon, iconButtonDims.icon(icon), disabled && iconButtonDisabled.content)}>
        {children}
      </span>
    </span>
  );
}
