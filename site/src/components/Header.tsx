import { href, profile } from '../data';

export function Header() {
  return (
    <header className="site-header">
      <div className="wrap site-header-inner">
        <a className="brand" href={href()}>
          {profile.name}
          <span className="brand-sub">포트폴리오</span>
        </a>
        <nav className="site-nav" aria-label="주 메뉴">
          <a href={href('#projects')}>프로젝트</a>
          <a href={href('#skills')}>기술</a>
          {profile.demo && <a href={profile.demo.href}>시연</a>}
        </nav>
      </div>
    </header>
  );
}
