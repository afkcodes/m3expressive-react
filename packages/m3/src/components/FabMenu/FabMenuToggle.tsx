import { useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button as BaseButton } from '@base-ui/react/button';
import { useMergedRefs } from '../../hooks/useMergedRefs.ts';
import { useSpringToken } from '../../motion/context.tsx';
import { useSpringChannel } from '../../motion/useSpringChannel.ts';
import { elevationMotion } from '../../primitives/elevationMotion.ts';
import { focusRing } from '../../primitives/focusRing.ts';
import { forcedStateLayer, StateLayer, stateLayerHost } from '../../primitives/StateLayer.tsx';
import { Ripple } from '../../primitives/Ripple.tsx';
import { ICON_PATHS, SvgIcon } from '../../primitives/SvgIcon.tsx';
import { useForcedState } from '../../testing/ForceState.tsx';
import {
  closeColors,
  fabMenuStyles as s,
  itemColors,
  TOGGLE_COLORS,
  TOGGLE_ICON,
  TOGGLE_RADIUS,
  type FabMenuColor,
} from './fabMenuStyles.ts';

/** Inline styles the morph writes on the toggle; removed at rest. */
const MORPH_PROPERTIES = ['border-radius', 'background-color', 'color', '--m3-fab-icon'] as const;
/** The glyph swaps to "close" past half the morph (FloatingActionButtonMenuSample). */
const GLYPH_SWAP_PROGRESS = 0.5;

export interface FabMenuToggleProps extends Omit<
  BaseButton.Props,
  'className' | 'style' | 'render' | 'children' | 'color'
> {
  ref?: Ref<HTMLButtonElement>;
  open: boolean;
  color: FabMenuColor;
  icon?: ReactNode;
}

/*
 * The menu's FAB and close button: one ToggleFloatingActionButton (Compose
 * FloatingActionButtonMenu.kt) driven by a single checked progress on FastSpatial — corner radius
 * lerp(16, 28), container {colour}-container → {colour} and icon on-{colour}-container →
 * on-{colour} (Oklab lerp), icon size lerp(24, 20); the glyph swaps to "close" once progress > 0.5.
 * The kit's open / closed frames are the progress-1 / progress-0 rest states.
 */
export function FabMenuToggle({ open, color: menuColor, icon, ref, ...rest }: FabMenuToggleProps) {
  const forced = useForcedState();
  const spring = useSpringToken('fast-spatial');
  const el = useRef<HTMLButtonElement | null>(null);
  const setRef = useMergedRefs(el, ref);
  const [morphing, setMorphing] = useState(false);
  const [glyphClose, setGlyphClose] = useState(open);
  // Toggling starts the morph (or snaps without motion) in the same render; the effect below runs
  // the spring.
  const [prev, setPrev] = useState({ open, spring });
  if (prev.open !== open || prev.spring !== spring) {
    setPrev({ open, spring });
    if (!spring) {
      setMorphing(false);
      setGlyphClose(open);
    } else if (prev.open !== open) setMorphing(true);
  }
  const first = useRef(true);
  const checked = useSpringChannel(applyMorph, {
    initial: open ? 1 : 0,
    onRest: () => {
      clearMorph();
      setMorphing(false);
    },
  });

  function applyMorph(progress: number) {
    const node = el.current;
    if (!node) return;
    const { container, content } = TOGGLE_COLORS[menuColor];
    // Compose lerps colours in Oklab; CSS color-mix needs 0–100%, so the overshoot is clamped there.
    const mix = `${Math.min(1, Math.max(0, progress)) * 100}%`;
    node.style.borderRadius = `${TOGGLE_RADIUS.closed + (TOGGLE_RADIUS.open - TOGGLE_RADIUS.closed) * progress}px`;
    node.style.backgroundColor = `color-mix(in oklab, ${container[0]}, ${container[1]} ${mix})`;
    node.style.color = `color-mix(in oklab, ${content[0]}, ${content[1]} ${mix})`;
    // The icon box snaps to whole device pixels.
    const dpr = window.devicePixelRatio || 1;
    const iconPx = TOGGLE_ICON.closed - (TOGGLE_ICON.closed - TOGGLE_ICON.open) * progress;
    node.style.setProperty('--m3-fab-icon', `${Math.round(iconPx * dpr) / dpr}px`);
    setGlyphClose(progress > GLYPH_SWAP_PROGRESS);
  }

  function clearMorph() {
    const node = el.current;
    if (!node) return;
    for (const property of MORPH_PROPERTIES) node.style.removeProperty(property);
  }

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const target = open ? 1 : 0;
    if (!checked.animating && checked.value === target) return;
    if (!spring) {
      // Reduced motion: snap (the glyph was swapped during render).
      checked.jump(target);
      clearMorph();
      return;
    }
    // The render already switched the open / closed styles; the spring's first frame comes a frame
    // later. Paint the current progress now, or one frame flashes the end shape with the old glyph.
    if (!checked.animating) applyMorph(checked.value);
    checked.to(target, spring);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on the toggle; the morph reads the latest colour
  }, [open, spring, menuColor]);

  const showClose = morphing ? glyphClose : open;
  return (
    <BaseButton
      ref={setRef}
      aria-expanded={open}
      data-ripple-host=""
      {...rest}
      {...stylex.props(
        s.button,
        focusRing.host,
        s.close,
        open ? closeColors[menuColor] : [s.closed, itemColors[menuColor]],
        stateLayerHost.host,
        elevationMotion.host,
        forcedStateLayer(forced.state, 'hover'),
        forced.focusRing && focusRing.forced,
        forced.state === 'hovered' && s.closeHovered,
        forced.state === 'focused' && s.closeFocused,
      )}
    >
      <StateLayer />
      {/* The FAB draws its pressed ripple over the icon, the close button under it (kit layer order). */}
      <Ripple above={!open} />
      {showClose ? (
        <SvgIcon d={ICON_PATHS.close} size={TOGGLE_ICON.open} sx={[s.icon, morphing && s.iconMorph]} />
      ) : (
        <span {...stylex.props(s.icon, s.icon24, morphing && s.iconMorph)}>{icon}</span>
      )}
    </BaseButton>
  );
}
