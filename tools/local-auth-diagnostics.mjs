/* Print only known-safe error categories from LOCAL GoTrue logs. Never print raw logs. */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const docker = process.env.LOCAL_DOCKER_CLI ||
  (process.platform === 'win32' ? join(process.env.LOCALAPPDATA || '', 'Programs', 'DockerDesktop', 'resources', 'bin', 'docker.exe') : 'docker');
const result = spawnSync(docker, ['logs', '--tail', '1500', 'supabase_auth_backend'],
  { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
if (result.status !== 0) throw new Error('Cannot read LOCAL Auth container logs');
let matched = 0;
for (const line of (result.stdout + '\n' + result.stderr).split(/\r?\n/)) {
  let event;
  try { event = JSON.parse(line); } catch { continue; }
  const issue = String(event.error || '') + ' ' + String(event.msg || '');
  if (!/database error querying schema|sql: scan error|converting null|error finding user/i.test(issue)) continue;
  matched++;
  const column = issue.match(/column\s+\d+,\s*name\s+["']?([a-z_]+)/i)?.[1] ||
    issue.match(/column\s+(?:name\s+)?["']?([a-z_]+)/i)?.[1] ||
    issue.match(/(?:converting NULL to|unsupported Scan, storing driver.Value type .* into type)\s+([a-z_]+)/i)?.[1] || 'unknown';
  const code = issue.match(/(?:SQLSTATE|code)\s*[(:]?\s*([0-9A-Z]{5})/i)?.[1] || 'none';
  const category = /converting NULL|<nil>|cannot scan null/i.test(issue) ? 'null_scan' :
    /SQLSTATE|duplicate key/i.test(issue) ? 'database_constraint' :
    /error finding user/i.test(issue) ? 'user_lookup' : 'querying_schema';
  const knownColumns = ['confirmation_token', 'recovery_token', 'email_change_token_new', 'email_change',
    'email_change_token_current', 'reauthentication_token',
    'encrypted_password', 'instance_id', 'phone_change_token'];
  const mentioned = knownColumns.filter(name => new RegExp('\\b' + name + '\\b', 'i').test(issue));
  console.log('auth_failure_category=' + (/database error querying schema/i.test(issue) ? 'querying_schema' : 'scan_or_lookup') +
    ' cause=' + category + ' column=' + (knownColumns.includes(column) ? column : mentioned.join(',') || 'unknown') + ' sqlstate=' + code);
}
console.log('matching_auth_failures=' + matched);