/**
 * `@m3x/react/primitives` — the interaction building blocks the components share, for custom
 * components: state layer (+ host styles), ripple, focus ring, hug text box.
 * `stateLayerHost.force*` are the static states `@m3x/react/testing` `ForceState` draws.
 */
export { StateLayer, stateLayerHost } from './StateLayer.tsx';
export { Ripple } from './Ripple.tsx';
export type { RippleProps } from './Ripple.tsx';
export { focusRing } from './focusRing.ts';
export { textBox } from './textBox.ts';
