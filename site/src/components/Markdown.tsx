import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { toJsxRuntime, type Components, type Jsx } from 'hast-util-to-jsx-runtime';
import { toString } from 'hast-util-to-string';
import type { Element, ElementContent, Root } from 'hast';
import { Mermaid } from './Mermaid';
import { useLightbox } from './Lightbox';

/** README에서 변환한 트리(plugins/content.ts)를 React로 그린다 */
export function Markdown({ tree }: { tree: Root }) {
  return toJsxRuntime(tree, {
    Fragment,
    jsx: jsx as Jsx,
    jsxs: jsxs as Jsx,
    components,
    passNode: true,
  });
}

function inline(children: ElementContent[]) {
  return <Markdown tree={{ type: 'root', children }} />;
}

const components: Partial<Components> = {
  figure({ node, ...props }) {
    if (node && hasClass(node, 'shot')) return <Shot node={node} />;
    return <figure {...props} />;
  },
  pre({ node, ...props }) {
    const code = node?.children.find((c): c is Element => c.type === 'element' && c.tagName === 'code');
    if (code && hasClass(code, 'language-mermaid')) return <Mermaid code={toString(code).trim()} />;
    return <pre {...props} />;
  },
  table({ node: _node, ...props }) {
    return (
      <div className="table-wrap">
        <table {...props} />
      </div>
    );
  },
};

/** 캡처 하나 — 누르면 크게 보기 */
function Shot({ node }: { node: Element }) {
  const open = useLightbox();
  const img = node.children.find((c): c is Element => c.type === 'element' && c.tagName === 'img');
  const caption = node.children.find((c): c is Element => c.type === 'element' && c.tagName === 'figcaption');
  if (!img) return null;
  const p = img.properties;
  const src = String(p.src);
  const alt = String(p.alt ?? '');
  const captionText = caption ? toString(caption).trim() : '';

  return (
    <figure className="shot">
      <button
        type="button"
        className="shot-zoom"
        aria-label={`크게 보기${captionText ? `: ${captionText}` : ''}`}
        onClick={() => open({ kind: 'image', src, alt, caption: captionText })}
      >
        <img
          src={src}
          alt={alt || captionText}
          width={p.width as number | undefined}
          height={p.height as number | undefined}
          loading="lazy"
          decoding="async"
        />
      </button>
      {caption && <figcaption>{inline(caption.children)}</figcaption>}
    </figure>
  );
}

function hasClass(el: Element, name: string): boolean {
  const c = el.properties.className;
  return Array.isArray(c) && c.includes(name);
}
