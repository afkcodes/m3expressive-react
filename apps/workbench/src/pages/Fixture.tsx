import { use, useEffect, useRef, useState, type ReactNode } from 'react';
import { M3Provider } from '@m3x/react';
import { loadFixture } from '../registry.ts';
import type { FixtureModule, FixtureVariant } from '../fixtures/types.ts';
import { Boundary } from './Boundary.tsx';

/**
 * One variant, nothing else. The parity suite screenshots [data-fixture-node]
 * (expanded by the Figma render bounds) at deviceScaleFactor 2.
 */
export const FIXTURE_PADDING = 32;

/** /fixture/<component>/<variant>; without a variant, every variant of the component (the console spec). */
export function Fixture({ component, variant }: { component: string; variant: string }) {
  const mod = use(loadFixture(component));
  if (!mod) return <p>Unknown fixture {component}</p>;
  if (!variant) return <AllVariants mod={mod} />;
  const v = mod.variants[variant];
  if (!v)
    return (
      <p>
        Unknown fixture {component}/{variant}
      </p>
    );
  return <FixtureFrame v={v} />;
}

function FixtureFrame({ v }: { v: FixtureVariant }) {
  return (
    <M3Provider colorScheme={v.colorScheme ?? 'light'}>
      <div style={{ padding: v.padding ?? FIXTURE_PADDING, display: 'inline-block' }}>
        <FixtureNode v={v}>{v.render()}</FixtureNode>
      </div>
    </M3Provider>
  );
}

/**
 * The captured node. It only carries [data-fixture-node], which the specs wait for, once the fonts its
 * first layout requested are ready: a fixture module loads after the page's load event, so the specs'
 * own `document.fonts.ready` can run before any text exists. The variant is rendered by the parent,
 * so this re-render doesn't render it again.
 */
function FixtureNode({ v, children }: { v: FixtureVariant; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    ref.current?.getBoundingClientRect(); // lay the text out now, so it requests its fonts
    void document.fonts.ready.then(() => {
      if (live) setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);
  return (
    <div
      ref={ref}
      data-fixture-node={ready ? '' : undefined}
      data-layer-map={v.layers ? JSON.stringify(v.layers) : undefined}
      style={{ display: 'inline-flex', width: v.width, height: v.height }}
    >
      {children}
    </div>
  );
}

/** Every variant on one page, each in its own frame and error boundary. */
function AllVariants({ mod }: { mod: FixtureModule }) {
  return (
    <main data-fixture-all={mod.component}>
      {Object.entries(mod.variants).map(([name, v]) => (
        <section key={name} data-fixture-variant={name}>
          <Boundary>
            <FixtureFrame v={v} />
          </Boundary>
        </section>
      ))}
    </main>
  );
}
