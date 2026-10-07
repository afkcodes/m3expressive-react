import * as stylex from '@stylexjs/stylex';
import { AssistChip, ChipAvatarPlaceholder, ChipGroup, FilterChip, InputChip, SuggestionChip } from '@m3x/react';
import { ForceState, type ForcedState } from '@m3x/react/testing';
import manifest from '../../../../figma/chips/manifest.json';
import assets from '../../../../figma/chips/assets.json';
import brandLogo from '../../../../figma/chips/assets/brand-logo.svg';
import type { FixtureModule, FixtureVariant } from './types.ts';

const Taxi = () => (
  <svg viewBox="0 0 18 18" width="18" height="18" fill="currentColor" aria-hidden style={{ display: 'block', flexShrink: 0 }}>
    <path d={assets.taxi} />
  </svg>
);
const Brand = () => <img src={brandLogo} width={18} height={18} alt="" style={{ display: 'block', flexShrink: 0 }} />;
const g = stylex.create({ scroll: { width: 360, height: 48, overflow: 'hidden' }, wrap: { width: 360, height: 96, overflow: 'hidden', alignContent: 'flex-start' } });
const STATE: Record<string, string> = { enabled: 'enabled', hovered: 'hovered', focused: 'focused', pressed: 'pressed', dragged: 'dragged', disabled: 'disabled', ena: 'enabled', hov: 'hovered', foc: 'focused', pre: 'pressed', dra: 'dragged', dis: 'disabled' };
const forcedOf = (st: string): ForcedState | undefined => (st === 'hovered' || st === 'focused' || st === 'pressed' ? st : undefined);

/** Figma "Chips": assist / filter / input / suggestion variants and chip groups. */
const fixture: FixtureModule = {
  component: 'chips',
  variants: Object.fromEntries([
    [
      'live',
      {
        render: () => (
          <ChipGroup aria-label="Filters">
            <FilterChip icon={<Taxi />}>Label</FilterChip>
            <InputChip onRemove={() => document.body.setAttribute('data-removed', '1')}>Label</InputChip>
            <AssistChip icon={<Taxi />}>Label</AssistChip>
          </ChipGroup>
        ),
      },
    ],
    // Motion probe: label-only filter chips (the check slot springs open / closed).
    [
      'filter-live',
      {
        render: () => (
          <ChipGroup aria-label="Filters">
            <FilterChip>Label</FilterChip>
            <FilterChip elevated>Label</FilterChip>
          </ChipGroup>
        ),
      },
    ],
    ...Object.entries(manifest.variants).map(([name, v]): [string, FixtureVariant] => {
      const p = name.split('-');
      let render: () => React.ReactNode;
      if (p[0] === 'assist') {
        const [, style, cfg, st] = p as [string, string, string, string];
        const state = STATE[st]!;
        render = () => (
          <ForceState state={forcedOf(state)}>
            <AssistChip elevated={style === 'el'} dragged={state === 'dragged'} disabled={state === 'disabled'} icon={cfg === 'icon' ? <Taxi /> : cfg === 'brand' ? <Brand /> : undefined}>
              Label
            </AssistChip>
          </ForceState>
        );
      } else if (p[0] === 'filter') {
        const [, style, cfg, st, sel, trailing] = p as [string, string, string, string, string, string];
        const state = STATE[st]!;
        render = () => (
          <ForceState state={forcedOf(state)}>
            <FilterChip elevated={style === 'el'} selected={sel === 't'} trailingIcon={trailing === 't'} dragged={state === 'dragged'} disabled={state === 'disabled'} icon={cfg === 'icon' ? <Taxi /> : undefined}>
              Label
            </FilterChip>
          </ForceState>
        );
      } else if (p[0] === 'input') {
        const [, cfg, st, sel, close] = p as [string, string, string, string, string];
        const state = STATE[st]!;
        render = () => (
          <ForceState state={forcedOf(state)}>
            <InputChip
              selected={sel === 't'}
              dragged={state === 'dragged'}
              avatar={cfg === 'avatar' ? <ChipAvatarPlaceholder /> : undefined}
              icon={cfg === 'icon' ? <Taxi /> : undefined}
              onRemove={close === 't' ? () => {} : undefined}
            >
              Label
            </InputChip>
          </ForceState>
        );
      } else if (p[0] === 'suggestion') {
        const [, style, st, sel, icon] = p as [string, string, string, string, string];
        const state = STATE[st]!;
        render = () => (
          <ForceState state={forcedOf(state)}>
            <SuggestionChip elevated={style === 'el'} selected={sel === 't'} dragged={state === 'dragged'} disabled={state === 'disabled'} icon={icon === 't' ? <Taxi /> : undefined}>
              Label
            </SuggestionChip>
          </ForceState>
        );
      } else {
        const [, type, layout] = p as [string, string, string];
        const wrap = layout.startsWith('multiple');
        const Chip = type.startsWith('input') ? InputChip : type.startsWith('assist') ? AssistChip : type.startsWith('filter') ? FilterChip : SuggestionChip;
        render = () => (
          <ChipGroup layout={wrap ? 'wrap' : 'scroll'} sx={wrap ? g.wrap : g.scroll}>
            {Array.from({ length: 9 }, (_, i) => <Chip key={i}>Label</Chip>)}
          </ChipGroup>
        );
      }
      return [name, { node: v.node, render }];
    }),
  ]),
};
export default fixture;
