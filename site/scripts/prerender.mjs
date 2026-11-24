/**
 * 빌드 마지막 단계: 페이지마다 HTML을 미리 만들고, 저장소의 정적 파일(캡처 · 시연 페이지)을 dist로 복사한다.
 * vite build(브라우저) → vite build --ssr(서버 렌더) 뒤에 돈다.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(siteDir, '..');
const dist = path.join(siteDir, 'dist');
const ssrDir = path.join(siteDir, 'dist-ssr');

const { render, pages, assets } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href);
const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
if (!template.includes('<!--app-html-->') || !template.includes('<!--app-head-->')) {
  throw new Error('dist/index.html에 <!--app-html--> · <!--app-head--> 자리가 없습니다');
}

for (const page of pages) {
  const { html, head } = render(page.path);
  const out = template.replace('<!--app-head-->', head).replace('<!--app-html-->', html);
  const file = path.join(dist, page.file);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, out);
}

// README가 쓰는 캡처만 복사한다(raw/ 원본 캡처는 올리지 않는다)
for (const rel of assets) {
  const to = path.join(dist, rel);
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(path.join(repoRoot, rel), to);
}

// 시연 페이지는 그대로
await fs.cp(path.join(repoRoot, 'demo'), path.join(dist, 'demo'), {
  recursive: true,
  filter: (src) => path.basename(src) !== '.DS_Store',
});

// GitHub Pages가 Jekyll로 다시 처리하지 않게
await fs.writeFile(path.join(dist, '.nojekyll'), '');
await fs.rm(ssrDir, { recursive: true, force: true });

console.log(`prerender: 페이지 ${pages.length}개 · 캡처 ${assets.length}장 · demo/ 복사 → ${path.relative(siteDir, dist)}/`);
