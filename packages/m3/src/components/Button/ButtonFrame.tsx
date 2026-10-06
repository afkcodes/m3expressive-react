import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { StateLayer } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { textBox } from '../../primitives/textBox.ts';
import { base, containerSizes, disabled, gaps, iconSizes, labelRole, radii, type ButtonShape, type ButtonSize } from './buttonStyles.ts';

/** Inner structure shared by Button and ToggleButton: container → state layer → icon + label. */
export function ButtonFrame({
  size,
  shape,
  pressed,
  isDisabled,
  focusRing,
  container,
  icon,
  children,
}: {
  size: ButtonSize;
  shape: ButtonShape;
  /** Forced pressed (visual tests). Runtime press comes from :active. */
  pressed: boolean;
  isDisabled: boolean;
  focusRing: boolean;
  /** Variant / selection styles for the container (colours, stroke, shadow). */
  container: ReadonlyArray<StyleXStyles | false | null | undefined>;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <span
      {...stylex.props(
        base.container,
        containerSizes[size],
        radii[`${size}${shape === 'round' ? 'Round' : 'Square'}`],
        pressed && radii[`${size}Pressed`],
        ...container,
        isDisabled && disabled.container,
        focusRing && base.ringForced,
      )}
    >
      <StateLayer />
      <Ripple disabled={isDisabled} />
      <span {...stylex.props(base.content, gaps[size], isDisabled && disabled.content)}>
        {icon != null && <span {...stylex.props(base.icon, iconSizes[size])}>{icon}</span>}
        {children != null && <span {...stylex.props(labelRole[size], textBox.hug, base.label)}>{children}</span>}
      </span>
    </span>
  );
}
