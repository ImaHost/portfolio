import { href } from '../data';
import type { Project } from '../types';
import { Chips } from '../components/Chips';
import { Markdown } from '../components/Markdown';
import { Toc } from '../components/Toc';
import { PlayIcon } from './Home';

export function ProjectPage({ project: p, prev, next }: { project: Project; prev: Project | null; next: Project | null }) {
  return (
    <div className="wrap project">
      <nav className="crumbs" aria-label="위치">
        <a href={href('#projects')}>← 프로젝트 목록</a>
      </nav>

      <header className="project-head">
        <h1 className="project-title">{p.title}</h1>
        <dl className="meta">
          {p.meta.map((row) => (
            <div key={row.label} className="meta-row">
              <dt>{row.label}</dt>
              <dd>{row.label === '스택' ? <Chips items={p.stack} /> : <Markdown tree={row.value} />}</dd>
            </div>
          ))}
        </dl>
        {p.demo.length > 0 && (
          <div className="demo-cta">
            <div className="demo-cta-links">
              {p.demo.map((d, i) => (
                <a key={d.href} className={`btn${i === 0 ? ' btn-primary' : ''}`} href={d.href}>
                  <PlayIcon />
                  {d.label}
                </a>
              ))}
            </div>
            {p.demoNote && <p className="demo-cta-note">{p.demoNote}</p>}
          </div>
        )}
      </header>

      <div className={`project-layout${p.toc.length > 2 ? ' has-toc' : ''}`}>
        <article className="prose">
          <Markdown tree={p.body} />
        </article>
        {p.toc.length > 2 && (
          <aside className="project-aside">
            <Toc items={p.toc} />
          </aside>
        )}
      </div>

      <nav className="pager" aria-label="다른 프로젝트">
        {prev ? (
          <a className="pager-link" href={href(`${prev.id}/`)}>
            <span className="pager-dir">← 이전</span>
            <span className="pager-name">{prev.name}</span>
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a className="pager-link pager-next" href={href(`${next.id}/`)}>
            <span className="pager-dir">다음 →</span>
            <span className="pager-name">{next.name}</span>
          </a>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
