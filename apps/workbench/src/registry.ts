import type { FixtureModule } from './fixtures/types.ts';
import { importBeforeLoad } from './load.ts';

/**
 * Fixture modules, loaded on demand: a fixture or compare page imports only its own component's
 * module, so one module's init error breaks that component's pages alone (the gallery lists it).
 */
const modules = import.meta.glob<{ default: FixtureModule }>('./fixtures/*.fixtures.tsx');

const pathOf = (file: string) => `./fixtures/${file}.fixtures.tsx`;
const fileOf = (path: string) => path.slice('./fixtures/'.length, -'.fixtures.tsx'.length);

export interface LoadedFixture {
  /** File name without `.fixtures.tsx`. */
  file: string;
  module?: FixtureModule;
  /** Why the module failed to load (its init threw, or an import is broken). */
  error?: unknown;
}

let all: Promise<LoadedFixture[]> | undefined;

/** Every module (the gallery). A module that fails to load is listed with its error, not thrown. */
export function loadAllFixtures(): Promise<LoadedFixture[]> {
  all ??= Promise.all(
    Object.entries(modules).map(([path, load]) =>
      load().then(
        (m): LoadedFixture => ({ file: fileOf(path), module: m.default }),
        (error: unknown): LoadedFixture => ({ file: fileOf(path), error }),
      ),
    ),
  );
  return all;
}

/**
 * The module whose default export's `component` is `component` (undefined if none). A module is
 * named after its component, so that file is tried first; otherwise every module is loaded and
 * matched by `component`.
 */
export async function loadFixture(component: string): Promise<FixtureModule | undefined> {
  const path = pathOf(component);
  const own = modules[path];
  if (own) {
    const mod = (await importBeforeLoad(own, new URL(path, import.meta.url))).default;
    if (mod.component === component) return mod;
  }
  return (await loadAllFixtures()).find((f) => f.module?.component === component)?.module;
}
