import { useEffect, useState } from 'react';
import { M3Provider } from '@m3x/react';
import type { FixtureModule } from '../fixtures/types.ts';

type Mode = 'side' | 'difference' | 'onion';

interface ManifestVariant {
  size: [number, number];
  renderBounds?: [number, number, number, number];
  background?: string;
  allowedDiffReason?: string;
}

/**
 * Human review: Figma ref (2x PNG shown at 1x) vs live render, both placed on
 * the Figma background with the ref offset by its render bounds (shadows etc.).
 * "difference" blends the two — any non-black pixel is drift.
 */
export function Compare({ mod, component }: { mod?: FixtureModule; component: string }) {
  const [mode, setMode] = useState<Mode>('difference');
  const [mix, setMix] = useState(0.5);
  const [zoom, setZoom] = useState(2);
  const [manifest, setManifest] = useState<Record<string, ManifestVariant>>();

  useEffect(() => {
    void fetch(`/figma/${component}/manifest.json`)
      .then((r) => (r.ok ? r.json() : { variants: {} }))
      .then((m: { variants: Record<string, ManifestVariant> }) => setManifest(m.variants))
      .catch(() => setManifest({}));
  }, [component]);

  if (!mod) return <p>Unknown component {component}</p>;

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <p style={{ margin: '0 0 8px' }}>
        <a href="/">← all</a>
      </p>
      <h1 style={{ fontWeight: 500, margin: '0 0 16px' }}>{component}</h1>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        {(['side', 'difference', 'onion'] as const).map((m) => (
          <label key={m}>
            <input type="radio" checked={mode === m} onChange={() => setMode(m)} /> {m}
          </label>
        ))}
        {mode === 'onion' && (
          <label>
            Figma opacity{' '}
            <input type="range" min={0} max={1} step={0.01} value={mix} onChange={(e) => setMix(+e.target.value)} />
          </label>
        )}
        <label>
          zoom{' '}
          <select value={zoom} onChange={(e) => setZoom(+e.target.value)}>
            {[1, 2, 4, 8].map((z) => (
              <option key={z} value={z}>
                {z}×
              </option>
            ))}
          </select>
        </label>
        <span style={{ opacity: 0.7 }}>
          {mode === 'difference' && 'Black = identical. Anything visible is a difference.'}
          {mode === 'onion' && 'Slide to fade between live (0) and Figma (1).'}
          {mode === 'side' && 'Left: Figma export. Right: live component.'}
        </span>
      </div>

      {Object.entries(mod.variants).map(([name, v]) => {
        const mv = manifest?.[name];
        const [rx, ry, rw, rh] = mv?.renderBounds ?? [0, 0, mv?.size[0] ?? 0, mv?.size[1] ?? 0];
        const bg = mv?.background ?? '#FFFFFF';
        const ref = (
          <img
            src={`/figma/${component}/${name}.png`}
            alt="Figma reference"
            style={{ display: 'block', width: rw, height: rh }}
          />
        );
        // Live node placed where the node sits inside the ref's render bounds.
        const live = (
          <div style={{ position: 'absolute', left: -rx, top: -ry }}>
            <M3Provider colorScheme={v.colorScheme ?? 'light'}>
              <div style={{ display: 'inline-flex', width: v.width, height: v.height }}>{v.render()}</div>
            </M3Provider>
          </div>
        );
        const stage = (children: React.ReactNode) => (
          <div style={{ position: 'relative', width: rw, height: rh, background: bg, isolation: 'isolate' }}>
            {children}
          </div>
        );
        return (
          <section key={name} style={{ marginBottom: 32 }}>
            <h2 style={{ font: '500 14px/20px system-ui', margin: '0 0 8px' }}>
              {name} {v.node && <code style={{ opacity: 0.6 }}>node {v.node}</code>}
              {mv?.allowedDiffReason && (
                <span style={{ display: 'block', fontWeight: 400, opacity: 0.7 }}>
                  Recorded exception: {mv.allowedDiffReason}
                </span>
              )}
            </h2>
            {!mv ? (
              <p style={{ opacity: 0.6 }}>No Figma reference captured yet.</p>
            ) : (
              <div style={{ zoom, imageRendering: 'pixelated' }}>
                {mode === 'side' ? (
                  <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
                    {stage(ref)}
                    {stage(live)}
                  </div>
                ) : (
                  stage(
                    <>
                      {live}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          mixBlendMode: mode === 'difference' ? 'difference' : 'normal',
                          opacity: mode === 'onion' ? mix : 1,
                        }}
                      >
                        {ref}
                      </div>
                    </>,
                  )
                )}
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
