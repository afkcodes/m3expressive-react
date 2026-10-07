import { useRef, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { useSpringToken } from '../../motion/context.tsx';
import type { ButtonSize } from '../Button/buttonStyles.ts';
import { ButtonGroupContext } from './context.ts';
import { useEnlargeOnPress } from './useEnlargeOnPress.ts';

/*
 * Figma kit, Buttons page, "Standard button group": a row of (toggle) buttons / icon buttons.
 * Spacing per size (gap / inline padding): xsmall 18 / 9, small 12 / 6, medium–xlarge 8 / 0.
 * Pressing an item widens it at its neighbours' expense (useEnlargeOnPress). The connected group
 * lives in ConnectedButtonGroup.tsx.
 */
const SPACING: Record<ButtonSize, [gap: number, pad: number]> = {
  xsmall: [18, 9],
  small: [12, 6],
  medium: [8, 0],
  large: [8, 0],
  xlarge: [8, 0],
};

const s = stylex.create({
  standard: { display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' },
});

const dyn = stylex.create({
  spacing: (gap: number, pad: number) => ({ columnGap: gap, paddingInline: pad }),
});

const IN_GROUP = { inGroup: true };

export interface ButtonGroupProps {
  size?: ButtonSize;
  /** Buttons, toggle buttons or icon buttons. */
  children: ReactNode;
  'aria-label'?: string;
  sx?: StyleXStyles;
}

export function ButtonGroup({ size = 'small', children, sx, ...rest }: ButtonGroupProps) {
  const [gap, pad] = SPACING[size];
  const ref = useRef<HTMLDivElement>(null);
  const handlers = useEnlargeOnPress(ref, useSpringToken('fast-spatial'));
  return (
    <ButtonGroupContext value={IN_GROUP}>
      <div ref={ref} role="group" {...rest} {...handlers} {...stylex.props(s.standard, dyn.spacing(gap, pad), sx)}>
        {children}
      </div>
    </ButtonGroupContext>
  );
}
