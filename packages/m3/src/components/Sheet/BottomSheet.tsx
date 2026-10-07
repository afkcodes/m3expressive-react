import type { ComponentPropsWithRef, PointerEvent as ReactPointerEvent, ReactNode, Ref } from 'react';
import * as stylex from '@stylexjs/stylex';
import { color } from '../../tokens/color.stylex.ts';
import { elevation } from '../../tokens/elevation.stylex.ts';
import { focusRing } from '../../primitives/focusRing.ts';
import type { SxProps } from '../../primitives/types.ts';
import { useLabels, type M3Labels } from '../../theme/labels.tsx';

/*
 * Figma kit, "Sheets" page (Bottom sheet set 51827:5859; Compose ModalBottomSheet /
 * BottomSheetScaffold, BottomSheetDefaults).
 *   Surface Container Low, 28px top corners, a 36px header holding the 32×4 Outline drag handle
 *   (16px padding), then the content. Standard sheets cast elevation 3; modal sheets sit flat on a
 *   32% Scrim.
 * Motion (Compose BottomSheet / ModalBottomSheet / AnchoredDraggable):
 *   - show on the default spatial spring (showMotionSpec), hide on fast effects (hideMotionSpec);
 *     the spring's overshoot lifts the sheet above its rest, so the surface continues below its
 *     bottom edge (Compose scales the layer up: SheetDefaults verticalScaleUp);
 *   - the whole surface drags (the handle and, while it isn't scrolled, the content), clamped to
 *     Expanded…Hidden (AnchoredDraggableState.newOffsetForDelta — no rubber band);
 *   - release: Compose's VelocityTracker (Lsq2), the boundary dampening near Hidden (125dp zone),
 *     then AnchoredDraggable.computeTarget with 56dp / 125dp/s (PositionalThreshold /
 *     VelocityThreshold) and a default spatial spring from the release velocity
 *     (anchoredDraggableMotionSpec, both directions); a sheet that settles at Hidden is dismissed
 *     once the spring ends;
 *   - the scrim follows targetValue != Hidden (the closest anchor while dragging, the target while
 *     settling), fading on default effects.
 * The modal sheet, its motion and drag: ./ModalBottomSheet.tsx.
 */
const s = stylex.create({
  sheet: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    width: '100%',
    maxWidth: 640,
    overflow: 'hidden',
    color: color.onSurface,
    backgroundColor: color.surfaceContainerLow,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  standard: { boxShadow: elevation.level3 },
  header: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    flexShrink: 0,
    padding: 16,
    touchAction: 'none',
  },
  handleButton: {
    position: 'relative',
    margin: 0,
    borderWidth: 0,
    borderStyle: 'none',
    backgroundColor: 'transparent',
    cursor: 'grab',
    // Hit target centred on the handle, like Compose's DragHandle with its 48dp minimum interactive
    // size: 48px wide × the kit's 36px header. The drawn handle and its focus ring stay 32×4.
    '::after': { content: '""', position: 'absolute', top: -16, bottom: -16, left: -8, right: -8 },
  },
  handle: { display: 'block', width: 32, height: 4, borderRadius: 2, backgroundColor: color.outline },
  content: { flexGrow: 1, minHeight: 0, overflowY: 'auto' },
});

/** `ref`, native props and `sx` go to the sheet `<div>`. */
export interface BottomSheetProps extends SxProps<ComponentPropsWithRef<'div'>> {
  /** The drag handle (default true). */
  dragHandle?: boolean;
  children?: ReactNode;
}

/**
 * The sheet surface with the modal sheet's plumbing (internal; `@m3x/react/testing` exports it
 * for the kit's static modal sheet).
 */
export interface BottomSheetSurfaceProps extends BottomSheetProps {
  /** Modal styling (flat, over a scrim). */
  modal?: boolean;
  /** `closeSheet`: the handle's name when it can dismiss the sheet. */
  labels?: Partial<M3Labels>;
  /** Activating the handle (click / Enter) dismisses the sheet. */
  onHandleActivate?: () => void;
  onHandlePointerDown?: (e: ReactPointerEvent<HTMLElement>) => void;
  /** The scrolling content element. */
  contentRef?: Ref<HTMLDivElement>;
}

export function BottomSheetSurface({
  modal = false,
  dragHandle = true,
  labels,
  onHandleActivate,
  onHandlePointerDown,
  contentRef,
  children,
  sx,
  ...rest
}: BottomSheetSurfaceProps) {
  const { closeSheet } = useLabels(labels);
  return (
    <div {...rest} {...stylex.props(s.sheet, !modal && s.standard, sx)}>
      {dragHandle && (
        <div data-sheet-header="" onPointerDown={onHandlePointerDown} {...stylex.props(s.header)}>
          {onHandleActivate ? (
            <button
              type="button"
              aria-label={closeSheet}
              onClick={onHandleActivate}
              {...stylex.props(s.handleButton, focusRing.host, s.handle)}
            />
          ) : (
            <span aria-hidden {...stylex.props(s.handle)} />
          )}
        </div>
      )}
      <div ref={contentRef} {...stylex.props(s.content)}>
        {children}
      </div>
    </div>
  );
}

/** The bottom sheet surface (standard sheets sit in the layout; see `ModalBottomSheet`). */
export function BottomSheet(props: BottomSheetProps) {
  return <BottomSheetSurface {...props} />;
}
