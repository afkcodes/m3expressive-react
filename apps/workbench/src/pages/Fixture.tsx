import { M3Provider } from '@m3x/react';
import { fixtures } from '../registry';

/**
 * One variant, nothing else. The parity suite screenshots [data-fixture-node]
 * (expanded by the Figma render bounds) at deviceScaleFactor 2.
 */
export const FIXTURE_PADDING = 32;

export function Fixture({ component, variant }: { component: string; variant: string }) {
  const v = fixtures[component]?.variants[variant];
  if (!v) return <p>Unknown fixture {component}/{variant}</p>;
  return (
    <M3Provider colorScheme={v.colorScheme ?? 'light'}>
      <div style={{ padding: FIXTURE_PADDING, display: 'inline-block' }}>
        <div
          data-fixture-node
          data-layer-map={v.layers ? JSON.stringify(v.layers) : undefined}
          style={{ display: 'inline-flex', width: v.width, height: v.height }}
        >
          {v.render()}
        </div>
      </div>
    </M3Provider>
  );
}
