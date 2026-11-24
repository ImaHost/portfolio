import type { Project } from './types';
import { profile, projects } from './data';

export type Route =
  | { kind: 'home' }
  | { kind: 'project'; project: Project; prev: Project | null; next: Project | null }
  | { kind: 'notFound' };

/** 미리 만들 페이지 — 경로는 base 뒤의 부분, file은 dist 안 파일 */
export const pages: { path: string; file: string }[] = [
  { path: '', file: 'index.html' },
  ...projects.map((p) => ({ path: `${p.id}/`, file: `${p.id}/index.html` })),
  { path: '404', file: '404.html' },
];

export function resolveRoute(path: string): Route {
  const clean = path.replace(/^\/+/, '').replace(/index\.html$/, '').replace(/\/+$/, '');
  if (clean === '') return { kind: 'home' };
  const i = projects.findIndex((p) => p.id === clean);
  if (i < 0) return { kind: 'notFound' };
  return { kind: 'project', project: projects[i], prev: projects[i - 1] ?? null, next: projects[i + 1] ?? null };
}

export function titleOf(route: Route): string {
  const site = `${profile.name} 포트폴리오`;
  if (route.kind === 'home') return site;
  if (route.kind === 'project') return `${route.project.name} · ${site}`;
  return `페이지를 찾을 수 없습니다 · ${site}`;
}

export function descriptionOf(route: Route): string {
  if (route.kind === 'project') return route.project.summary;
  return [profile.headline, ...profile.intro].join(' ');
}
