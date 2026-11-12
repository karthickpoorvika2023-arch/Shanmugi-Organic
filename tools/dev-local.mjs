/* Run the local preview and the local-only demo Edge Function together. */
import { spawn, execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'node_modules/supabase/dist/supabase.js');
const dockerDir = join(process.env.LOCALAPPDATA || '', 'Programs/DockerDesktop/resources/bin');
const env = { ...process.env, PATH: dockerDir + (process.platform === 'win32' ? ';' : ':') + process.env.PATH };
try {
  const output = execFileSync(process.execPath, [cli, 'status', '-o', 'env', '--workdir', join(root, 'backend')], {
    cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
  });
  const api = output.split(/\r?\n/).find(line => line.startsWith('API_URL='))?.slice(8).replace(/^"|"$/g, '');
  if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(api || '')) throw new Error('Not local');
} catch {
  console.error('Start Docker local Supabase first (from backend/: npx supabase start).');
  process.exit(1);
}
const edge = spawn(process.execPath, [cli, 'functions', 'serve', 'demo-payment-kit', '--workdir', join(root, 'backend')], {
  cwd: root, env, stdio: ['inherit', 'pipe', 'pipe']
});
const site = spawn(process.execPath, [join(root, 'tools/serve.mjs')], { cwd: root, env, stdio: 'inherit' });
// CLI may print local service-role/secret keys on startup: never forward raw output.
for (const stream of [edge.stdout, edge.stderr]) {
  let pending = '';
  stream.on('data', chunk => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || '';
    for (const line of lines) {
      if (/\b(key|secret|password|token|jwt)\b|sb_(secret|publishable)_|eyJhbGciOi|postgres(ql)?:\/\//i.test(line)) continue;
      console.log(line);
    }
  });
}
let closing = false;
const close = () => {
  if (closing) return;
  closing = true;
  site.kill(); edge.kill();
};
process.on('SIGINT', close);
process.on('SIGTERM', close);
edge.on('error', error => { console.error('Local Edge Function could not start:', error.message); close(); process.exitCode = 1; });
site.on('error', error => { console.error('Local preview could not start:', error.message); close(); process.exitCode = 1; });
edge.on('exit', code => { if (!closing) { console.error('Local Edge Function stopped (code ' + code + ').'); close(); process.exitCode = 1; } });
site.on('exit', code => { if (!closing) { console.error('Local preview stopped (code ' + code + ').'); close(); process.exitCode = 1; } });