import {
  useRef,
  type ComponentPropsWithRef,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import * as stylex from '@stylexjs/stylex';
import { useMergedRefs } from '../../hooks/useMergedRefs.ts';
import { useSpringToken } from '../../motion/context.tsx';
import type { SxProps } from '../../primitives/types.ts';
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

/** The root is a `role="group"` `<div>`: name it with `aria-label` / `aria-labelledby`. */
export interface ButtonGroupProps extends SxProps<ComponentPropsWithRef<'div'>> {
  size?: ButtonSize;
  /** Buttons, toggle buttons or icon buttons. */
  children: ReactNode;
}

export function ButtonGroup({
  size = 'small',
  children,
  sx,
  ref: refProp,
  onPointerDown,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...rest
}: ButtonGroupProps) {
  const [gap, pad] = SPACING[size];
  const ref = useRef<HTMLDivElement>(null);
  const setRef = useMergedRefs(ref, refProp);
  const enlarge = useEnlargeOnPress(ref, useSpringToken('fast-spatial'));
  // The press-to-widen handlers (delegated from the items) run after the app's own.
  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      onPointerDown?.(e);
      enlarge.onPointerDown(e);
    },
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      enlarge.onKeyDown(e);
    },
    onKeyUp: (e: KeyboardEvent<HTMLDivElement>) => {
      onKeyUp?.(e);
      enlarge.onKeyUp(e);
    },
    onBlur: (e: FocusEvent<HTMLDivElement>) => {
      onBlur?.(e);
      enlarge.onBlur();
    },
  };
  return (
    <ButtonGroupContext value={IN_GROUP}>
      <div ref={setRef} role="group" {...rest} {...handlers} {...stylex.props(s.standard, dyn.spacing(gap, pad), sx)}>
        {children}
      </div>
    </ButtonGroupContext>
  );
}
