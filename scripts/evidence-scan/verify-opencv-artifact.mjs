import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { chromium, webkit } = require('@playwright/test');
const directory = resolve(process.argv[2] ?? 'tmp/opencv-csp-artifact');
const artifacts = ['opencv.js', 'opencv-module.js', 'opencv_js.wasm'];
const manifest = artifacts.map((name) => {
  const bytes = readFileSync(resolve(directory, name));
  return { name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
});
const source = readFileSync(resolve(directory, 'opencv.js'), 'utf8');
if (/\bnew\s+Function\b|\beval\s*\(/.test(source)) throw new Error('Artefacto rechazado: ejecución dinámica de JavaScript.');
const declared = JSON.parse(readFileSync(resolve(directory, 'manifest.json'), 'utf8'));
for (const file of manifest) {
  if (declared.files[file.name]?.sha256 !== file.sha256 || declared.files[file.name]?.bytes !== file.bytes) throw new Error(`Hash/tamaño distintos: ${file.name}`);
}

const worker = `
importScripts('/opencv.js');
Promise.resolve(self.cv).then(cv => {
  const gray = cv.Mat.zeros(80, 100, cv.CV_8UC1);
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const quad = cv.matFromArray(4, 1, cv.CV_32FC2, [0,0,99,0,99,79,0,79]);
  const warped = new cv.Mat();
  let matrix;
  try {
    cv.rectangle(gray, new cv.Point(10,10), new cv.Point(90,70), new cv.Scalar(255), 2);
    cv.findContours(gray, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    matrix = cv.getPerspectiveTransform(quad, quad);
    cv.warpPerspective(gray, warped, matrix, new cv.Size(100,80), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(0));
    postMessage({ok:contours.size()===1&&warped.rows===80&&warped.cols===100,contours:contours.size(),heapBytes:cv.HEAP8?.buffer.byteLength ?? null});
  } finally {
    gray.delete();contours.delete();hierarchy.delete();quad.delete();warped.delete();matrix?.delete();
  }
}).catch(error=>postMessage({ok:false,error:String(error.message||error)}));`;
const script = `
window.scanProbeViolations=[];
document.addEventListener('securitypolicyviolation',e=>window.scanProbeViolations.push(e.effectiveDirective));
const worker=new Worker('/worker.js');
worker.onmessage=e=>{window.scanProbeResult=e.data;worker.terminate();};
worker.onerror=e=>{window.scanProbeResult={ok:false,error:e.message};worker.terminate();};`;
const moduleWorker = worker.replace("importScripts('/opencv.js');\nPromise.resolve(self.cv)", "import cvPromise from '/opencv-module.js';\nPromise.resolve(cvPromise)");
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const scriptPolicy = ['/worker.js', '/worker-module.js'].includes(url.pathname) ? "'self' 'wasm-unsafe-eval'" : "'self'";
  response.setHeader('Content-Security-Policy', `default-src 'none'; script-src ${scriptPolicy}; worker-src 'self'; connect-src 'self'; base-uri 'none'`);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (url.pathname === '/') {
    response.setHeader('Content-Type', 'text/html');
    response.end(`<!doctype html><title>Escáner sintético CSP</title><script src="/probe.js${url.search}" defer></script>`);
  } else if (['/probe.js', '/worker.js', '/worker-module.js'].includes(url.pathname)) {
    response.setHeader('Content-Type', 'text/javascript');
    response.end(url.pathname === '/probe.js' ? url.searchParams.has('module') ? script.replace("new Worker('/worker.js')", "new Worker('/worker-module.js',{type:'module'})") : script : url.pathname === '/worker.js' ? worker : moduleWorker);
  } else if (artifacts.some((name) => url.pathname === `/${name}`)) {
    const name = url.pathname.slice(1);
    response.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
    response.end(readFileSync(resolve(directory, name)));
  } else {
    response.statusCode = 404;
    response.end();
  }
});

await new Promise((done) => server.listen(0, '127.0.0.1', done));
try {
  const results = [];
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await engine.launch();
    try {
      for (const format of ['classic', 'module']) {
      const page = await browser.newPage();
      const started = performance.now();
      await page.goto(`http://127.0.0.1:${server.address().port}/${format === 'module' ? '?module' : ''}`);
      await page.waitForFunction(() => window.scanProbeResult, undefined, { timeout: 15000 });
      const probe = await page.evaluate(() => ({ result: window.scanProbeResult, violations: window.scanProbeViolations }));
      if (!probe.result?.ok || probe.violations.length) throw new Error(`${name}: ${JSON.stringify(probe)}`);
      results.push({ browser: name, format, version: browser.version(), durationMs: Math.round(performance.now() - started), ...probe });
      await page.close();
      }
    } finally {
      await browser.close();
    }
  }
  console.log(JSON.stringify({ artifacts: manifest, licenseBytes: statSync(resolve(directory, 'LICENSE-OpenCV.txt')).size, results }, null, 2));
} finally {
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}
