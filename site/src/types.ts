import type { Root } from 'hast';
import type { SiteConfig } from '../site.config';

/** 브라우저에 넘기는 설정 — 빌드 전용 값은 뺀다 */
export type PublicConfig = Pick<SiteConfig, 'base' | 'origin' | 'indexable' | 'repoUrl' | 'email' | 'pdf'>;

export interface Image {
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface MetaRow {
  label: string;
  /** README 표 칸의 인라인 내용(굵게 · 링크 유지) */
  value: Root;
}

export interface DemoLink {
  label: string;
  href: string;
}

export interface TocItem {
  id: string;
  text: string;
}

export interface Project {
  /** 저장소 폴더 이름 = 사이트 주소 */
  id: string;
  /** 루트 README 표의 이름(목록용) */
  name: string;
  /** 상세 README의 `# 제목` */
  title: string;
  period: string;
  role: string;
  summary: string;
  stack: string[];
  meta: MetaRow[];
  demo: DemoLink[];
  demoNote: string | null;
  cover: Image | null;
  toc: TocItem[];
  body: Root;
}

export interface SkillGroup {
  label: string;
  items: string[];
  note: string | null;
}

export interface Profile {
  name: string;
  headline: string;
  intro: string[];
  demo: (DemoLink & { note: string | null }) | null;
  skills: SkillGroup[];
  note: Root;
}

export interface SiteData {
  config: PublicConfig;
  profile: Profile;
  projects: Project[];
  /** 사이트에 복사할 저장소 파일(저장소 기준 경로) — prerender가 쓴다 */
  assets: string[];
}
