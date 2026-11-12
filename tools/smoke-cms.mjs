/* Smoke test: boot the preview server, fetch key assets, then shut down. */
import { spawn } from 'node:child_process';

const srv = spawn(process.execPath, ['tools/serve.mjs'], { stdio: 'ignore' });
const urls = [
  '/index.html',
  '/signin.html',
  '/plugins/cms/content-cms.js',
  '/plugins/cms/admin-content.js',
  '/plugins/cms/content-cms.css',
  '/plugins/supabase/supabase-client.js',
  '/assets/css/style.css',
  '/assets/img/favicon.svg',
  '/assets/img/scenes/hero-slide-1.jpg',
  '/admin.html',
  '/supabase-content-schema.sql'
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;

try {
  await wait(1500);
  for (const u of urls) {
    try {
      const r = await fetch('http://localhost:4173' + u);
      const body = await r.text();
      const flag = r.ok && body.length > 0 ? 'OK  ' : 'EMPTY';
      if (!r.ok || !body.length) failed++;
      console.log(`${flag} ${r.status} ${body.length} bytes  ${u}`);
    } catch (e) {
      failed++;
      console.log(`FAIL ----            ${u}  ${e.message}`);
    }
  }
  for (const u of ['/backend/schemas/supabase-schema.sql', '/package.json', '/.env.example']) {
    const r = await fetch('http://localhost:4173' + u);
    if (r.ok) failed++;
    console.log(`${r.ok ? 'FAIL' : 'OK  '} ${r.status} blocked ${u}`);
  }
} finally {
  srv.kill();
}

console.log(failed ? `SMOKE TEST FAILED (${failed})` : 'SMOKE TEST PASSED');
process.exit(failed ? 1 : 0);
