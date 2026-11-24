import data from 'virtual:site-data';

export const { config, profile, projects } = data;

/** 사이트 안 주소 — base를 붙인다 */
export function href(path = ''): string {
  return config.base + path.replace(/^\//, '');
}
