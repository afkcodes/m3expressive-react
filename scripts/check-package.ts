/**
 * Packs @m3x/react the way it would be published (publishConfig exports → dist) and checks the
 * tarball: publint (package.json / exports hygiene) and attw (types resolve for Node ESM and
 * bundlers; CommonJS is intentionally unsupported). Run after `pnpm --filter @m3x/react build`.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = fileURLToPath(new URL('../packages/m3/', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'm3x-pack-'));
const run = (cmd: string, args: string[], cwd = pkg) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });

run('pnpm', ['pack', '--pack-destination', out]);
const tarball = join(out, readdirSync(out).find((f) => f.endsWith('.tgz'))!);
run('pnpm', ['exec', 'publint', 'run', tarball]);
// fonts.css is a stylesheet entry; attw only resolves script modules.
run('pnpm', ['exec', 'attw', tarball, '--profile', 'esm-only', '--exclude-entrypoints', 'fonts.css']);
