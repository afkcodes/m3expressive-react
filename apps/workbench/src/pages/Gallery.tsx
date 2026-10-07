import { Fragment } from 'react';
import { demos } from '../demos.ts';
import type { LoadedFixture } from '../registry.ts';

export function Gallery({ all }: { all: LoadedFixture[] }) {
  const loaded = all
    .flatMap((f) => (f.module ? [f.module] : []))
    .sort((a, b) => a.component.localeCompare(b.component));
  const failed = all.filter((f) => !f.module);
  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ fontWeight: 500 }}>M3 Expressive — workbench</h1>
      <p>
        Playgrounds:{' '}
        {demos.map((d, i) => (
          <Fragment key={d.path}>
            {i > 0 && ' · '}
            <a href={`/demo/${d.path}`}>{d.label}</a>
          </Fragment>
        ))}
      </p>
      {all.length === 0 && <p>No components yet. Fixtures live in apps/workbench/src/fixtures.</p>}
      <ul>
        {loaded.map((m) => (
          <li key={m.component}>
            <a href={`/compare/${m.component}`}>{m.component}</a> — {Object.keys(m.variants).length} variants
          </li>
        ))}
        {failed.map((f) => (
          <li key={f.file} role="alert">
            {f.file}.fixtures.tsx failed to load: {f.error instanceof Error ? f.error.message : String(f.error)}
          </li>
        ))}
      </ul>
    </main>
  );
}
