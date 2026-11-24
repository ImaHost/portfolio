import { useEffect, useId, useState } from 'react';
import { useLightbox } from './Lightbox';

/**
 * mermaid 그림. 처음(미리 그린 HTML · 스크립트 꺼짐)에는 원문 코드를 보이고,
 * 브라우저에서 mermaid를 따로 불러와 그림으로 바꾼다 — 그림이 있는 페이지만 그 묶음을 받는다.
 * 본문에서는 폭에 맞춰 줄여 전체 모양을 보이고, 누르면 크게 보기 창에서 원래 크기로 읽는다.
 */
export function Mermaid({ code }: { code: string }) {
  const [svg, setSvg] = useState<{ html: string; width: number } | null>(null);
  const open = useLightbox();
  const id = `mmd-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  useEffect(() => {
    let alive = true;
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    import('mermaid')
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: dark ? 'dark' : 'neutral',
          fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
        });
        // Pretendard는 쓰인 글자의 묶음만 그때그때 받는다. 그림 글자의 글꼴을 먼저 받아야
        // mermaid가 잰 글자 폭과 실제로 그려지는 폭이 같아져 칸 안 글자가 잘리지 않는다
        await document.fonts?.load(`16px 'Pretendard Variable'`, code).catch(() => undefined);
        const out = await mermaid.render(id, code);
        if (alive) setSvg({ html: out.svg, width: naturalWidth(out.svg) });
      })
      .catch(() => {
        // 그리지 못하면 원문 코드를 그대로 둔다
      });
    return () => {
      alive = false;
    };
  }, [code, id]);

  if (!svg) {
    return (
      <pre className="diagram-source">
        <code>{code}</code>
      </pre>
    );
  }
  return (
    <figure className="diagram">
      <button
        type="button"
        className="diagram-zoom"
        aria-label="구조 그림 크게 보기"
        onClick={() => open({ kind: 'svg', html: svg.html, width: svg.width, caption: '' })}
      >
        <span className="diagram-svg" dangerouslySetInnerHTML={{ __html: svg.html }} />
      </button>
      <figcaption className="diagram-hint">그림을 누르면 원래 크기로 볼 수 있습니다</figcaption>
    </figure>
  );
}

/** mermaid가 적어 둔 원래 폭(viewBox 또는 max-width) */
function naturalWidth(svg: string): number {
  const viewBox = svg.match(/viewBox="[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+[\d.]+"/);
  const maxWidth = svg.match(/max-width:\s*([\d.]+)px/);
  return Math.ceil(Number(viewBox?.[1] ?? maxWidth?.[1] ?? 1200));
}
