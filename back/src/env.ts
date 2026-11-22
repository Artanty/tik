import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Zero-dep .env loader (KEY=VALUE lines, '#' comments; never overrides real env vars).
 */
export function loadEnv(file = resolve(process.cwd(), '.env')): void {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.trim().startsWith('#')) continue;
    const match = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const value = match[2].replace(/^['"]|['"]$/g, '');
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}
