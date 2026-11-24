import { config, href, profile, projects } from '../data';
import type { Project } from '../types';
import { Chips } from '../components/Chips';
import { Markdown } from '../components/Markdown';

export function Home() {
  return (
    <>
      <section className="hero wrap" aria-labelledby="hero-title">
        <p className="eyebrow">{profile.name}</p>
        <h1 id="hero-title" className="hero-title">
          {profile.headline}
        </h1>
        {profile.intro.map((line) => (
          <p key={line} className="hero-text">
            {line}
          </p>
        ))}
        <div className="hero-actions">
          <a className="btn btn-primary" href="#projects">
            프로젝트 보기
          </a>
          {profile.demo && (
            <a className="btn" href={profile.demo.href}>
              <PlayIcon />
              시연 보기
            </a>
          )}
          {config.pdf && (
            <a className="btn" href={href(config.pdf)} download>
              PDF 내려받기
            </a>
          )}
        </div>
        {config.email && (
          <p className="hero-contact">
            <span className="hero-contact-label">연락처</span>
            <a href={`mailto:${config.email}`}>{config.email}</a>
          </p>
        )}
      </section>

      {profile.demo && (
        <section className="wrap section-tight" aria-label="프로젝트 시연">
          <a className="demo-band" href={profile.demo.href}>
            <span className="demo-band-icon" aria-hidden="true">
              <PlayIcon />
            </span>
            <span className="demo-band-body">
              <span className="demo-band-title">{profile.demo.label}</span>
              {profile.demo.note && <span className="demo-band-text">{profile.demo.note}</span>}
            </span>
            <span className="demo-band-arrow" aria-hidden="true">
              →
            </span>
          </a>
        </section>
      )}

      <section id="projects" className="wrap section" aria-labelledby="projects-title">
        <h2 id="projects-title" className="section-title">
          프로젝트 <span className="section-count">{projects.length}</span>
        </h2>
        <ol className="works">
          {projects.map((p) => (
            <li key={p.id}>
              <ProjectCard project={p} />
            </li>
          ))}
        </ol>
      </section>

      <section id="skills" className="wrap section" aria-labelledby="skills-title">
        <h2 id="skills-title" className="section-title">
          쓰는 기술
        </h2>
        <dl className="skills">
          {profile.skills.map((g) => (
            <div key={g.label} className="skill-row">
              <dt>{g.label}</dt>
              <dd>
                <Chips items={g.items} />
                {g.note && <p className="skill-note">{g.note}</p>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="wrap section" aria-label="안내">
        <div className="note">
          <Markdown tree={profile.note} />
        </div>
      </section>
    </>
  );
}

function ProjectCard({ project: p }: { project: Project }) {
  return (
    <a className={`work${p.cover ? '' : ' work-no-cover'}`} href={href(`${p.id}/`)}>
      <div className="work-body">
        <p className="work-meta">
          <span>{p.period}</span>
          <span>{p.role}</span>
        </p>
        <h3 className="work-title">{p.name}</h3>
        <p className="work-summary">{p.summary}</p>
        <Chips items={p.stack} label="스택" />
        {p.demo.length > 0 && (
          <p className="work-badge">
            <PlayIcon />
            시연 있음
          </p>
        )}
      </div>
      {p.cover && (
        <div className="work-cover">
          <img src={p.cover.src} alt="" width={p.cover.width ?? undefined} height={p.cover.height ?? undefined} loading="lazy" decoding="async" />
        </div>
      )}
    </a>
  );
}

export function PlayIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  );
}
