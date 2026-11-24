/**
 * 사이트 설정. 내용(소개 · 프로젝트 · 기술)은 여기 두지 않는다 — 저장소의 README가 원천이다(docs/design/0004 §2).
 */
export interface SiteConfig {
  /** 사이트가 놓이는 경로. 저장소 이름을 imahost.github.io로 바꾸거나 개인 도메인을 붙이면 '/' */
  base: string;
  /** 주소의 앞부분(링크 미리보기 · canonical) */
  origin: string;
  /** README 안에 절대 주소로 적힌 사이트 링크 — 사이트 안 주소로 바꾼다 */
  readmeSitePrefixes: string[];
  /** 검색 엔진에 노출할지. 기본값 false(noindex) — 확인 필요 */
  indexable: boolean;
  repoUrl: string;
  /** 공개할 연락처(첫 화면 · 꼬리) */
  email: string | null;
  /** 내려받을 PDF(사이트 기준 경로). pdf/가 git 밖이라 아직 숨김 — 확인 필요 */
  pdf: string | null;
}

export const siteConfig: SiteConfig = {
  base: process.env.SITE_BASE ?? '/portfolio/',
  origin: 'https://imahost.github.io',
  readmeSitePrefixes: ['https://imahost.github.io/portfolio/'],
  indexable: false,
  repoUrl: 'https://github.com/ImaHost/portfolio',
  email: 'gujjang000@gmail.com',
  pdf: null,
};
