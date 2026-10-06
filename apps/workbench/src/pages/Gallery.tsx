import { fixtures } from '../registry';

export function Gallery() {
  const names = Object.keys(fixtures).sort();
  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ fontWeight: 500 }}>M3 Expressive — workbench</h1>
      <p>
        Playgrounds: <a href="/demo/button">button</a> · <a href="/demo/badge">badge</a> · <a href="/demo/card">card</a> · <a href="/demo/checkbox">selection controls</a> · <a href="/demo/shapes">shape morphing</a>
      </p>
      {names.length === 0 && <p>No components yet. Fixtures live in apps/workbench/src/fixtures.</p>}
      <ul>
        {names.map((n) => (
          <li key={n}>
            <a href={`/compare/${n}`}>{n}</a> — {Object.keys(fixtures[n]!.variants).length} variants
          </li>
        ))}
      </ul>
    </main>
  );
}
