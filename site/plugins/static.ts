/**
 * 개발 서버에서 저장소의 정적 파일(프로젝트 캡처 · 시연 페이지)을 배포 주소 그대로 보여 준다.
 * 빌드 때는 scripts/prerender.mjs가 같은 파일을 dist로 복사한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

/** 저장소에서 그대로 내보내는 경로 — 시연 페이지와 프로젝트 폴더의 images/ */
export function isRepoStatic(rel: string): boolean {
  return rel === 'demo' || rel.startsWith('demo/') || /^[\w-]+\/images\/[^/]+$/.test(rel);
}

export function repoStaticPlugin({ repoRoot, base }: { repoRoot: string; base: string }): Plugin {
  return {
    name: 'portfolio-repo-static',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '').split(/[?#]/)[0];
        if (!pathname.startsWith(base)) return next();
        const rel = decodeURIComponent(pathname.slice(base.length));
        if (!isRepoStatic(rel)) return next();
        if (rel === 'demo') {
          res.writeHead(301, { Location: `${base}demo/` });
          return res.end();
        }
        let file = path.resolve(repoRoot, rel);
        if (!file.startsWith(repoRoot + path.sep)) return next();
        if (rel.endsWith('/')) file = path.join(file, 'index.html');
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
          res.writeHead(404);
          return res.end('not found');
        }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}
