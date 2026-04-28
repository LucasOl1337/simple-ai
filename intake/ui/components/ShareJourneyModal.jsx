import { useState, Suspense, lazy } from "react";

const JourneyShareClipPlayer = lazy(() => import("../remotion/JourneyShareClip"));

export default function ShareJourneyModal({ messages, onClose, siteUrl }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="share-modal-backdrop" role="presentation">
      <section className="share-modal" aria-label="Preview do clip social">
        <div className="share-modal-head">
          <div>
            <span>social render</span>
            <h3>Jornada Simple-AI</h3>
          </div>
          <button aria-label="Fechar" className="icon-button" onClick={onClose} type="button">
            x
          </button>
        </div>
        <Suspense fallback={<div className="motion-fallback">loading motion...</div>}>
          <JourneyShareClipPlayer messages={messages} siteUrl={siteUrl} />
        </Suspense>
        <div className="share-modal-actions">
          <button className="build-cta build-cta-secondary" onClick={handleCopy} type="button">
            {copied ? "Link copiado" : "Copiar link"}
          </button>
          <a className="build-cta" href={siteUrl} target="_blank" rel="noreferrer">
            Abrir site
          </a>
        </div>
      </section>
    </div>
  );
}
