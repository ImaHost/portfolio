import { config, profile } from '../data';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer-inner">
        <p>
          {profile.name}
          {config.email && (
            <>
              {' · '}
              <a href={`mailto:${config.email}`}>{config.email}</a>
            </>
          )}
        </p>
        <p className="site-footer-source">
          이 사이트는{' '}
          <a href={config.repoUrl} target="_blank" rel="noopener noreferrer">
            GitHub 저장소
          </a>
          의 README로 만들어집니다.
        </p>
      </div>
    </footer>
  );
}
