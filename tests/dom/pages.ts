import type { ComponentType } from 'react';

/** Every workbench playground: together they render each public component with real props. */
export const pages = import.meta.glob<Record<string, ComponentType>>('../../apps/workbench/src/pages/*Playground.tsx', {
  eager: true,
});

export const playgrounds = Object.entries(pages).flatMap(([file, mod]) =>
  Object.entries(mod)
    .filter(([name]) => name.endsWith('Playground'))
    .map(([name, Page]) => ({ name, file: file.split('/').pop()!, Page })),
);
