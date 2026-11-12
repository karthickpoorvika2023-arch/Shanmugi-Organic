/* LOCAL-only Auth regression: a wrong password must return invalid credentials,
   not a 500 caused by NULL token fields in an imported auth.users row. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docker = process.env.LOCAL_DOCKER_CLI || (process.platform === 'win32'
  ? join(process.env.LOCALAPPDATA || '', 'Programs', 'DockerDesktop', 'resources', 'bin', 'docker.exe')
  : 'docker');
const running = execFileSync(docker, ['inspect', '--format', '{{.State.Running}}', 'supabase_db_backend'], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
}).trim();
assert.equal(running, 'true', 'LOCAL Docker Supabase is required');

const status = execFileSync(process.execPath, [join(root, 'node_modules', 'supabase', 'dist', 'supabase.js'),
  'status', '-o', 'env', '--workdir', join(root, 'backend')], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
});
const values = Object.fromEntries(status.split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => {
  const at = line.indexOf('=');
  return [line.slice(0, at), line.slice(at + 1).replace(/^"|"$/g, '')];
}));
const url = new URL(values.API_URL);
assert.match(url.origin, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/, 'LOCAL Auth endpoint required');
const publicKey = values.ANON_KEY || values.PUBLISHABLE_KEY;
assert.ok(publicKey, 'LOCAL public key required');

// Check a genuinely imported account (not just the pre-existing local user)
// without printing its email. Compare UUIDs to the pre-merge local backup.
const backup = process.env.LOCAL_PRE_MERGE_BACKUP;
assert.ok(backup, 'Set LOCAL_PRE_MERGE_BACKUP to the private pre-merge local dump folder');
const preMerge = readFileSync(join(backup, 'data.sql'), 'utf8');
const match = preMerge.match(/^COPY "auth"\."users" \(([^\n]+)\) FROM stdin;\r?\n([\s\S]*?)^\\\.\r?$/m);
assert.ok(match, 'Pre-merge backup must contain auth.users');
const cols = match[1].split(',').map(c => c.trim().replaceAll('"', ''));
const idIndex = cols.indexOf('id');
assert.ok(idIndex >= 0, 'Pre-merge backup missing user IDs');
const previous = new Set(match[2].trim().split(/\r?\n/).map(row => row.split('\t')[idIndex]));
const candidates = execFileSync(docker, ['exec', 'supabase_db_backend', 'psql', '-U', 'postgres', '-d', 'postgres',
  '-tAc', "select id::text||'|'||email from auth.users where encrypted_password is not null;"], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
}).trim().split(/\r?\n/);
const email = candidates.map(row => row.split('|')).find(([id, addr]) => addr && !previous.has(id))?.[1];
assert.ok(email, 'An imported local account with a password is required');
const result = await fetch(url.origin + '/auth/v1/token?grant_type=password', {
  method: 'POST', headers: { apikey: publicKey, 'content-type': 'application/json' },
  body: JSON.stringify({ email, password: randomBytes(32).toString('base64url') })
});
// The response body may contain identifiers; only report the HTTP status.
assert.equal(result.status, 400, 'LOCAL password sign-in should reject a wrong password, not fail with a schema error (HTTP ' + result.status + ')');
console.log('PASS: local password sign-in rejects an incorrect password without an Auth schema error');