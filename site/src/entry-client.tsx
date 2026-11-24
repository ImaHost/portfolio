import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import { config } from './data';
import { resolveRoute } from './routes';
import './styles/index.css';

const path = window.location.pathname.startsWith(config.base) ? window.location.pathname.slice(config.base.length) : '404';
const app = (
  <StrictMode>
    <App route={resolveRoute(path)} />
  </StrictMode>
);
const root = document.getElementById('root')!;

// 빌드한 페이지는 미리 그린 HTML을 이어받고, 개발 서버에서는 처음부터 그린다
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
