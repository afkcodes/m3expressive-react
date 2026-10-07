import { fixtures } from '../registry';

export function Gallery() {
  const names = Object.keys(fixtures).sort();
  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ fontWeight: 500 }}>M3 Expressive — workbench</h1>
      <p>
        Playgrounds: <a href="/demo/button">button</a> · <a href="/demo/badge">badge</a> · <a href="/demo/card">card</a> · <a href="/demo/chips">chips</a> · <a href="/demo/overlays">overlays</a> · <a href="/demo/checkbox">selection controls</a> · <a href="/demo/progress">progress</a> · <a href="/demo/slider">slider</a> · <a href="/demo/textfield">text field</a> · <a href="/demo/list">lists</a> · <a href="/demo/menu">menus</a> · <a href="/demo/tabs">tabs</a> · <a href="/demo/navigation">navigation</a> · <a href="/demo/app-bar">app bars</a> · <a href="/demo/search">search</a> · <a href="/demo/toolbar">toolbars</a> · <a href="/demo/sheets">sheets</a> · <a href="/demo/dialogs">dialogs</a> · <a href="/demo/carousel">carousel</a> · <a href="/demo/date-picker">date pickers</a> · <a href="/demo/time-picker">time pickers</a> · <a href="/demo/shapes">shape morphing</a> · <a href="/demo/theme">dynamic colour</a>
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
