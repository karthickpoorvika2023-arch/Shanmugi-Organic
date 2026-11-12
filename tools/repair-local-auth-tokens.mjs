/* Repair only the NULL GoTrue string-token fields imported from a cloud dump.
   LOCAL Docker database only. No credentials or user data are printed. */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { statSync } from 'node:fs';

const backup = process.env.LOCAL_PRE_AUTH_FIX_BACKUP;
const apply = process.argv[2] === '--apply';
if (!['--dry-run', '--apply'].includes(process.argv[2]) ||
    apply && process.env.CONFIRM_LOCAL_AUTH_REPAIR !== 'LOCAL_ONLY' || !backup) {
  throw new Error('Set LOCAL_PRE_AUTH_FIX_BACKUP and run --dry-run, or --apply with CONFIRM_LOCAL_AUTH_REPAIR=LOCAL_ONLY.');
}
for (const name of ['data.sql','schema.sql','roles.sql']) {
  if (statSync(join(backup, name)).size === 0) throw new Error('Complete post-merge LOCAL backup required.');
}
const docker = process.env.LOCAL_DOCKER_CLI ||
  (process.platform === 'win32' ? join(process.env.LOCALAPPDATA || '', 'Programs', 'DockerDesktop', 'resources', 'bin', 'docker.exe') : 'docker');
const container = 'supabase_db_backend';
const probe = spawnSync(docker, ['inspect','--format','{{.State.Running}}',container], { encoding:'utf8' });
if (probe.status !== 0 || probe.stdout.trim() !== 'true') throw new Error('Expected local Docker database not running.');
const sql = `\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout = '10s';
SELECT 'users_with_null_tokens_before='||count(*) FROM auth.users
 WHERE confirmation_token IS NULL OR recovery_token IS NULL
 OR email_change_token_new IS NULL OR email_change IS NULL;
UPDATE auth.users SET
 confirmation_token = COALESCE(confirmation_token, ''),
 recovery_token = COALESCE(recovery_token, ''),
 email_change_token_new = COALESCE(email_change_token_new, ''),
 email_change = COALESCE(email_change, '')
 WHERE confirmation_token IS NULL OR recovery_token IS NULL
 OR email_change_token_new IS NULL OR email_change IS NULL;
SELECT 'users_with_null_tokens_after='||count(*) FROM auth.users
 WHERE confirmation_token IS NULL OR recovery_token IS NULL
 OR email_change_token_new IS NULL OR email_change IS NULL;
${apply ? 'COMMIT;' : 'ROLLBACK;'}
`;
const result = spawnSync(docker, ['exec','-i',container,'psql','-U','postgres','-d','postgres',
  '-X','-A','-t','-q','-v','ON_ERROR_STOP=1'], { input: sql, encoding:'utf8' });
if (result.status !== 0) throw new Error('LOCAL repair failed; transaction rolled back.');
console.log(result.stdout.trim());
console.log(apply ? 'Local Auth token fields repaired; cloud unchanged.' : 'Dry run rolled back; no data changed.');