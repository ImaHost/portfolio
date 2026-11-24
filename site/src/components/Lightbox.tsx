import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/** 크게 볼 것 — 캡처 이미지, 또는 mermaid가 그린 SVG(원래 폭으로 보인다) */
export type LightboxShot =
  | { kind: 'image'; src: string; alt: string; caption: string }
  | { kind: 'svg'; html: string; width: number; caption: string };

const OpenContext = createContext<(shot: LightboxShot) => void>(() => {});

export function useLightbox() {
  return useContext(OpenContext);
}

/** 캡처 크게 보기 — 페이지에 하나만 두는 모달 <dialog>. ESC · 바깥 누르기 · [닫기]로 닫는다 */
export function LightboxProvider({ children }: { children: ReactNode }) {
  const [shot, setShot] = useState<LightboxShot | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useCallback(() => setShot(null), []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (shot && !el.open) el.showModal();
    if (!shot && el.open) el.close();
  }, [shot]);

  return (
    <OpenContext.Provider value={setShot}>
      {children}
      <dialog
        ref={dialog}
        className="lightbox"
        aria-label={label(shot)}
        onClose={close}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        {shot && (
          <>
            <button type="button" className="lightbox-close" onClick={close} autoFocus>
              닫기
            </button>
            <figure className="lightbox-figure" onClick={(e) => e.target === e.currentTarget && close()}>
              {shot.kind === 'image' ? (
                <img src={shot.src} alt={shot.alt} />
              ) : (
                <div
                  className="lightbox-svg"
                  style={{ '--svg-w': `${shot.width}px` } as CSSProperties}
                  dangerouslySetInnerHTML={{ __html: shot.html }}
                />
              )}
              {shot.caption && <figcaption>{shot.caption}</figcaption>}
            </figure>
          </>
        )}
      </dialog>
    </OpenContext.Provider>
  );
}

function label(shot: LightboxShot | null): string {
  if (!shot) return '크게 보기';
  if (shot.kind === 'svg') return '구조 그림 크게 보기';
  return `캡처 크게 보기: ${shot.caption || shot.alt || '화면'}`;
}
