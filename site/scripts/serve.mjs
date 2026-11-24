/**
 * 빌드 결과(dist)를 배포와 같은 하위 경로(/portfolio/)로 띄운다. GitHub Pages처럼 없는 주소는 404.html.
 *   npm run build && npm run preview
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const base = process.env.SITE_BASE ?? '/portfolio/';
const port = Number(process.env.PORT ?? 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function send(res, status, file) {
  res.writeHead(status, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    const pathname = decodeURIComponent((req.url ?? '/').split(/[?#]/)[0]);
    if (pathname === '/' || pathname === base.slice(0, -1)) {
      res.writeHead(302, { Location: base });
      return res.end();
    }
    const notFound = path.join(dist, '404.html');
    if (!pathname.startsWith(base)) return send(res, 404, notFound);
    let file = path.resolve(dist, pathname.slice(base.length));
    if (!file.startsWith(dist)) return send(res, 404, notFound);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!pathname.endsWith('/')) {
        res.writeHead(301, { Location: pathname + '/' });
        return res.end();
      }
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file)) return send(res, 404, notFound);
    send(res, 200, file);
  })
  .listen(port, () => console.log(`http://localhost:${port}${base}`));
