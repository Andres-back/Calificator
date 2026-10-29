// Read-only HTTPS preview for explicitly authorized local physical-device QA.
import { createServer } from 'node:https';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isIP } from 'node:net';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function permittedHost(host, allowLan) {
  if (host === '127.0.0.1') return true;
  if (!allowLan || isIP(host) !== 4) return false;
  const [a, b] = host.split('.').map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export function qaHandler(directory) {
  const root = realpathSync(directory);
  const marker = JSON.parse(readFileSync(resolve(root, 'qa-only.json'), 'utf8'));
  if (marker.purpose !== 'spec131-phone-qa' || marker.noApi !== true) throw new Error('Standalone QA build required');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
    '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml' };
  return (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'https://localhost').pathname);
      const name = pathname === '/' || pathname === '/index.html' ? 'index.html' : pathname.slice(1);
      if (name.includes('..') || name.includes('\\') || !/^(?:index\.html|assets\/[A-Za-z0-9._-]+|vendor\/opencv\/4\.13\.0-csp1\/(?:opencv-module\.js|opencv_js\.wasm))$/.test(name)) throw new Error('Unknown path');
      const file = realpathSync(resolve(root, name));
      const fromRoot = relative(root, file);
      if (fromRoot.startsWith('..') || fromRoot.includes(':') || !statSync(file).isFile()) throw new Error('Unknown file');
      const type = types[extname(file)];
      if (!type) throw new Error('Unknown type');
      const worker = /^assets\/evidenceScan\.worker-[A-Za-z0-9_-]+\.js$/.test(name);
      response.setHeader('Content-Security-Policy', worker
        ? "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'"
        : "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:; worker-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
      response.setHeader('Content-Type', type);
      response.writeHead(200); response.end(request.method === 'HEAD' ? undefined : readFileSync(file));
    } catch { response.writeHead(404); response.end(); }
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some((value) => !value.startsWith('--host=') && value !== '--allow-lan')) throw new Error('Use --host=<private IPv4> --allow-lan only after authorization');
  const host = args.find((value) => value.startsWith('--host='))?.slice(7) ?? '127.0.0.1';
  if (!permittedHost(host, args.includes('--allow-lan'))) throw new Error('Loopback or explicitly authorized private IPv4 required');
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const tls = resolve(root, 'tmp/spec131-phone-qa-tls');
  const server = createServer({ cert: readFileSync(resolve(tls, 'certificate.pem')), key: readFileSync(resolve(tls, 'private-key.pem')) },
    qaHandler(resolve(root, 'output/playwright/spec131-phone-qa')));
  server.requestTimeout = 10_000;
  server.listen(4193, host, () => console.log(`Private, static QA only: https://${host}:4193/ — no uploads, API or production`));
  // Do not leave a private preview listening indefinitely after a manual test.
  setTimeout(() => { server.close(); server.closeAllConnections(); console.log('Private QA session expired after 30 minutes.'); }, 30 * 60_000).unref();
}
