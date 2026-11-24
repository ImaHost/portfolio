# 포트폴리오 홈페이지

저장소의 README(루트 1개 + 프로젝트 6개)를 읽어 만드는 정적 사이트입니다. 내용은 README에서만 고치면 GitHub 화면과 이 사이트가 함께 바뀝니다.

React 18 · TypeScript · Vite 5. 빌드할 때 페이지마다 HTML을 미리 만들고(prerender), 브라우저에서 React가 이어받습니다(hydrate).

## 실행

```bash
cd site
npm install
npm run dev       # 개발 서버 — http://localhost:5173/portfolio/ (README를 고치면 바로 반영)
npm run build     # 타입 검사 → 브라우저 빌드 → 서버 렌더 빌드 → 페이지 생성 · 캡처 · demo/ 복사 → dist/
npm run preview   # dist/를 배포와 같은 경로로 — http://localhost:4173/portfolio/
```

## 구조

| 경로 | 하는 일 |
|---|---|
| `plugins/content.ts` | README → 사이트 데이터(가상 모듈 `virtual:site-data`). 마크다운 해석은 Node 쪽에서만 하고 브라우저에는 변환된 트리만 보낸다. 필수 구조가 없거나 캡처 파일이 없으면 빌드를 멈춘다 |
| `plugins/static.ts` | 개발 서버에서 저장소의 `*/images/` · `demo/`를 배포 주소 그대로 |
| `scripts/prerender.mjs` | 페이지별 HTML · README가 쓰는 캡처만 복사 · `demo/` 복사 · `.nojekyll` |
| `src/components/Markdown.tsx` | 변환된 트리를 React로 — 캡처(크게 보기) · mermaid 그림 · 표 감싸기 |
| `site.config.ts` | 주소 · 검색 노출 · 연락처 · PDF |

README를 사이트로 바꾸는 규칙은 `docs/design/0004-homepage.md` §4에 있습니다.

## 배포

`main`에 푸시하면 `.github/workflows/pages.yml`이 빌드해 GitHub Pages로 올립니다. 저장소 Settings → Pages → Source가 **GitHub Actions**여야 합니다.
