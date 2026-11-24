import { useEffect } from 'react';
import type { Route } from './routes';
import { titleOf } from './routes';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LightboxProvider } from './components/Lightbox';
import { Home } from './pages/Home';
import { ProjectPage } from './pages/ProjectPage';
import { NotFound } from './pages/NotFound';

export function App({ route }: { route: Route }) {
  // 빌드한 페이지는 <title>이 이미 있다. 개발 서버에서만 의미가 있다
  useEffect(() => {
    document.title = titleOf(route);
  }, [route]);

  return (
    <LightboxProvider>
      <a className="skip-link" href="#main">
        본문으로 건너뛰기
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        {route.kind === 'home' && <Home />}
        {route.kind === 'project' && <ProjectPage project={route.project} prev={route.prev} next={route.next} />}
        {route.kind === 'notFound' && <NotFound />}
      </main>
      <Footer />
    </LightboxProvider>
  );
}
