import type { FixtureModule } from './fixtures/types.ts';

const modules = import.meta.glob<{ default: FixtureModule }>('./fixtures/*.fixtures.tsx', {
  eager: true,
});

export const fixtures: Record<string, FixtureModule> = Object.fromEntries(
  Object.values(modules).map((m) => [m.default.component, m.default]),
);
