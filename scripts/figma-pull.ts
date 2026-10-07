/**
 * Re-sync Figma references for one component via the Figma REST API.
 *
 *   FIGMA_TOKEN=... node scripts/figma-pull.ts <component>
 *
 * Reads figma/<component>/manifest.json (fileKey + variant node ids), then:
 *   - exports each variant as PNG @ manifest.scale → figma/<component>/<variant>.png
 *   - refreshes size / renderBounds / layer boxes from the node tree
 *
 * Optional: references are normally captured through the Figma MCP during
 * development. This exists so CI / anyone with a read-only token can refresh
 * them when the design changes. The token needs the file_content:read scope.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Manifest } from '../tests/visual/manifest.ts';

const token = process.env.FIGMA_TOKEN;
const component = process.argv[2];
if (!token || !component) {
  console.error('usage: FIGMA_TOKEN=... node scripts/figma-pull.ts <component>');
  process.exit(1);
}

const dir = join(process.cwd(), 'figma', component);
const manifestPath = join(dir, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
const ids = Object.values(manifest.variants).map((v) => v.node);

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.figma.com/v1/${path}`, { headers: { 'X-Figma-Token': token! } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`);
  return res.json() as Promise<T>;
}

type Box = { x: number; y: number; width: number; height: number };
type FigmaNode = {
  name: string;
  absoluteBoundingBox?: Box;
  absoluteRenderBounds?: Box | null;
  children?: FigmaNode[];
};

const round = (n: number) => Math.round(n * 100) / 100;

const nodes = await api<{ nodes: Record<string, { document: FigmaNode }> }>(
  `files/${manifest.fileKey}/nodes?ids=${encodeURIComponent(ids.join(','))}`,
);
const images = await api<{ images: Record<string, string | null> }>(
  `images/${manifest.fileKey}?ids=${encodeURIComponent(ids.join(','))}&format=png&scale=${manifest.scale}`,
);

for (const [name, v] of Object.entries(manifest.variants)) {
  const doc = nodes.nodes[v.node]?.document;
  const url = images.images[v.node];
  if (!doc?.absoluteBoundingBox || !url) {
    console.warn(`skip ${name}: node ${v.node} not found`);
    continue;
  }
  const origin = doc.absoluteBoundingBox;
  v.size = [round(origin.width), round(origin.height)];
  const rb = doc.absoluteRenderBounds;
  if (rb) v.renderBounds = [round(rb.x - origin.x), round(rb.y - origin.y), round(rb.width), round(rb.height)];

  const layers: NonNullable<typeof v.layers> = [];
  const walk = (n: FigmaNode) => {
    for (const c of n.children ?? []) {
      const b = c.absoluteBoundingBox;
      if (b)
        layers.push({
          name: c.name,
          box: [round(b.x - origin.x), round(b.y - origin.y), round(b.width), round(b.height)],
        });
      walk(c);
    }
  };
  walk(doc);
  v.layers = layers;

  const png = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(join(dir, `${name}.png`), png);
  console.log(`✓ ${name}  ${v.size.join('×')}  ${layers.length} layers`);
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
