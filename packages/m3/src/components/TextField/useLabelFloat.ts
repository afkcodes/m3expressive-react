import { useEffect, useLayoutEffect, useRef } from 'react';
import { useSpringToken } from '../../motion/context.tsx';
import { animateSpring, type SpringAnimation } from '../../motion/animate.ts';

/** Label centre line (px from the content top): resting 16/24 at y 16, floating 12/16 at y 8 (outlined −8). */
const REST_Y = 16 + 12;
const floatY = (outlined: boolean) => (outlined ? -8 : 8) + 8;
/** The outlined notch's padding each side of the label (Compose OutlinedTextFieldInnerPadding). */
export const NOTCH_PAD = 4;
/** The label's type size resting (body-large) and floating (body-small). */
const REST_SIZE = 16;
const FLOAT_SIZE = 12;
/** Compose's Float visibility threshold. */
const PROGRESS_PRECISION = 0.01;

/**
 * The label's transform at float progress `p` (0 rest … 1 floated) relative to the layout it
 * currently has (real 16/24 type at rest, 12/16 floated — exact still frames). Position and size
 * are linear in `p` in both layouts, so a layout swap mid-flight is seamless. `scale` is relative
 * to the current layout's type.
 */
function labelTransform(layoutFloated: boolean, p: number, outlined: boolean, labelLeft: number) {
  const dy = REST_Y - floatY(outlined);
  if (layoutFloated) {
    // Floated outlined labels sit in a 4px-padded notch box starting at labelLeft − 4.
    const pad = outlined ? NOTCH_PAD : 0;
    const k = REST_SIZE / FLOAT_SIZE;
    const q = 1 - p;
    return { x: (-(labelLeft - pad) - pad * k) * q, y: dy * q, scale: 1 + (k - 1) * q };
  }
  return { x: labelLeft * p, y: -dy * p, scale: 1 + (FLOAT_SIZE / REST_SIZE - 1) * p };
}

/**
 * Label float as a FastSpatial spring (Compose `labelProgress`: a Transition, so an interrupted
 * float continues from the current position and velocity), written per frame. The outlined notch
 * follows it like Compose's `outlineCutout`: label width × progress, plus 4px each side once open.
 *
 * Returns the refs to attach: the label, and the container whose outline legends cut the notch.
 * `still` (a forced test state) snaps.
 */
export function useLabelFloat(floated: boolean, outlined: boolean, labelLeft: number, still: boolean) {
  const label = useRef<HTMLLabelElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const spring = useSpringToken('fast-spatial');
  const anim = useRef<SpringAnimation | null>(null);
  const progress = useRef(floated ? 1 : 0);
  const layout = useRef({ floated, outlined, labelLeft, width: 0 });
  const prevFloated = useRef(floated);

  useLayoutEffect(() => {
    if (prevFloated.current === floated) return;
    prevFloated.current = floated;
    const el = label.current;
    const legends = [...(container.current?.querySelectorAll('legend') ?? [])];
    const clear = () => {
      if (el) el.style.transform = '';
      for (const legend of legends) {
        legend.style.width = '';
        legend.style.maxWidth = '';
        legend.style.paddingInline = '';
      }
    };
    const target = floated ? 1 : 0;
    if (!el || !spring || still) {
      anim.current?.stop();
      anim.current = null;
      progress.current = target;
      clear();
      return;
    }
    // The label just switched type: measure its text width in the new layout.
    el.style.transform = 'none';
    const width = el.getBoundingClientRect().width - (floated && outlined ? 2 * NOTCH_PAD : 0);
    layout.current = { floated, outlined, labelLeft, width };
    const draw = (p: number) => {
      const current = layout.current;
      const t = labelTransform(current.floated, p, current.outlined, current.labelLeft);
      el.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
      if (!current.outlined) return;
      const cut = p > 0 ? current.width * t.scale * p : 0;
      for (const legend of legends) {
        legend.style.maxWidth = cut > 0 ? 'none' : '0.01px';
        legend.style.width = cut > 0 ? `${cut + 2 * NOTCH_PAD}px` : '';
        legend.style.paddingInline = cut > 0 ? `${NOTCH_PAD}px` : '0px';
      }
    };
    if (anim.current) anim.current.retarget(target, spring);
    else
      anim.current = animateSpring({
        spring,
        from: progress.current,
        to: target,
        precision: PROGRESS_PRECISION,
        onUpdate: (v) => {
          progress.current = v;
          draw(v);
        },
        onComplete: () => {
          anim.current = null;
          clear();
        },
      });
    draw(progress.current);
  }, [floated, outlined, labelLeft, still, spring]);

  useEffect(() => () => anim.current?.stop(), []);

  return { label, container };
}
