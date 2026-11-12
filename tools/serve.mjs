/* Minimal static file server for local preview — no dependencies. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = join(ROOT, 'frontend');
const PLUGINS = join(ROOT, 'plugins');
const CMS_SCHEMA = join(ROOT, 'backend', 'schemas', 'supabase-content-schema.sql');
const PORT = Number(process.env.PORT || 4173);
const otpAttempts = new Map();
// Use the local anon JWT so the browser SDK and REST fallbacks share the same
// non-privileged role. Never send SERVICE_ROLE_KEY or SECRET_KEY to the browser.
// CLI status is local-only. Never send the service-role key, secret key or DB URL to a browser.
function localConfig() {
  const cli = join(ROOT, 'node_modules', 'supabase', 'dist', 'supabase.js');
  const status = execFileSync(process.execPath, [cli, 'status', '-o', 'env', '--workdir', join(ROOT, 'backend')], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000
  });
  const values = Object.fromEntries(status.split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line))
    .map(line => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1).replace(/^"|"$/g, '')]; }));
  const url = new URL(values.API_URL);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      !url.port || !(values.PUBLISHABLE_KEY || values.ANON_KEY)) throw new Error('Local Supabase unavailable');
  return { url: url.origin, publicKey: values.ANON_KEY || values.PUBLISHABLE_KEY };
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.sql': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

createServer(async (req, res) => {
  try {
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '') ||
        !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) {
      res.writeHead(403).end('Local preview only'); return;
    }
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/__local/signin-otp/start') {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      const respond = (status, message) => { res.writeHead(status); res.end(JSON.stringify({ error: message })); };
      if (req.method !== 'POST' || req.headers.origin !== `http://${req.headers.host}` ||
          !/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
        respond(403, 'Local sign-in only'); return;
      }
      let raw = '';
      for await (const part of req) {
        raw += part;
        if (raw.length > 2048) { respond(413, 'Request too large'); return; }
      }
      let input;
      try { input = JSON.parse(raw); } catch { respond(400, 'Invalid request'); return; }
      const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
      const password = input?.password;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || !password) {
        respond(400, 'Enter a valid email and password'); return;
      }
      const now = Date.now();
      for (const [key, until] of otpAttempts) if (until <= now) otpAttempts.delete(key);
      if (otpAttempts.has(email)) { respond(429, 'Wait 60 seconds before requesting another code'); return; }
      let auth;
      try {
        const { url, publicKey } = localConfig();
        auth = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const signed = await auth.auth.signInWithPassword({ email, password });
        if (signed.error || !signed.data.user || !signed.data.session ||
            signed.data.user.email?.toLowerCase() !== email) {
          respond(400, 'Invalid email or password'); return;
        }
        // Never hand a password-authenticated session to the browser.
        const signedOut = await auth.auth.signOut({ scope: 'local' });
        if (signedOut.error) { respond(503, 'Could not start verification'); return; }
        otpAttempts.set(email, now + 60000);
        const sent = await auth.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
        if (sent.error) {
          otpAttempts.delete(email);
          respond(503, 'Could not send a code. Check local Mailpit and try again later'); return;
        }
        res.writeHead(200); res.end(JSON.stringify({ sent: true }));
      } catch {
        respond(503, 'Local sign-in service unavailable');
      }
      return;
    }
    if (p === '/__local/supabase-config.js') {
      if (req.method !== 'GET' || req.headers.origin || req.headers.referer &&
          !/^http:\/\/(localhost|127\.0\.0\.1):\d+\//.test(req.headers.referer)) {
        res.writeHead(403).end('Local page only'); return;
      }
      try {
        const config = localConfig();
        res.writeHead(200, { 'Content-Type': TYPES['.js'], 'Cache-Control': 'no-store' });
        res.end('window.__soSupabaseConfig = ' + JSON.stringify(config).replace(/</g, '\\u003c') + ';');
      } catch {
        res.writeHead(503).end('Local Supabase is not running');
      }
      return;
    }
    // Keep backend SQL/configuration private; only the CMS setup schema is public.
    if (p.includes('\\') || p.split('/').some(part => part === '..' || part.startsWith('.'))) {
      res.writeHead(403).end('Forbidden'); return;
    }
    if (p.endsWith('/')) p += 'index.html';
    const schemaRequest = p === '/supabase-content-schema.sql';
    const isPlugin = p.startsWith('/plugins/');
    const base = isPlugin ? PLUGINS : FRONTEND;
    const name = isPlugin ? p.slice('/plugins/'.length) : p.replace(/^\/+/, '');
    const file = schemaRequest ? CMS_SCHEMA : resolve(base, name);
    const rel = relative(base, file);
    if (!schemaRequest && (rel === '..' || rel.startsWith('..\\') || isAbsolute(rel))) {
      res.writeHead(403).end('Forbidden'); return;
    }
    const s = await stat(file);
    if (s.isDirectory()) { res.writeHead(404).end('Not found'); return; }
    let body = await readFile(file);
    if (extname(file).toLowerCase() === '.html') {
      // Present before any auth, CMS, signup or checkout script. No config is copied to dist/.
      body = Buffer.from(body.toString('utf8').replace(/<\/head>/i,
        '<script src="/__local/supabase-config.js"></script>\n</head>'));
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1><p>' + req.url + '</p>');
  }
}).listen(PORT, () => console.log('Shanmuga Organics preview → http://localhost:' + PORT + '/'));
