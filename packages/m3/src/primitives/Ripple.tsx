import { useEffect, useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { interaction } from './state.stylex.ts';
import { useForcedState } from '../testing/ForceState.tsx';

/**
 * Bounded touch ripple — port of Compose `RippleAnimation` (material-ripple):
 *   start radius   = 0.3 × max(w, h)
 *   end radius     = ½ diagonal + 10px
 *   fade in        = 75 ms linear
 *   radius         = 225 ms FastOutSlowIn (0.4, 0, 0.2, 1)
 *   origin→centre  = 225 ms linear
 *   fade out       = 150 ms linear, only after fade-in has completed AND the
 *                    press is released (released early → alpha snaps to 1)
 * Peak alpha = md.sys.state.pressed.state-layer-opacity.
 *
 * Draws inside its parent (which must be positioned) and listens for presses on
 * the nearest `[data-ripple-host]` ancestor — e.g. a button's full touch target.
 */
const FADE_IN = 75;
const RADIUS = 225;
const FADE_OUT = 150;
const FAST_OUT_SLOW_IN = 'cubic-bezier(0.4, 0, 0.2, 1)';
const EXTRA_RADIUS = 10;

const styles = stylex.create({
  container: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    borderRadius: 'inherit',
    pointerEvents: 'none',
    zIndex: -1,
  },
  // Some kit components draw the ripple over their content (e.g. checkbox: Ripple is the top layer).
  above: { zIndex: 1 },
  wave: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: '50%',
    backgroundColor: interaction.rippleColor,
    opacity: 0,
  },
  frozen: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'visible',
    fill: interaction.rippleColor,
    opacity: interaction.rippleOpacity,
  },
});

export interface RippleProps {
  disabled?: boolean;
  /** Paint over the host's content instead of behind it. */
  above?: boolean;
}

export function Ripple({ disabled = false, above = false }: RippleProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const forced = useForcedState();

  useEffect(() => {
    const container = ref.current;
    const host = container?.closest<HTMLElement>('[data-ripple-host]') ?? container?.parentElement;
    if (!container || !host || disabled) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      press(e.clientX, e.clientY, e.pointerId);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return;
      if (e.target !== host) return;
      const r = container.getBoundingClientRect();
      press(r.left + r.width / 2, r.top + r.height / 2, null);
    };

    function press(clientX: number, clientY: number, pointerId: number | null) {
      const rect = container!.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const startRadius = Math.max(w, h) * 0.3;
      const endRadius = Math.hypot(w, h) / 2 + EXTRA_RADIUS;
      const ox = clientX - rect.left;
      const oy = clientY - rect.top;

      const wave = document.createElement('span');
      wave.className = stylex.props(styles.wave).className ?? '';
      wave.style.width = wave.style.height = `${endRadius * 2}px`;
      container!.appendChild(wave);

      const alpha = Number(readRippleOpacity(wave));
      const at = (x: number, y: number) => `${x - endRadius}px ${y - endRadius}px`;
      const instant = reduced.matches;

      const fadeIn = wave.animate([{ opacity: 0 }, { opacity: alpha }], {
        duration: instant ? 0 : FADE_IN,
        easing: 'linear',
        fill: 'forwards',
      });
      const grow = wave.animate([{ scale: `${startRadius / endRadius}` }, { scale: '1' }], {
        duration: instant ? 0 : RADIUS,
        easing: FAST_OUT_SLOW_IN,
        fill: 'forwards',
      });
      const travel = wave.animate([{ translate: at(ox, oy) }, { translate: at(w / 2, h / 2) }], {
        duration: instant ? 0 : RADIUS,
        easing: 'linear',
        fill: 'forwards',
      });

      const fadeInDone = Promise.all([fadeIn.finished, grow.finished, travel.finished]);
      let released = false;

      const release = (e?: Event) => {
        if (released) return;
        if (e instanceof PointerEvent && pointerId !== null && e.pointerId !== pointerId) return;
        released = true;
        cleanupListeners();
        // Compose: finish requested before fade-in completes → alpha jumps to 1.
        fadeIn.finish();
        void fadeInDone.then(() => {
          const out = wave.animate([{ opacity: alpha }, { opacity: 0 }], {
            duration: instant ? 0 : FADE_OUT,
            easing: 'linear',
            fill: 'forwards',
          });
          void out.finished.then(() => wave.remove());
        });
      };

      const events = pointerId === null ? ['keyup', 'blur'] : ['pointerup', 'pointercancel', 'pointerleave'];
      const target: EventTarget = pointerId === null ? host! : window;
      const cleanupListeners = () => events.forEach((t) => target.removeEventListener(t, release));
      events.forEach((t) => target.addEventListener(t, release));
    }

    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('keydown', onKeyDown);
    return () => {
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('keydown', onKeyDown);
    };
  }, [disabled]);

  return (
    <span ref={ref} aria-hidden {...stylex.props(styles.container, above && styles.above)}>
      {forced.state === 'pressed' && forced.ripplePath && (
        <svg width="1" height="1" {...stylex.props(styles.frozen)}>
          <path d={forced.ripplePath} />
        </svg>
      )}
    </span>
  );
}

/** Resolve the ripple's peak alpha through the StyleX var on a probe element. */
function readRippleOpacity(probe: HTMLElement): string {
  probe.style.setProperty('opacity', interaction.rippleOpacity);
  const v = getComputedStyle(probe).opacity;
  probe.style.removeProperty('opacity');
  return v || '0.1';
}
