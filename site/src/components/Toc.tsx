import { useEffect, useState } from 'react';
import type { TocItem } from '../types';

/** 넓은 화면의 목차 — 지금 읽는 절을 표시한다 */
export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const headings = items.map((t) => document.getElementById(t.id)).filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        // 화면 위쪽에 걸린 제목 중 첫 번째, 없으면 이미 지나간 마지막 제목
        const firstVisible = headings.find((h) => visible.has(h.id));
        const passed = headings.filter((h) => h.getBoundingClientRect().top < 120).pop();
        setActive((firstVisible ?? passed)?.id ?? null);
      },
      { rootMargin: '-80px 0px -55% 0px' },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="toc" aria-label="목차">
      <p className="toc-title">목차</p>
      <ol>
        {items.map((t) => (
          <li key={t.id}>
            <a href={`#${t.id}`} aria-current={active === t.id ? 'location' : undefined}>
              {t.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
