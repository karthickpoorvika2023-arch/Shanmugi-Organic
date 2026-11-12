/* Package the static storefront without publishing backend schemas or secrets. */
import { cpSync, copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, 'frontend'), dist, { recursive: true });
cpSync(join(root, 'plugins'), join(dist, 'plugins'), { recursive: true });
// The CMS editor offers a Copy SQL button; do not include other backend SQL.
copyFileSync(join(root, 'backend', 'schemas', 'supabase-content-schema.sql'),
  join(dist, 'supabase-content-schema.sql'));
console.log('Static site ready in dist/ (backend SQL and development tools excluded)');