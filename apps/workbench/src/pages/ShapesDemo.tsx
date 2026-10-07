import { useEffect, useState } from 'react';
import { Button, M3Provider, MorphingShape, Shape, figmaShapes, type ShapeName } from '@m3x/react';

const names = Object.keys(figmaShapes) as ShapeName[];
// The M3 loading-indicator sequence, for the auto-cycle.
const cycle: ShapeName[] = ['softBurst', 'cookie9Sided', 'pentagon', 'pill', 'sunny', 'cookie4Sided', 'oval'];

export function ShapesDemo() {
  const [shape, setShape] = useState<ShapeName>('circle');
  const [auto, setAuto] = useState(false);
  const [scheme, setScheme] = useState<'expressive' | 'standard'>('expressive');

  useEffect(() => {
    if (!auto) return;
    let i = 0;
    const id = setInterval(() => setShape(cycle[i++ % cycle.length]!), 650);
    return () => clearInterval(id);
  }, [auto]);

  return (
    <M3Provider colorScheme="light" motionScheme={scheme}>
      <main style={{ padding: 32, fontFamily: 'Roboto, system-ui', display: 'grid', gap: 24 }}>
        <p style={{ margin: 0 }}>
          <a href="/">← all</a>
        </p>
        <h1 style={{ fontWeight: 500, margin: 0 }}>Shape morphing</h1>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <MorphingShape shape={shape} size={240} spring="default-spatial" />
          <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
            <Button variant={auto ? 'filled' : 'tonal'} onClick={() => setAuto((a) => !a)}>
              {auto ? 'Stop cycle' : 'Loading-indicator cycle'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setScheme((s) => (s === 'expressive' ? 'standard' : 'expressive'))}
            >
              {`Motion: ${scheme}`}
            </Button>
            <code>{shape}</code>
          </div>
        </div>
        <p style={{ margin: 0, opacity: 0.7 }}>
          Click any shape. Interrupting a morph restarts from the current outline. At rest the exact Figma path is
          drawn.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 72px)', gap: 8 }}>
          {names.map((n) => (
            <button
              key={n}
              title={n}
              onClick={() => {
                setAuto(false);
                setShape(n);
              }}
              style={{
                border: n === shape ? '2px solid #6750A4' : '1px solid #CAC4D0',
                borderRadius: 12,
                background: '#FEF7FF',
                padding: 6,
                cursor: 'pointer',
              }}
            >
              <Shape shape={n} size={56} />
            </button>
          ))}
        </div>
      </main>
    </M3Provider>
  );
}
