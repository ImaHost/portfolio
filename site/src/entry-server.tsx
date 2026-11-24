import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import data from 'virtual:site-data';
import { App } from './App';
import { descriptionOf, pages, resolveRoute, titleOf, type Route } from './routes';

export { pages };
export const assets = data.assets;

export function render(path: string): { html: string; head: string } {
  const route = resolveRoute(path);
  const html = renderToString(
    <StrictMode>
      <App route={route} />
    </StrictMode>,
  );
  return { html, head: head(route, path) };
}

function head(route: Route, path: string): string {
  const { config } = data;
  const title = titleOf(route);
  const description = descriptionOf(route);
  const url = config.origin + config.base + (route.kind === 'notFound' ? '' : path);
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    config.indexable ? '' : '<meta name="robots" content="noindex, nofollow" />',
    route.kind === 'notFound' ? '' : `<link rel="canonical" href="${esc(url)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:locale" content="ko_KR" />',
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
  ];
  return tags.filter(Boolean).join('\n    ');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
