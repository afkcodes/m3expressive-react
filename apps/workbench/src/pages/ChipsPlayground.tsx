import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { AssistChip, ChipAvatarPlaceholder, ChipGroup, FilterChip, InputChip, M3Provider, SuggestionChip, typescale, type ColorSchemeMode } from '@m3x/react';
import { color } from '@m3x/react/tokens/color.stylex';
import assets from '../../../../figma/chips/assets.json';

const s = stylex.create({
  page: { minHeight: '100vh', backgroundColor: color.surface, color: color.onSurface, padding: 32, display: 'grid', gap: 24, alignContent: 'start' },
  panel: { display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'end', padding: 16, borderRadius: 16, backgroundColor: color.surfaceContainer },
  stage: { padding: 16, borderRadius: 16, backgroundColor: color.surfaceContainerLow, maxWidth: 720 },
  muted: { color: color.onSurfaceVariant },
});

const Taxi = () => (
  <svg viewBox="0 0 18 18" width="18" height="18" fill="currentColor" aria-hidden style={{ display: 'block' }}>
    <path d={assets.taxi} />
  </svg>
);

export function ChipsPlayground() {
  const [scheme, setScheme] = useState<ColorSchemeMode>('light');
  const [elevated, setElevated] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [people, setPeople] = useState(['Ada', 'Grace', 'Katherine', 'Margaret']);
  const field = { font: 'inherit', fontSize: 14, padding: '6px 8px', borderRadius: 8 } as const;
  return (
    <M3Provider colorScheme={scheme}>
      <main {...stylex.props(s.page)}>
        <p style={{ margin: 0 }}><a href="/" style={{ color: 'inherit' }}>← all</a></p>
        <h1 {...stylex.props(typescale.headlineMedium)} style={{ margin: 0 }}>Chips playground</h1>
        <section {...stylex.props(s.panel)}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span {...stylex.props(s.muted)}>colour scheme</span>
            <select value={scheme} onChange={(e) => setScheme(e.target.value as ColorSchemeMode)} style={field}>
              <option>light</option><option>dark</option><option>system</option>
            </select>
          </label>
          <label style={{ fontSize: 12 }}><input type="checkbox" checked={elevated} onChange={(e) => setElevated(e.target.checked)} /> elevated</label>
          <label style={{ fontSize: 12 }}><input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} /> disabled</label>
        </section>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>Assist</h2>
        <ChipGroup sx={s.stage}>
          <AssistChip elevated={elevated} disabled={disabled} icon={<Taxi />}>Book a ride</AssistChip>
          <AssistChip elevated={elevated} disabled={disabled}>Add to calendar</AssistChip>
        </ChipGroup>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>Filter — click to select</h2>
        <ChipGroup sx={s.stage}>
          {['Under £50', 'Free delivery', 'In stock'].map((l) => (
            <FilterChip key={l} elevated={elevated} disabled={disabled}>{l}</FilterChip>
          ))}
          <FilterChip elevated={elevated} disabled={disabled} trailingIcon icon={<Taxi />}>Sort</FilterChip>
        </ChipGroup>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>Input — remove with ×</h2>
        <ChipGroup sx={s.stage}>
          {people.map((p) => (
            <InputChip key={p} avatar={<ChipAvatarPlaceholder />} disabled={disabled} onRemove={() => setPeople(people.filter((x) => x !== p))}>{p}</InputChip>
          ))}
        </ChipGroup>

        <h2 {...stylex.props(typescale.titleLarge)} style={{ margin: 0 }}>Suggestion</h2>
        <ChipGroup layout="scroll" sx={s.stage}>
          {['Sounds good', 'See you then', 'On my way', 'Thanks!', 'Running late'].map((l) => (
            <SuggestionChip key={l} elevated={elevated} disabled={disabled}>{l}</SuggestionChip>
          ))}
        </ChipGroup>
      </main>
    </M3Provider>
  );
}
