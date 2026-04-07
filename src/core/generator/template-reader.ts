import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, 'templates');

export function readTemplate(relativePath: string): string {
  return readFileSync(resolve(TEMPLATES_DIR, relativePath), 'utf-8');
}
