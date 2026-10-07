# @m3x/react

Material 3 Expressive components for React 19: [Base UI](https://base-ui.com) for behaviour and accessibility,
[StyleX](https://stylexjs.com) for styling. Every component is checked pixel-for-pixel against the Material 3
Design Kit in Figma (4,500+ variants), and motion is ported from the Jetpack Compose Material 3 source
(springs, tweens, gestures).

> Private package (`0.0.0`). Licensing and publishing are the owner's decision.

## Install

```sh
pnpm add @m3x/react @stylexjs/stylex@~0.19.1 react@^19 react-dom@^19
pnpm add -D @stylexjs/unplugin
```

`@stylexjs/stylex` is a peer dependency: the app compiles the library's styles together with its own, so theme
variables and `sx` overrides hash and order consistently.

### Bundler (StyleX)

```ts
// vite.config.ts — webpack / rspack / esbuild / Next: use the matching @stylexjs/unplugin adapter
import stylex from '@stylexjs/unplugin';

export default {
  plugins: [stylex.vite({ useCSSLayers: true })],
};
```

`useCSSLayers: true` is the configuration the visual parity suite is measured with.

### Fonts and the provider

```tsx
import '@m3x/react/fonts.css'; // Roboto (Google Fonts v51) with the metric overrides the kit's baselines need
import { M3Provider, Button } from '@m3x/react';

export function App() {
  return (
    <M3Provider colorScheme="system" contrast="standard">
      <Button>Get started</Button>
    </M3Provider>
  );
}
```

`M3Provider` sets the colour scheme (`light` / `dark` / `system`, via CSS `light-dark()`), contrast
(`standard` / `medium` / `high`), the motion scheme (`expressive` / `standard`) and hosts popups (menus,
dialogs, tooltips render inside it so they inherit the theme).

## Theming

- **Tokens** — colour, typescale, shape, elevation, motion and state tokens are StyleX variables:
  `import { color } from '@m3x/react/tokens/color.stylex'`. Use them in your own `stylex.create` styles.
- **Overrides** — every component takes `sx` (StyleX styles) instead of `className` / `style`.
- **Dynamic colour** (Material You) — generate the whole scheme from a seed colour or an image:

  ```tsx
  import { useDynamicScheme, useSeedColorsFromImage } from '@m3x/react/dynamic-color';

  const colors = useDynamicScheme('#006A6A', { variant: 'tonal-spot' }); // or a seed from an image:
  const { colors: seeds } = useSeedColorsFromImage(file); // ranked candidates
  <M3Provider colors={colors}>…</M3Provider>;
  ```

  `@m3x/react/dynamic-color` is a separate entry, so Google's material-color-utilities (~15 KB gzip) only loads
  when used. Servers that load it unbundled (Vite SSR) need `ssr.noExternal: ['@material/material-color-utilities']`
  (its 0.4.0 release has extensionless imports).

## Motion

M3 Expressive springs (`fast` / `default` / `slow` × `spatial` / `effects`) as exact CSS `linear()` curves, plus an
interruptible JS spring (`animateSpring`, `useSpringToken` from `@m3x/react/motion`) that ends where Compose's
`Animatable` does. `prefers-reduced-motion` turns spatial motion off; colour and opacity fades stay.

## Testing your app

- Components render in **jsdom** (no `matchMedia`, `ResizeObserver` or Web Animations needed) and on the
  **server** (`renderToString`). Your test runner must compile StyleX like your app does (e.g. Vitest with the
  `@stylexjs/unplugin` Vite plugin).
- `@m3x/react/testing` exposes `ForceState` (render hover / focus / pressed / dragged states statically) for visual
  tests. It is test-only.

## Browser support

Evergreen browsers with CSS `light-dark()` (Chrome 123, Safari 17.5, Firefox 120). Do not let your browserslist
lower `linear()` easing. Auto-width ("hug") labels are exact in Chromium (`calc-size()`); other engines may be up
to 1px wider.

## Entry points

| Import | Contents |
|---|---|
| `@m3x/react` | Components, `M3Provider`, primitives (`StateLayer`, `Ripple`, focus ring), typescale |
| `@m3x/react/dynamic-color` | `schemeFromSeed`, `seedColorsFromImage`, `useDynamicScheme`, `useSeedColorsFromImage` |
| `@m3x/react/motion` | Spring tokens, `animateSpring`, `useSpringToken`, `useReducedMotion` |
| `@m3x/react/tokens/*.stylex` | StyleX token variables (colour, shape, elevation, motion, state, typeface) |
| `@m3x/react/primitives/*.stylex` | Interaction variables (state-layer / ripple colour and opacity, tweens) |
| `@m3x/react/fonts.css` | Roboto `@font-face` rules and font files |
| `@m3x/react/testing` | `ForceState` for visual tests |

For contributors (parity suite, Figma pipeline, rules): see the repository README and CLAUDE.md.
