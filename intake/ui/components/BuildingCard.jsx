import { useState, useEffect, useMemo, Suspense, lazy } from "react";
import DraggableCard from "./DraggableCard";
import ShareJourneyModal from "./ShareJourneyModal";
import { getPublicSiteUrl } from "../utils";
import { OPENING_MESSAGE } from "../constants";

const LaunchSequencePlayer = lazy(() => import("../remotion/LaunchSequence"));

function deriveQualityBot(siteScore) {
  if (!siteScore) return null;
  if (siteScore.quality_bot) return siteScore.quality_bot;
  const dimensions = siteScore.dimensions || {};
  const issues = siteScore.issues || {};
  const issueCount = Object.values(issues).reduce((total, items) => total + (Array.isArray(items) ? items.length : 0), 0);
  const weakDimensions = Object.entries(dimensions).filter(([, value]) => Number(value) < 900).map(([name]) => name);
  const rawScore = Number(siteScore.score || 0);
  const almostPerfect = rawScore >= 9900 && issueCount === 0 && weakDimensions.length === 0;
  let score = Math.max(0, rawScore - 5000 - issueCount * 300 - weakDimensions.length * 450);
  if (almostPerfect) score = Math.min(10000, score + 5000);
  score = Math.max(0, Math.min(10000, score));
  const verdict = score >= 9000
    ? "Impecável"
    : score >= 7000
      ? "Muito forte"
      : score >= 5000
        ? "Bom, mas ainda comum"
        : score >= 3000
          ? "Normal"
          : "Fraco";
  return { agent: "Agente 03 - avaliador de qualidade", score, max_score: 10000, verdict, weak_dimensions: weakDimensions };
}

export default function BuildingCard({ buildState, onReset, positions, onPositionChange, session }) {
  const [launched, setLaunched] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const publicSiteUrl = getPublicSiteUrl(buildState);
  const qualityBot = deriveQualityBot(buildState.usage?.site_score);
  const shareMessages = useMemo(() => {
    const transcript = session?.transcript?.length
      ? session.transcript
      : [{ role: "assistant", content: OPENING_MESSAGE }];
    return transcript.slice(-6);
  }, [session]);

  useEffect(() => {
    if (buildState.status !== "done" || !buildState.site_url || launched) return undefined;
    const timer = window.setTimeout(() => setLaunched(true), 2100);
    return () => window.clearTimeout(timer);
  }, [buildState.site_url, buildState.status, launched]);

  if (buildState.status === "done" && buildState.site_url) {
    if (!launched) {
      return (
        <DraggableCard
          aria-live="polite"
          className="build-card build-card-launching"
          defaultPosition={{ x: 860, y: 80 }}
          layoutId="build"
          onPositionChange={onPositionChange}
          positions={positions}
        >
          <Suspense fallback={<div className="motion-fallback motion-fallback-launch">_</div>}>
            <LaunchSequencePlayer onEnded={() => setLaunched(true)} />
          </Suspense>
        </DraggableCard>
      );
    }

    return (
      <>
        <DraggableCard
          aria-live="polite"
          className="build-card build-card-done"
          defaultPosition={{ x: 860, y: 80 }}
          layoutId="build"
          onPositionChange={onPositionChange}
          positions={positions}
        >
          <span className="build-card-eyebrow">terminal success</span>
          <h3>Pronto!</h3>
          <p>Seu site está no ar.</p>
          {qualityBot ? (
            <div className="quality-bot-card" aria-label={`Nota do avaliador: ${qualityBot.score} de ${qualityBot.max_score}`}>
              <span>Agente 03 · avaliador</span>
              <strong>{qualityBot.score.toLocaleString("pt-BR")}/{qualityBot.max_score.toLocaleString("pt-BR")}</strong>
              <em>{qualityBot.verdict}</em>
              {qualityBot.weak_dimensions?.length ? (
                <small>pontos fracos: {qualityBot.weak_dimensions.join(", ")}</small>
              ) : (
                <small>sem pontos fracos técnicos detectados</small>
              )}
            </div>
          ) : null}
          <div className="build-actions">
            <a className="build-cta" href={publicSiteUrl} target="_blank" rel="noreferrer">
              Abrir preview local
            </a>
            <a className="build-cta build-cta-secondary" href={buildState.site_url} target="_blank" rel="noreferrer">
              Abrir no app
            </a>
            <button className="build-cta build-cta-secondary" onClick={() => setIsShareOpen(true)} type="button">
              Compartilhar jornada
            </button>
          </div>
          <div className="site-url-chip">{publicSiteUrl}</div>
          <small>job {buildState.job_id}</small>
          <button className="build-reset" onClick={onReset} type="button">
            começar de novo
          </button>
        </DraggableCard>
        {isShareOpen ? (
          <ShareJourneyModal
            messages={shareMessages}
            onClose={() => setIsShareOpen(false)}
            siteUrl={publicSiteUrl}
          />
        ) : null}
      </>
    );
  }

  if (buildState.status === "error") {
    return (
      <DraggableCard
        aria-live="polite"
        className="build-card build-card-error"
        defaultPosition={{ x: 450, y: 260 }}
        layoutId="build"
        onPositionChange={onPositionChange}
        positions={positions}
      >
        <span className="build-card-eyebrow">Agente 02</span>
        <h3>Algo deu errado</h3>
        <p>{buildState.error || "Falha ao construir o site."}</p>
        <button className="build-cta" onClick={onReset} type="button">
          tentar de novo
        </button>
      </DraggableCard>
    );
  }

  return (
    <DraggableCard
      aria-live="polite"
      className="build-card build-card-running"
      defaultPosition={{ x: 450, y: 260 }}
      layoutId="build"
      onPositionChange={onPositionChange}
      positions={positions}
    >
      <span className="build-card-eyebrow">Agente 02</span>
      <h3>Construindo seu site...</h3>
      <p>{buildState.message || "Vou te avisar quando estiver pronto."}</p>
      <small>job {buildState.job_id}</small>
    </DraggableCard>
  );
}
